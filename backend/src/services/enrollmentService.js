import { enrollmentModel } from '~/models/enrollmentModel'
import { courseModel } from '~/models/courseModel'
import { userModel } from '~/models/userModel'
import { workerProfileModel } from '~/models/workerProfileModel'
import { applicationService } from './applicationService'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import {
  DEFAULT_PAGE,
  DEFAULT_ITEM_PER_PAGE,
  ENROLLMENT_STATUS,
  ENROLLMENT_PAYMENT_STATUS,
  COMPLETION_STATUS,
  COURSE_STATUS,
  USER_ROLES,
  SCHOLARSHIP_COVERAGE
} from '~/utils/constants'

// ============ ENROLL COURSE ============
const enrollCourse = async (userId, courseId, data) => {
  try {
    const { motivation, source, scheduleId, scholarshipId } = data

    const user = await userModel.findOneById(userId)
    if (!user || user.role !== USER_ROLES.WORKER) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Chỉ người lao động mới được đăng ký khóa học!')
    }

    const course = await courseModel.findOneById(courseId)
    if (!course) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Khóa học không tồn tại!')
    }

    if (course.status !== COURSE_STATUS.APPROVED) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Khóa học chưa được phê duyệt!')
    }

    const existingEnrollment = await enrollmentModel.findOneByUserAndCourse(userId, courseId)
    if (existingEnrollment) {
      if (existingEnrollment.status === ENROLLMENT_STATUS.CANCELLED ||
          existingEnrollment.status === ENROLLMENT_STATUS.DROPPED) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Bạn đã hủy đăng ký khóa học này. Vui lòng liên hệ hỗ trợ.')
      }
      throw new ApiError(StatusCodes.CONFLICT, 'Bạn đã đăng ký khóa học này rồi!')
    }

    const profile = await workerProfileModel.findOneByUserId(userId)
    if (!profile) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Vui lòng hoàn thành hồ sơ trước khi đăng ký!')
    }

    if (!profile.isCompleted) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Vui lòng hoàn thành hồ sơ trước khi đăng ký!')
    }

    const eligibility = await checkEligibility(profile, course)
    if (!eligibility.eligible) {
      throw new ApiError(StatusCodes.BAD_REQUEST, eligibility.reason)
    }

    if (eligibility.warning) {
      console.warn(`Enrollment warning for user ${userId}: ${eligibility.warning}`)
    }

    const prereqResult = await checkPrerequisites(userId, course)
    if (!prereqResult.passed) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Chưa hoàn thành khóa tiên quyết: ${prereqResult.missing.join(', ')}`
      )
    }

    const capacityResult = await checkCapacity(course)

    let finalStatus = ENROLLMENT_STATUS.ENROLLED
    let waitlistPosition = null

    if (!capacityResult.available) {
      finalStatus = ENROLLMENT_STATUS.WAITLIST
      const waitlistCount = await enrollmentModel.findByCourse(courseId, 0, 100, {
        status: ENROLLMENT_STATUS.WAITLIST
      })
      waitlistPosition = waitlistCount.totalEnrollments + 1
    }

    const enrollmentData = {
      userId: userId,
      courseId: courseId,
      scheduleId: scheduleId || null,
      status: finalStatus,
      payment_status: ENROLLMENT_PAYMENT_STATUS.PENDING,
      motivation: motivation || null,
      source: source || 'direct',
      scholarship: {
        scholarshipId: scholarshipId || null,
        applicationId: null,
        coverage: scholarshipId ? SCHOLARSHIP_COVERAGE.PARTIAL : SCHOLARSHIP_COVERAGE.NONE,
        fundedAmount: 0,
        disbursedAmount: 0,
        clawbackAmount: 0,
        disbursements: []
      },
      fee: {
        total: course.isFree ? 0 : course.fee,
        paid: 0,
        pending: course.isFree ? 0 : course.fee
      },
      waitlistPosition,
      enrolledAt: Date.now(),
      startDate: finalStatus === ENROLLMENT_STATUS.ENROLLED ? Date.now() : null
    }

    const result = await enrollmentModel.createNew(enrollmentData)

    if (finalStatus === ENROLLMENT_STATUS.ENROLLED) {
      await courseModel.incrementEnrollmentCount(courseId)
    }

    const enrollment = await enrollmentModel.findOneById(result.insertedId)

    return {
      enrollment,
      result: {
        status: finalStatus,
        waitlistPosition,
        eligibility,
        capacity: capacityResult
      }
    }
  } catch (error) { throw error }
}

// ============ GET MY ENROLLMENTS ============
const getMyEnrollments = async (userId, queryParams) => {
  try {
    const {
      page = DEFAULT_PAGE,
      limit = DEFAULT_ITEM_PER_PAGE,
      status,
      source,
      courseId
    } = queryParams

    const currentPage = parseInt(page, 10) || DEFAULT_PAGE
    const recordLimit = parseInt(limit, 10) || DEFAULT_ITEM_PER_PAGE
    const skip = (currentPage - 1) * recordLimit

    const filters = {}
    if (status) filters.status = status
    if (source) filters.source = source
    if (courseId) filters.courseId = courseId

    const { enrollments, totalEnrollments } = await enrollmentModel.findByUser(
      userId,
      skip,
      recordLimit,
      filters
    )

    const enrichedEnrollments = await Promise.all(
      enrollments.map(async (enrollment) => {
        const course = await courseModel.findOneById(enrollment.courseId)
        return {
          ...enrollment,
          course: course ? {
            _id: course._id,
            title: course.title,
            slug: course.slug,
            thumbnail: course.thumbnail,
            duration: course.duration,
            schedule: course.schedule,
            location: course.location,
            providerId: course.providerId
          } : null
        }
      })
    )

    return {
      enrollments: enrichedEnrollments,
      pagination: {
        totalRecords: totalEnrollments,
        totalPages: Math.ceil(totalEnrollments / recordLimit),
        currentPage,
        limit: recordLimit
      }
    }
  } catch (error) { throw error }
}

// ============ GET ENROLLMENTS BY COURSE ============
const getEnrollmentsByCourse = async (courseId, queryParams, trainerId = null) => {
  try {
    const course = await courseModel.findOneById(courseId)
    if (!course) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Khóa học không tồn tại!')
    }

    if (trainerId && course.providerId.toString() !== trainerId) {
      const user = await userModel.findOneById(trainerId)
      if (user.role !== USER_ROLES.ADMIN) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền xem danh sách học viên!')
      }
    }

    const {
      page = DEFAULT_PAGE,
      limit = DEFAULT_ITEM_PER_PAGE,
      status,
      source
    } = queryParams

    const currentPage = parseInt(page, 10) || DEFAULT_PAGE
    const recordLimit = parseInt(limit, 10) || DEFAULT_ITEM_PER_PAGE
    const skip = (currentPage - 1) * recordLimit

    const filters = {}
    if (status) filters.status = status
    if (source) filters.source = source

    const { enrollments, totalEnrollments } = await enrollmentModel.findByCourse(
      courseId,
      skip,
      recordLimit,
      filters
    )

    const enrichedEnrollments = await Promise.all(
      enrollments.map(async (enrollment) => {
        const userInfo = await userModel.findOneById(enrollment.userId)
        const profile = await workerProfileModel.findOneByUserId(enrollment.userId)
        return {
          ...enrollment,
          user: userInfo ? {
            _id: userInfo._id,
            displayName: userInfo.displayName,
            email: userInfo.email,
            avatar: userInfo.avatar,
            phone: userInfo.phone
          } : null,
          profile: profile ? {
            basicInfo: profile.basicInfo
          } : null
        }
      })
    )

    return {
      enrollments: enrichedEnrollments,
      pagination: {
        totalRecords: totalEnrollments,
        totalPages: Math.ceil(totalEnrollments / recordLimit),
        currentPage,
        limit: recordLimit
      }
    }
  } catch (error) { throw error }
}

// ============ GET ENROLLMENT BY ID ============
const getEnrollmentById = async (enrollmentId, userId = null, userRole = null) => {
  try {
    const enrollment = await enrollmentModel.findOneById(enrollmentId)
    if (!enrollment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Đăng ký không tồn tại!')
    }

    if (userId) {
      const course = await courseModel.findOneById(enrollment.courseId)
      const isOwner = enrollment.userId.toString() === userId
      const isTrainer = course && course.providerId.toString() === userId
      const isAdmin = userRole === USER_ROLES.ADMIN

      if (!isOwner && !isTrainer && !isAdmin) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền xem thông tin này!')
      }
    }

    const course = await courseModel.findOneById(enrollment.courseId)
    const userInfo = await userModel.findOneById(enrollment.userId)
    const profile = await workerProfileModel.findOneByUserId(enrollment.userId)

    return {
      ...enrollment,
      course: course ? {
        _id: course._id,
        title: course.title,
        slug: course.slug,
        thumbnail: course.thumbnail,
        duration: course.duration,
        schedule: course.schedule,
        location: course.location,
        level: course.level,
        skills: course.skills,
        syllabus: course.syllabus,
        providerId: course.providerId
      } : null,
      user: userInfo ? {
        _id: userInfo._id,
        displayName: userInfo.displayName,
        email: userInfo.email,
        avatar: userInfo.avatar,
        phone: userInfo.phone
      } : null,
      profile: profile || null
    }
  } catch (error) { throw error }
}

// ============ UPDATE PROGRESS ============
const updateProgress = async (enrollmentId, progressData, trainerId) => {
  try {
    const enrollment = await enrollmentModel.findOneById(enrollmentId)
    if (!enrollment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Đăng ký không tồn tại!')
    }

    const course = await courseModel.findOneById(enrollment.courseId)
    if (course.providerId.toString() !== trainerId) {
      const user = await userModel.findOneById(trainerId)
      if (user.role !== USER_ROLES.ADMIN) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền cập nhật tiến độ!')
      }
    }

    if (![ENROLLMENT_STATUS.ENROLLED, ENROLLMENT_STATUS.IN_PROGRESS].includes(enrollment.status)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Không thể cập nhật tiến độ ở trạng thái này!')
    }

    const updateData = {
      percentage: progressData.percentage,
      currentLesson: progressData.currentLesson,
      totalLessons: progressData.totalLessons,
      assessments: progressData.assessments,
      notes: progressData.notes
    }

    const updatedEnrollment = await enrollmentModel.updateProgress(enrollmentId, updateData)

    // Xử lý khi hoàn thành 100%
    if (progressData.percentage >= 100 && enrollment.status !== ENROLLMENT_STATUS.COMPLETED) {
      await enrollmentModel.updateStatus(enrollmentId, ENROLLMENT_STATUS.COMPLETED, {
        completedAt: Date.now()
      })
      await courseModel.decrementEnrollmentCount(enrollment.courseId)

      // Trigger disbursement nếu có scholarship
      if (enrollment.scholarship?.scholarshipId) {
        await applicationService.processCompletion(enrollmentId)
      }
    } else if (progressData.percentage > 0 && progressData.percentage < 100) {
      if (enrollment.status === ENROLLMENT_STATUS.ENROLLED) {
        await enrollmentModel.updateStatus(enrollmentId, ENROLLMENT_STATUS.IN_PROGRESS)
      }
    }

    return await enrollmentModel.findOneById(enrollmentId)
  } catch (error) { throw error }
}

// ============ UPDATE STATUS ============
const updateStatus = async (enrollmentId, status, additionalData, trainerId) => {
  try {
    const enrollment = await enrollmentModel.findOneById(enrollmentId)
    if (!enrollment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Đăng ký không tồn tại!')
    }

    const course = await courseModel.findOneById(enrollment.courseId)
    if (course.providerId.toString() !== trainerId) {
      const user = await userModel.findOneById(trainerId)
      if (user.role !== USER_ROLES.ADMIN) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền cập nhật trạng thái!')
      }
    }

    const validTransitions = {
      [ENROLLMENT_STATUS.PENDING]: [ENROLLMENT_STATUS.ENROLLED, ENROLLMENT_STATUS.CANCELLED],
      [ENROLLMENT_STATUS.WAITLIST]: [ENROLLMENT_STATUS.ENROLLED, ENROLLMENT_STATUS.CANCELLED],
      [ENROLLMENT_STATUS.ENROLLED]: [ENROLLMENT_STATUS.IN_PROGRESS, ENROLLMENT_STATUS.DROPPED, ENROLLMENT_STATUS.ON_HOLD],
      [ENROLLMENT_STATUS.IN_PROGRESS]: [ENROLLMENT_STATUS.COMPLETED, ENROLLMENT_STATUS.DROPPED, ENROLLMENT_STATUS.ON_HOLD],
      [ENROLLMENT_STATUS.ON_HOLD]: [ENROLLMENT_STATUS.ENROLLED, ENROLLMENT_STATUS.IN_PROGRESS, ENROLLMENT_STATUS.DROPPED]
    }

    const allowedTransitions = validTransitions[enrollment.status] || []
    if (!allowedTransitions.includes(status)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Không thể chuyển từ "${enrollment.status}" sang "${status}"`
      )
    }

    const updateData = {
      status,
      updatedBy: trainerId
    }

    if (additionalData.dropReason) {
      updateData.dropReason = additionalData.dropReason
    }
    if (additionalData.notes) {
      updateData.notes = additionalData.notes
    }
    if (additionalData.startDate) {
      updateData.startDate = additionalData.startDate
    }
    if (additionalData.endDate) {
      updateData.endDate = additionalData.endDate
    }

    const updatedEnrollment = await enrollmentModel.updateStatus(enrollmentId, status, updateData)

    if (status === ENROLLMENT_STATUS.COMPLETED) {
      await courseModel.decrementEnrollmentCount(enrollment.courseId)
    }

    if (status === ENROLLMENT_STATUS.ENROLLED && enrollment.status === ENROLLMENT_STATUS.WAITLIST) {
      await courseModel.incrementEnrollmentCount(enrollment.courseId)

      const nextInWaitlist = await enrollmentModel.promoteFromWaitlist(enrollment.courseId)
      if (nextInWaitlist) {
        await courseModel.incrementEnrollmentCount(enrollment.courseId)
      }
    }

    if (status === ENROLLMENT_STATUS.DROPPED || status === ENROLLMENT_STATUS.CANCELLED) {
      await courseModel.decrementEnrollmentCount(enrollment.courseId)

      // Xử lý clawback nếu có scholarship đã giải ngân
      if (enrollment.scholarship?.scholarshipId && enrollment.scholarship?.disbursedAmount > 0) {
        await applicationService.processClawback(enrollmentId)
      }
    }

    return updatedEnrollment
  } catch (error) { throw error }
}

