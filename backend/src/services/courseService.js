// backend/src/services/courseService.js

import { courseModel } from '~/models/courseModel'
import { userModel } from '~/models/userModel'
import { workerProfileModel } from '~/models/workerProfileModel'
import { enrollmentModel } from '~/models/enrollmentModel'
import { categoryModel } from '~/models/categoryModel'
import { CloudinaryProvider } from '~/providers/CloudinaryProvider'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { DEFAULT_PAGE, DEFAULT_ITEM_PER_PAGE, COURSE_STATUS } from '~/utils/constants'

// ============ CREATE ============
const createCourse = async (userId, data, reqFile = null) => {
  try {
    // Verify user is Training Center
    const user = await userModel.findOneById(userId)
    if (!user || user.role !== 'trainer') {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Chỉ Trung tâm đào tạo mới được tạo khóa học!')
    }

    // Verify category exists
    const category = await categoryModel.findOneById(data.categoryId)
    if (!category) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Danh mục không tồn tại!')
    }

    const courseData = {
      ...data,
      providerId: userId,
      status: COURSE_STATUS.DRAFT
    }

    // Upload thumbnail to Cloudinary if provided
    if (reqFile) {
      const uploadResult = await CloudinaryProvider.streamUpload(reqFile.buffer, 'course-thumbnails')
      courseData.thumbnail = uploadResult.secure_url
    }

    const result = await courseModel.createNew(courseData)
    return await courseModel.findOneById(result.insertedId)
  } catch (error) { throw error }
}

// ============ READ ============
const getCourseById = async (courseId, incrementView = false) => {
  try {
    const course = await courseModel.findOneById(courseId)
    if (!course) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Khóa học không tồn tại!')
    }

    // Increment view count
    if (incrementView) {
      await courseModel.incrementViewCount(courseId)
    }

    return course
  } catch (error) { throw error }
}

const getCourseWithDetails = async (courseId, userId = null) => {
  try {
    const course = await courseModel.findOneById(courseId)
    if (!course) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Khóa học không tồn tại!')
    }

    // Get provider info
    const provider = await userModel.findOneById(course.providerId)

    // Get enrollment status if user logged in
    let enrollment = null
    let eligibility = null

    if (userId) {
      enrollment = await enrollmentModel.findOneByUserAndCourse(userId, courseId)
      eligibility = await checkEligibility(userId, courseId)
    }

    // Get course stats
    const stats = await courseModel.getCourseStats(courseId)

    return {
      ...course,
      provider: provider ? {
        _id: provider._id,
        displayName: provider.displayName,
        avatar: provider.avatar,
        email: provider.email
      } : null,
      enrollment,
      eligibility,
      stats: stats ? {
        enrollmentByStatus: stats.enrollmentStats,
        reviewStats: stats.reviewStats[0] || { avgRating: 0, totalReviews: 0 }
      } : null
    }
  } catch (error) { throw error }
}

const getCourses = async (queryParams) => {
  try {
    const {
      page = DEFAULT_PAGE,
      limit = DEFAULT_ITEM_PER_PAGE,
      search = '',
      category,
      provider,
      level,
      minFee,
      maxFee,
      isFree,
      hasScholarship,
      skill,
      delivery_type,
      funding_model,
      sortBy = 'createdAt',
      order = 'desc'
    } = queryParams

    const currentPage = parseInt(page, 10) || DEFAULT_PAGE
    const recordLimit = parseInt(limit, 10) || DEFAULT_ITEM_PER_PAGE
    const skip = (currentPage - 1) * recordLimit

    // Build sort object
    const sortOptions = {}
    sortOptions[sortBy] = order === 'asc' ? 1 : -1

    // Build filters
    const filters = {}
    if (category) filters.category = category
    if (provider) filters.provider = provider
    if (level) filters.level = level
    if (isFree !== undefined) filters.isFree = isFree
    if (hasScholarship) filters.hasScholarship = hasScholarship
    if (skill) filters.skill = skill
    if (delivery_type) filters.delivery_type = delivery_type
    if (funding_model) filters.funding_model = funding_model
    if (minFee !== undefined || maxFee !== undefined) {
      filters.minFee = minFee
      filters.maxFee = maxFee
    }

    const { courses, totalCourses } = await courseModel.searchCourses(
      search,
      filters,
      skip,
      recordLimit,
      sortOptions
    )

    // Enrich with provider info
    const enrichedCourses = await Promise.all(
      courses.map(async (course) => {
        const providerInfo = await userModel.findOneById(course.providerId)
        return {
          ...course,
          provider: providerInfo ? {
            _id: providerInfo._id,
            displayName: providerInfo.displayName,
            avatar: providerInfo.avatar,
            verified: providerInfo.verified
          } : null
        }
      })
    )

    return {
      courses: enrichedCourses,
      pagination: {
        totalRecords: totalCourses,
        totalPages: Math.ceil(totalCourses / recordLimit),
        currentPage,
        limit: recordLimit
      }
    }
  } catch (error) { throw error }
}

