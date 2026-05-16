import { scholarshipModel } from '~/models/scholarshipModel'
import { scholarshipApplicationModel } from '~/models/scholarshipApplicationModel'
import { userModel } from '~/models/userModel'
import { courseModel } from '~/models/courseModel'
import { workerProfileModel } from '~/models/workerProfileModel'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import {
  DEFAULT_PAGE,
  DEFAULT_ITEM_PER_PAGE,
  SCHOLARSHIP_STATUS,
  APPLICATION_STATUS,
  USER_ROLES
} from '~/utils/constants'

// ============ SCHOLARSHIP CRUD ============

// Tạo scholarship mới
const createScholarship = async (ngoId, data) => {
  try {
    const user = await userModel.findOneById(ngoId)
    if (!user || user.role !== USER_ROLES.NGO) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Chỉ NGO mới được tạo học bổng!')
    }

    const scholarshipData = {
      ngoId,
      title: data.title,
      description: data.description || '',
      thumbnail: data.thumbnail || '',
      budget: data.budget,
      amountPerRecipient: data.amountPerRecipient,
      eligibilityCriteria: data.eligibilityCriteria || {
        ageMin: 35,
        ageMax: 65,
        provinces: [],
        targetSkills: [],
        education: [],
        employmentStatus: []
      },
      linkedCourses: data.linkedCourses || [],
      categories: data.categories || [],
      applicationPeriod: data.applicationPeriod || null,
      disbursementPeriod: data.disbursementPeriod || null,
      maxRecipients: data.maxRecipients,
      status: SCHOLARSHIP_STATUS.DRAFT,
      autoApprove: data.autoApprove || false,
      allowAppeals: data.allowAppeals !== false
    }

    const result = await scholarshipModel.createNew(scholarshipData)
    const scholarship = await scholarshipModel.findOneById(result.insertedId)

    return scholarship
  } catch (error) { throw error }
}

// Cập nhật scholarship
const updateScholarship = async (scholarshipId, ngoId, data) => {
  try {
    const scholarship = await scholarshipModel.findOneByIdAndNgo(scholarshipId, ngoId)
    if (!scholarship) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy học bổng!')
    }

    if (scholarship.status === SCHOLARSHIP_STATUS.ACTIVE) {
      if (data.budget !== undefined || data.maxRecipients !== undefined) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Không thể thay đổi ngân sách khi đang hoạt động!')
      }
    }

    const updateData = {}
    if (data.title) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.thumbnail !== undefined) updateData.thumbnail = data.thumbnail
    if (data.budget) updateData.budget = data.budget
    if (data.amountPerRecipient) updateData.amountPerRecipient = data.amountPerRecipient
    if (data.eligibilityCriteria) updateData.eligibilityCriteria = data.eligibilityCriteria
    if (data.linkedCourses) updateData.linkedCourses = data.linkedCourses
    if (data.categories) updateData.categories = data.categories
    if (data.applicationPeriod) updateData.applicationPeriod = data.applicationPeriod
    if (data.disbursementPeriod) updateData.disbursementPeriod = data.disbursementPeriod
    if (data.maxRecipients) updateData.maxRecipients = data.maxRecipients
    if (data.autoApprove !== undefined) updateData.autoApprove = data.autoApprove
    if (data.allowAppeals !== undefined) updateData.allowAppeals = data.allowAppeals

    const updated = await scholarshipModel.update(scholarshipId, updateData)
    return updated
  } catch (error) { throw error }
}

// Publish scholarship
const publishScholarship = async (scholarshipId, ngoId) => {
  try {
    const scholarship = await scholarshipModel.findOneByIdAndNgo(scholarshipId, ngoId)
    if (!scholarship) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy học bổng!')
    }

    if (scholarship.status !== SCHOLARSHIP_STATUS.DRAFT &&
        scholarship.status !== SCHOLARSHIP_STATUS.PAUSED) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Chỉ có thể publish từ trạng thái draft hoặc paused!')
    }

    if (scholarship.budget <= 0) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Ngân sách phải lớn hơn 0!')
    }

    const updated = await scholarshipModel.updateStatus(scholarshipId, SCHOLARSHIP_STATUS.ACTIVE)
    return updated
  } catch (error) { throw error }
}