// ============ CANCEL ENROLLMENT ============
const cancelEnrollment = async (enrollmentId, userId, reason) => {
  try {
    const enrollment = await enrollmentModel.findOneById(enrollmentId)
    if (!enrollment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Đăng ký không tồn tại!')
    }

    if (enrollment.userId.toString() !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền hủy đăng ký này!')
    }

    const cancellableStatuses = [
      ENROLLMENT_STATUS.PENDING,
      ENROLLMENT_STATUS.ENROLLED,
      ENROLLMENT_STATUS.WAITLIST,
      ENROLLMENT_STATUS.ON_HOLD
    ]

    if (!cancellableStatuses.includes(enrollment.status)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Không thể hủy đăng ký ở trạng thái này!'
      )
    }

    const updatedEnrollment = await enrollmentModel.updateStatus(enrollmentId, ENROLLMENT_STATUS.CANCELLED, {
      dropReason: reason,
      cancelledAt: Date.now()
    })

    if (enrollment.status === ENROLLMENT_STATUS.ENROLLED ||
        enrollment.status === ENROLLMENT_STATUS.IN_PROGRESS) {
      await courseModel.decrementEnrollmentCount(enrollment.courseId)
    }

    if (enrollment.status === ENROLLMENT_STATUS.ENROLLED) {
      const nextInWaitlist = await enrollmentModel.promoteFromWaitlist(enrollment.courseId)
      if (nextInWaitlist) {
        console.log(`Promoted user ${nextInWaitlist.userId} from waitlist for course ${enrollment.courseId}`)
      }
    }

    // Xử lý refund nếu có scholarship đã giải ngân
    if (enrollment.scholarship?.scholarshipId && enrollment.scholarship?.disbursedAmount > 0) {
      await applicationService.processRefund(enrollmentId)
    }

    return updatedEnrollment
  } catch (error) { throw error }
}