const getMyCourses = async (userId, queryParams) => {
  try {
    const { page = DEFAULT_PAGE, limit = DEFAULT_ITEM_PER_PAGE } = queryParams

    const currentPage = parseInt(page, 10) || DEFAULT_PAGE
    const recordLimit = parseInt(limit, 10) || DEFAULT_ITEM_PER_PAGE
    const skip = (currentPage - 1) * recordLimit

    const { courses, totalCourses } = await courseModel.findByProvider(userId, skip, recordLimit)

    return {
      courses,
      pagination: {
        totalRecords: totalCourses,
        totalPages: Math.ceil(totalCourses / recordLimit),
        currentPage,
        limit: recordLimit
      }
    }
  } catch (error) { throw error }
}

const getRecommendedCourses = async (userId, queryParams) => {
  try {
    const { page = DEFAULT_PAGE, limit = DEFAULT_ITEM_PER_PAGE } = queryParams

    // Get worker profile
    const profile = await workerProfileModel.findOneByUserId(userId)
    if (!profile) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Vui lòng hoàn thành hồ sơ trước!')
    }

    // Extract skills from profile
    const currentSkills = profile.employmentHistory?.flatMap(e => e.skills || []) || []
    const targetSkills = profile.aspirations?.skills || []

    // Find courses matching skills
    const allTargetSkills = [...new Set([...currentSkills, ...targetSkills])]
    const recommendedCourses = await courseModel.findBySkills(allTargetSkills, 20)

    // Filter by eligibility
    const eligibleCourses = []
    for (const course of recommendedCourses) {
      const eligibility = await checkEligibility(userId, course._id.toString())
      eligibleCourses.push({
        ...course,
        eligibility,
        matchScore: calculateMatchScore(allTargetSkills, course.skills)
      })
    }

    // Sort by match score
    eligibleCourses.sort((a, b) => b.matchScore - a.matchScore)

    // Paginate
    const currentPage = parseInt(page, 10) || DEFAULT_PAGE
    const recordLimit = parseInt(limit, 10) || DEFAULT_ITEM_PER_PAGE
    const startIndex = (currentPage - 1) * recordLimit
    const paginatedCourses = eligibleCourses.slice(startIndex, startIndex + recordLimit)

    return {
      courses: paginatedCourses,
      pagination: {
        totalRecords: eligibleCourses.length,
        totalPages: Math.ceil(eligibleCourses.length / recordLimit),
        currentPage,
        limit: recordLimit
      }
    }
  } catch (error) { throw error }
}

const getPopularCourses = async (limit = 10) => {
  try {
    return await courseModel.findPopular(limit)
  } catch (error) { throw error }
}

const getNewCourses = async (limit = 10) => {
  try {
    return await courseModel.findNew(limit)
  } catch (error) { throw error }
}

const getRelatedCourses = async (courseId, limit = 5) => {
  try {
    return await courseModel.findRelated(courseId, limit)
  } catch (error) { throw error }
}

const getCoursesByCategory = async (categoryId, queryParams) => {
  try {
    const {
      page = DEFAULT_PAGE,
      limit = DEFAULT_ITEM_PER_PAGE,
      level,
      minFee,
      maxFee,
      delivery_type,
      funding_model
    } = queryParams

    const currentPage = parseInt(page, 10) || DEFAULT_PAGE
    const recordLimit = parseInt(limit, 10) || DEFAULT_ITEM_PER_PAGE
    const skip = (currentPage - 1) * recordLimit

    const filters = {}
    if (level) filters.level = level
    if (minFee !== undefined) filters.minFee = minFee
    if (maxFee !== undefined) filters.maxFee = maxFee
    if (delivery_type) filters.delivery_type = delivery_type
    if (funding_model) filters.funding_model = funding_model

    const { courses, totalCourses } = await courseModel.findByCategory(
      categoryId,
      skip,
      recordLimit,
      filters
    )

    return {
      courses,
      pagination: {
        totalRecords: totalCourses,
        totalPages: Math.ceil(totalCourses / recordLimit),
        currentPage,
        limit: recordLimit
      }
    }
  } catch (error) { throw error }
}