// Pause scholarship
const pauseScholarship = async (scholarshipId, ngoId) => {
  try {
    const scholarship = await scholarshipModel.findOneByIdAndNgo(scholarshipId, ngoId)
    if (!scholarship) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy học bổng!')
    }

    if (scholarship.status !== SCHOLARSHIP_STATUS.ACTIVE) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Chỉ có thể pause khi đang hoạt động!')
    }

    const updated = await scholarshipModel.updateStatus(scholarshipId, SCHOLARSHIP_STATUS.PAUSED)
    return updated
  } catch (error) { throw error }
}

// Resume scholarship
const resumeScholarship = async (scholarshipId, ngoId) => {
  try {
    const scholarship = await scholarshipModel.findOneByIdAndNgo(scholarshipId, ngoId)
    if (!scholarship) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy học bổng!')
    }

    if (scholarship.status !== SCHOLARSHIP_STATUS.PAUSED) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Chỉ có thể resume khi đang bị pause!')
    }

    const updated = await scholarshipModel.updateStatus(scholarshipId, SCHOLARSHIP_STATUS.ACTIVE)
    return updated
  } catch (error) { throw error }
}

// Xóa scholarship
const deleteScholarship = async (scholarshipId, ngoId) => {
  try {
    const scholarship = await scholarshipModel.findOneByIdAndNgo(scholarshipId, ngoId)
    if (!scholarship) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy học bổng!')
    }

    const pendingApplications = await scholarshipApplicationModel.findPendingByScholarship(scholarshipId)
    if (pendingApplications.totalApplications > 0) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Không thể xóa khi còn đơn đang chờ duyệt!')
    }

    await scholarshipModel.deleteScholarship(scholarshipId)
    return { deleted: true }
  } catch (error) { throw error }
}

// Lấy scholarship theo ID
const getScholarshipById = async (scholarshipId) => {
  try {
    const scholarship = await scholarshipModel.findOneById(scholarshipId)
    if (!scholarship) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy học bổng!')
    }

    const ngo = await userModel.findOneById(scholarship.ngoId)
    const stats = await scholarshipApplicationModel.getStatsByScholarship(scholarshipId)

    return {
      ...scholarship,
      ngo: ngo ? {
        _id: ngo._id,
        displayName: ngo.displayName,
        avatar: ngo.avatar
      } : null,
      stats
    }
  } catch (error) { throw error }
}

// Lấy scholarships của NGO
const getScholarshipsByNgo = async (ngoId, queryParams) => {
  try {
    const {
      page = DEFAULT_PAGE,
      limit = DEFAULT_ITEM_PER_PAGE,
      status
    } = queryParams

    const currentPage = parseInt(page, 10) || DEFAULT_PAGE
    const recordLimit = parseInt(limit, 10) || DEFAULT_ITEM_PER_PAGE
    const skip = (currentPage - 1) * recordLimit

    const filters = {}
    if (status) filters.status = status

    const { scholarships, totalScholarships } = await scholarshipModel.findByNgo(
      ngoId, skip, recordLimit, filters
    )

    return {
      scholarships,
      pagination: {
        totalRecords: totalScholarships,
        totalPages: Math.ceil(totalScholarships / recordLimit),
        currentPage,
        limit: recordLimit
      }
    }
  } catch (error) { throw error }
}

// Lấy scholarships khả dụng (public)
const getAvailableScholarships = async (queryParams) => {
  try {
    const {
      page = DEFAULT_PAGE,
      limit = DEFAULT_ITEM_PER_PAGE,
      category
    } = queryParams

    const currentPage = parseInt(page, 10) || DEFAULT_PAGE
    const recordLimit = parseInt(limit, 10) || DEFAULT_ITEM_PER_PAGE
    const skip = (currentPage - 1) * recordLimit

    const filters = {}
    if (category) filters.categories = category

    const { scholarships, totalScholarships } = await scholarshipModel.findActive(
      skip, recordLimit, filters
    )

    const enrichedScholarships = await Promise.all(
      scholarships.map(async (s) => {
        const ngo = await userModel.findOneById(s.ngoId)
        return {
          ...s,
          ngo: ngo ? {
            _id: ngo._id,
            displayName: ngo.displayName,
            avatar: ngo.avatar
          } : null
        }
      })
    )

    return {
      scholarships: enrichedScholarships,
      pagination: {
        totalRecords: totalScholarships,
        totalPages: Math.ceil(totalScholarships / recordLimit),
        currentPage,
        limit: recordLimit
      }
    }
  } catch (error) { throw error }
}