// ============ GET ALL ENROLLMENTS (Admin) ============
const getAllEnrollments = async (queryParams) => {
  try {
    const {
      page = DEFAULT_PAGE,
      limit = DEFAULT_ITEM_PER_PAGE,
      status,
      courseId,
      startDate,
      endDate
    } = queryParams

    const currentPage = parseInt(page, 10) || DEFAULT_PAGE
    const recordLimit = parseInt(limit, 10) || DEFAULT_ITEM_PER_PAGE
    const skip = (currentPage - 1) * recordLimit

    const filters = {}
    if (status) filters.status = status
    if (courseId) filters.courseId = courseId
    if (startDate) filters.enrolledAt = { $gte: new Date(startDate) }
    if (endDate) filters.enrolledAt = { ...filters.enrolledAt, $lte: new Date(endDate) }

    const { enrollments, totalEnrollments } = await enrollmentModel.findAll(skip, recordLimit, filters)

    const enrichedEnrollments = await Promise.all(
      enrollments.map(async (enrollment) => {
        const course = await courseModel.findOneById(enrollment.courseId)
        const userInfo = await userModel.findOneById(enrollment.userId)
        return {
          ...enrollment,
          course: course ? {
            _id: course._id,
            title: course.title,
            slug: course.slug
          } : null,
          user: userInfo ? {
            _id: userInfo._id,
            displayName: userInfo.displayName,
            email: userInfo.email
          } : null
        }
      })
    )

    return {
      enrollments: enrichedEnrollments,
      pagination: {
        totalRecords: totalEnrollments,
        totalPages: Math.ceil(totalEnrollments / recordLimit),
        currentPage,
        limit: recordLimit
      }
    }
  } catch (error) { throw error }
}