// ============ UPDATE ============
const updateCourse = async (courseId, userId, data, reqFile = null) => {
  try {
    const course = await courseModel.findOneById(courseId)
    if (!course) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Khóa học không tồn tại!')
    }

    // Check ownership
    if (course.providerId.toString() !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền sửa khóa học này!')
    }

    // Cannot edit if already approved and has enrollments
    if (course.status === COURSE_STATUS.APPROVED && course.enrollmentCount > 0) {
      // Only allow status change to archived
      if (Object.keys(data).some(key => !['status'].includes(key))) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Khóa học đã được duyệt và có học viên. Chỉ có thể chuyển sang trạng thái lưu trữ!'
        )
      }
    }

    // Upload thumbnail to Cloudinary if provided
    if (reqFile) {
      const uploadResult = await CloudinaryProvider.streamUpload(reqFile.buffer, 'course-thumbnails')
      data.thumbnail = uploadResult.secure_url
    }

    const updatedCourse = await courseModel.update(courseId, data)
    return updatedCourse
  } catch (error) { throw error }
}

const submitForApproval = async (courseId, userId) => {
  try {
    const course = await courseModel.findOneById(courseId)
    if (!course) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Khóa học không tồn tại!')
    }

    if (course.providerId.toString() !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền thực hiện thao tác này!')
    }

    if (course.status !== COURSE_STATUS.DRAFT && course.status !== COURSE_STATUS.REJECTED) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Chỉ khóa học ở trạng thái nháp hoặc bị từ chối mới có thể gửi duyệt!')
    }

    const updatedCourse = await courseModel.updateStatus(
      courseId,
      COURSE_STATUS.PENDING
    )

    return updatedCourse
  } catch (error) { throw error }
}

const approveCourse = async (courseId, adminId, status = 'approved', rejectionReason = null) => {
  try {
    const course = await courseModel.findOneById(courseId)
    if (!course) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Khóa học không tồn tại!')
    }

    if (course.status !== COURSE_STATUS.PENDING) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Chỉ khóa học đang chờ duyệt mới có thể duyệt!')
    }

    const finalStatus = status === 'rejected' ? COURSE_STATUS.REJECTED : COURSE_STATUS.APPROVED
    const updatedCourse = await courseModel.updateStatus(courseId, finalStatus, adminId, rejectionReason)

    return updatedCourse
  } catch (error) { throw error }
}

const getPendingCourses = async (queryParams) => {
  try {
    const { page = DEFAULT_PAGE, limit = DEFAULT_ITEM_PER_PAGE } = queryParams

    const currentPage = parseInt(page, 10) || DEFAULT_PAGE
    const recordLimit = parseInt(limit, 10) || DEFAULT_ITEM_PER_PAGE
    const skip = (currentPage - 1) * recordLimit

    const { courses, totalCourses } = await courseModel.getPendingCourses(skip, recordLimit)

    // Enrich with provider info
    const enrichedCourses = await Promise.all(
      courses.map(async (course) => {
        const providerInfo = await userModel.findOneById(course.providerId)
        return {
          ...course,
          provider: providerInfo ? {
            _id: providerInfo._id,
            displayName: providerInfo.displayName,
            email: providerInfo.email,
            avatar: providerInfo.avatar
          } : null
        }
      })
    )

    return {
      courses: enrichedCourses,
      pagination: {
        totalRecords: totalCourses,
        totalPages: Math.ceil(totalCourses / recordLimit),
        currentPage,
        limit: recordLimit
      }
    }
  } catch (error) { throw error }
}

const getAdminCourseStats = async () => {
  try {
    const stats = await courseModel.getAdminCourseStats()
    return stats
  } catch (error) { throw error }
}