// Lấy scholarships đủ điều kiện cho user
const getEligibleScholarships = async (userId, queryParams) => {
  try {
    const profile = await workerProfileModel.findOneByUserId(userId)
    if (!profile) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Vui lòng hoàn thành hồ sơ trước!')
    }

    const {
      page = DEFAULT_PAGE,
      limit = DEFAULT_ITEM_PER_PAGE
    } = queryParams

    const currentPage = parseInt(page, 10) || DEFAULT_PAGE
    const recordLimit = parseInt(limit, 10) || DEFAULT_ITEM_PER_PAGE
    const skip = (currentPage - 1) * recordLimit

    const { scholarships, totalScholarships } = await scholarshipModel.findEligibleForUser(
      profile, skip, recordLimit
    )

    const enrichedScholarships = await Promise.all(
      scholarships.map(async (s) => {
        const ngo = await userModel.findOneById(s.ngoId)
        const eligibility = scholarshipModel.validateEligibility(profile, s.eligibilityCriteria)
        return {
          ...s,
          ngo: ngo ? {
            _id: ngo._id,
            displayName: ngo.displayName,
            avatar: ngo.avatar
          } : null,
          eligibility
        }
      })
    )

    return {
      scholarships: enrichedScholarships,
      pagination: {
        totalRecords: totalScholarships,
        totalPages: Math.ceil(totalScholarships / recordLimit),
        currentPage,
        limit: recordLimit
      }
    }
  } catch (error) { throw error }
}

// Kiểm tra eligibility
const checkEligibility = async (userId, scholarshipId) => {
  try {
    const profile = await workerProfileModel.findOneByUserId(userId)
    if (!profile) {
      return { eligible: false, errors: ['Vui lòng hoàn thành hồ sơ trước!'] }
    }

    const scholarship = await scholarshipModel.findOneById(scholarshipId)
    if (!scholarship) {
      return { eligible: false, errors: ['Không tìm thấy học bổng!'] }
    }

    const eligibility = scholarshipModel.validateEligibility(profile, scholarship.eligibilityCriteria)
    const availability = await scholarshipModel.checkAvailability(scholarshipId)

    return {
      ...eligibility,
      ...availability
    }
  } catch (error) { throw error }
}

// Lấy thống kê scholarship
const getScholarshipStats = async (scholarshipId, ngoId) => {
  try {
    const scholarship = await scholarshipModel.findOneByIdAndNgo(scholarshipId, ngoId)
    if (!scholarship) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy học bổng!')
    }

    const applicationStats = await scholarshipApplicationModel.getStatsByScholarship(scholarshipId)

    return {
      ...scholarship,
      applicationStats
    }
  } catch (error) { throw error }
}

// Thêm khóa học vào scholarship
const addLinkedCourse = async (scholarshipId, ngoId, courseId, coverage, maxAmount) => {
  try {
    const scholarship = await scholarshipModel.findOneByIdAndNgo(scholarshipId, ngoId)
    if (!scholarship) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy học bổng!')
    }

    const course = await courseModel.findOneById(courseId)
    if (!course) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy khóa học!')
    }

    const existingIndex = scholarship.linkedCourses.findIndex(
      c => c.courseId.toString() === courseId
    )
    if (existingIndex >= 0) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Khóa học đã được liên kết!')
    }

    const updated = await scholarshipModel.addLinkedCourse(scholarshipId, {
      courseId,
      coverage: coverage || 'partial',
      maxAmount: maxAmount || null
    })

    return updated
  } catch (error) { throw error }
}

// Xóa khóa học khỏi scholarship
const removeLinkedCourse = async (scholarshipId, ngoId, courseId) => {
  try {
    const scholarship = await scholarshipModel.findOneByIdAndNgo(scholarshipId, ngoId)
    if (!scholarship) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy học bổng!')
    }

    const updated = await scholarshipModel.removeLinkedCourse(scholarshipId, courseId)
    return updated
  } catch (error) { throw error }
}

export const scholarshipService = {
  // CRUD
  createScholarship,
  updateScholarship,
  deleteScholarship,
  getScholarshipById,
  getScholarshipsByNgo,
  getAvailableScholarships,
  getEligibleScholarships,

  // Status
  publishScholarship,
  pauseScholarship,
  resumeScholarship,

  // Eligibility
  checkEligibility,
  getScholarshipStats,

  // Linked courses
  addLinkedCourse,
  removeLinkedCourse
}