// ============ GET ENROLLMENT STATS ============
const getEnrollmentStats = async (courseId = null, trainerId = null) => {
  try {
    if (courseId) {
      const course = await courseModel.findOneById(courseId)
      if (!course) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Khóa học không tồn tại!')
      }

      if (trainerId && course.providerId.toString() !== trainerId) {
        const user = await userModel.findOneById(trainerId)
        if (user.role !== USER_ROLES.ADMIN) {
          throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền xem thống kê!')
        }
      }

      return await enrollmentModel.getStatsByCourse(courseId)
    }

    return await enrollmentModel.getOverallStats()
  } catch (error) { throw error }
}

// ============ HELPER FUNCTIONS ============
const checkEligibility = async (profile, course) => {
  const age = profile.basicInfo?.age
  if (age < 35 || age > 65) {
    return {
      eligible: false,
      reason: 'Độ tuổi không phù hợp với khóa học này (yêu cầu 35-65 tuổi)'
    }
  }

  if (profile.barriers?.location && course.location?.type === 'offline') {
    return {
      eligible: true,
      warning: 'Bạn có rào cản về địa điểm. Khóa học này học trực tiếp.',
      suggestion: 'Cân nhắc khóa học online tương đương'
    }
  }

  if (profile.barriers?.health) {
    return {
      eligible: true,
      warning: 'Bạn có rào cản về sức khỏe. Vui lòng cân nhắc trước khi đăng ký.'
    }
  }

  return { eligible: true }
}