const getAdminCourses = async (queryParams) => {
  try {
    const {
      page = DEFAULT_PAGE,
      limit = DEFAULT_ITEM_PER_PAGE,
      search = '',
      status,
      category,
      level,
      location,
      isFree,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = queryParams

    const currentPage = parseInt(page, 10) || DEFAULT_PAGE
    const recordLimit = parseInt(limit, 10) || DEFAULT_ITEM_PER_PAGE
    const skip = (currentPage - 1) * recordLimit

    // Build filters
    const filters = {}
    if (status) filters.status = status
    if (category) filters.category = category
    if (level) filters.level = level
    if (location) filters.location = location
    if (isFree !== undefined) filters.isFree = isFree

    // Build sort options
    const sortOptions = {}
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1

    const { courses, totalCourses } = await courseModel.getAdminCourses(
      search,
      filters,
      skip,
      recordLimit,
      sortOptions
    )

    // Enrich with provider info
    const enrichedCourses = await Promise.all(
      courses.map(async (course) => {
        const providerInfo = await userModel.findOneById(course.providerId)
        const categoryInfo = await categoryModel.findOneById(course.categoryId)
        return {
          ...course,
          provider: providerInfo ? {
            _id: providerInfo._id,
            displayName: providerInfo.displayName,
            email: providerInfo.email,
            avatar: providerInfo.avatar
          } : null,
          category: categoryInfo ? {
            _id: categoryInfo._id,
            name: categoryInfo.name
          } : null
        }
      })
    )

    return {
      courses: enrichedCourses,
      pagination: {
        totalRecords: totalCourses,
        totalPages: Math.ceil(totalCourses / recordLimit),
        currentPage,
        limit: recordLimit
      }
    }
  } catch (error) { throw error }
}

// ============ DELETE ============
const deleteCourse = async (courseId, userId, isAdmin = false) => {
  try {
    const course = await courseModel.findOneById(courseId)
    if (!course) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Khóa học không tồn tại!')
    }

    // Check ownership (or admin)
    if (!isAdmin && course.providerId.toString() !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền xóa khóa học này!')
    }

    // Cannot delete if has active enrollments
    if (course.currentStudents > 0) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Không thể xóa khóa học đang có học viên! Vui lòng chuyển sang trạng thái lưu trữ.'
      )
    }

    await courseModel.deleteCourse(courseId)
    return { message: 'Xóa khóa học thành công!' }
  } catch (error) { throw error }
}

// ============ HELPER FUNCTIONS ============
const checkEligibility = async (userId, courseId) => {
  try {
    const profile = await workerProfileModel.findOneByUserId(userId)
    const course = await courseModel.findOneById(courseId)

    if (!profile || !course) {
      return { eligible: false, reason: 'Không tìm thấy thông tin' }
    }

    // 1. Check age (35-65)
    const age = profile.basicInfo?.age
    if (age < 35 || age > 65) {
      return {
        eligible: false,
        reason: 'Độ tuổi không phù hợp với khóa học này'
      }
    }

    // 2. Check prerequisites
    if (course.prerequisites && course.prerequisites.length > 0) {
      const completedEnrollments = await enrollmentModel.findCompletedByUser(userId)
      const completedTitles = completedEnrollments.map(e =>
        e.courseId?.title?.toLowerCase() || ''
      )

      const missingPrereqs = course.prerequisites.filter(prereq =>
        !completedTitles.some(title => title.includes(prereq.toLowerCase()))
      )

      if (missingPrereqs.length > 0) {
        return {
          eligible: true,
          prerequisiteWarnings: missingPrereqs,
          reason: 'Chưa hoàn thành khóa tiên quyết. Bạn vẫn có thể đăng ký nhưng nên hoàn thành trước.'
        }
      }
    }

    // 3. Check location barrier
    if (profile.barriers?.location && course.location?.type === 'offline') {
      return {
        eligible: true,
        warning: 'Bạn có rào cản về địa điểm. Khóa học này học trực tiếp.',
        suggestion: 'Gợi ý khóa học online tương đương'
      }
    }

    // 4. Check capacity
    if (course.currentStudents >= course.maxStudents) {
      return {
        eligible: true,
        waitlistAvailable: true,
        currentCapacity: `${course.currentStudents}/${course.maxStudents}`
      }
    }

    return { eligible: true }
  } catch (error) {
    return { eligible: false, reason: error.message }
  }
}

const calculateMatchScore = (userSkills, courseSkills) => {
  if (!courseSkills || courseSkills.length === 0) return 0

  const userSkillsLower = userSkills.map(s => s.toLowerCase())
  const courseSkillsLower = courseSkills.map(s => s.toLowerCase())

  let matchCount = 0
  for (const skill of courseSkillsLower) {
    if (userSkillsLower.some(s => s.includes(skill) || skill.includes(s))) {
      matchCount++
    }
  }

  return Math.round((matchCount / courseSkills.length) * 100) / 100
}

export const courseService = {
  // Create
  createCourse,

  // Read
  getCourseById,
  getCourseWithDetails,
  getCourses,
  getMyCourses,
  getRecommendedCourses,
  getPopularCourses,
  getNewCourses,
  getRelatedCourses,
  getCoursesByCategory,
  getPendingCourses,
  getAdminCourseStats,
  getAdminCourses,

  // Update
  updateCourse,
  submitForApproval,
  approveCourse,

  // Delete
  deleteCourse,

  // Helpers
  checkEligibility,
  calculateMatchScore
}