const checkPrerequisites = async (userId, course) => {
  if (!course.prerequisites || course.prerequisites.length === 0) {
    return { passed: true }
  }

  const completedEnrollments = await enrollmentModel.findCompletedByUser(userId)

  if (completedEnrollments.length === 0) {
    return {
      passed: false,
      missing: course.prerequisites
    }
  }

  const completedCourseIds = completedEnrollments.map(e => e.courseId.toString())

  const missing = []
  for (const prereq of course.prerequisites) {
    const prereqLower = prereq.toLowerCase()
    const hasCompleted = completedEnrollments.some(e => {
      const title = e.courseId?.title?.toLowerCase() || ''
      return title.includes(prereqLower) || completedCourseIds.includes(prereq)
    })

    if (!hasCompleted) {
      missing.push(prereq)
    }
  }

  return {
    passed: missing.length === 0,
    missing
  }
}

const checkCapacity = async (course) => {
  if (course.currentStudents >= course.maxStudents) {
    return {
      available: false,
      reason: 'Khóa học đã đầy',
      currentStudents: course.currentStudents,
      maxStudents: course.maxStudents
    }
  }

  return {
    available: true,
    currentStudents: course.currentStudents,
    maxStudents: course.maxStudents,
    slotsAvailable: course.maxStudents - course.currentStudents
  }
}

// ============ GET ADMIN STATS ============
const getAdminStats = async () => {
  return await enrollmentModel.getAdminStats()
}

const getMonthlyTrend = async (months = 6) => {
  return await enrollmentModel.getMonthlyTrend(months)
}

const getEnrollmentsForExport = async (filters = {}) => {
  return await enrollmentModel.getEnrollmentsForExport(filters)
}

// ============ DROP ENROLLMENT (Worker tự bỏ) ============
const dropEnrollment = async (enrollmentId, userId, dropReason) => {
  try {
    const enrollment = await enrollmentModel.findOneById(enrollmentId)
    if (!enrollment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Đăng ký không tồn tại!')
    }

    if (enrollment.userId.toString() !== userId.toString()) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền hủy đăng ký này!')
    }

    if (enrollment.status === ENROLLMENT_STATUS.DROPPED) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Đăng ký này đã bị hủy trước đó!')
    }

    if (enrollment.status === ENROLLMENT_STATUS.COMPLETED) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Không thể hủy đăng ký đã hoàn thành!')
    }

    const updated = await enrollmentModel.updateStatus(enrollmentId, ENROLLMENT_STATUS.DROPPED, {
      dropReason: dropReason || null
    })

    if (enrollment.status !== ENROLLMENT_STATUS.WAITLIST) {
      await courseModel.decrementEnrollmentCount(enrollment.courseId.toString())
    }

    return updated
  } catch (error) { throw error }
}

// ============ SUSPEND ENROLLMENT (Trainer/Admin tạm ngưng) ============
const suspendEnrollment = async (enrollmentId, trainerId, reason) => {
  try {
    const enrollment = await enrollmentModel.findOneById(enrollmentId)
    if (!enrollment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Đăng ký không tồn tại!')
    }

    if (enrollment.status !== ENROLLMENT_STATUS.ACTIVE && enrollment.status !== ENROLLMENT_STATUS.IN_PROGRESS) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Chỉ có thể tạm ngưng đăng ký đang hoạt động!')
    }

    const updated = await enrollmentModel.updateStatus(enrollmentId, ENROLLMENT_STATUS.SUSPENDED, {
      notes: reason || null
    })

    return updated
  } catch (error) { throw error }
}

// ============ COMPLETE ENROLLMENT (Trainer/Admin hoàn thành) ============
const completeEnrollment = async (enrollmentId, trainerId, options = {}) => {
  try {
    const enrollment = await enrollmentModel.findOneById(enrollmentId)
    if (!enrollment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Đăng ký không tồn tại!')
    }

    if (enrollment.status === ENROLLMENT_STATUS.COMPLETED) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Đăng ký này đã hoàn thành trước đó!')
    }

    if (enrollment.status !== ENROLLMENT_STATUS.ACTIVE &&
        enrollment.status !== ENROLLMENT_STATUS.IN_PROGRESS &&
        enrollment.status !== ENROLLMENT_STATUS.SUSPENDED) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Không thể hoàn thành đăng ký ở trạng thái hiện tại!')
    }

    const updateData = {}
    if (options.score !== undefined && options.score !== null) {
      updateData.assessments = [
        ...(enrollment.assessments || []),
        { name: 'Kết thúc khóa học', score: options.score, passed: options.score >= 60, date: Date.now() }
      ]
    }

    const updated = await enrollmentModel.updateStatus(enrollmentId, ENROLLMENT_STATUS.COMPLETED, updateData)

    return updated
  } catch (error) { throw error }
}

// ============ FAIL ENROLLMENT (Trainer/Admin fail) ============
const failEnrollment = async (enrollmentId, trainerId, reason) => {
  try {
    const enrollment = await enrollmentModel.findOneById(enrollmentId)
    if (!enrollment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Đăng ký không tồn tại!')
    }

    if (enrollment.status === ENROLLMENT_STATUS.COMPLETED || enrollment.status === ENROLLMENT_STATUS.DROPPED) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Không thể đánh fail đăng ký đã kết thúc!')
    }

    const updated = await enrollmentModel.updateStatus(enrollmentId, ENROLLMENT_STATUS.FAILED, {
      dropReason: reason || 'Không đạt yêu cầu khóa học'
    })

    if (enrollment.status !== ENROLLMENT_STATUS.WAITLIST) {
      await courseModel.decrementEnrollmentCount(enrollment.courseId.toString())
    }

    return updated
  } catch (error) { throw error }
}

export const enrollmentService = {
  // Core
  enrollCourse,
  getMyEnrollments,
  getEnrollmentsByCourse,
  getEnrollmentById,
  getAllEnrollments,

  // Update
  updateProgress,
  updateStatus,
  cancelEnrollment,
  dropEnrollment,
  suspendEnrollment,
  completeEnrollment,
  failEnrollment,

  // Stats
  getEnrollmentStats,

  // Admin
  getAdminStats,
  getMonthlyTrend,
  getEnrollmentsForExport,

  // Helpers
  checkEligibility,
  checkPrerequisites,
  checkCapacity
}
