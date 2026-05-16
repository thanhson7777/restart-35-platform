import { scholarshipApplicationModel } from '~/models/scholarshipApplicationModel'
import { scholarshipModel } from '~/models/scholarshipModel'
import { enrollmentModel } from '~/models/enrollmentModel'
import { courseModel } from '~/models/courseModel'
import { userModel } from '~/models/userModel'
import { workerProfileModel } from '~/models/workerProfileModel'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import {
  DEFAULT_PAGE,
  DEFAULT_ITEM_PER_PAGE,
  APPLICATION_STATUS,
  ENROLLMENT_STATUS,
  DISBURSEMENT_STATUS,
  APPEAL_STATUS,
  SCHOLARSHIP_COVERAGE,
  USER_ROLES
} from '~/utils/constants'

// ============ APPLICATION CRUD ============

// Tạo application mới (draft)
const createApplication = async (userId, data) => {
  try {
    const user = await userModel.findOneById(userId)
    if (!user || user.role !== USER_ROLES.WORKER) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Chỉ người lao động mới được nộp đơn!')
    }

    const existing = await scholarshipApplicationModel.findOneByUserAndScholarship(
      userId, data.scholarshipId
    )
    if (existing) {
      throw new ApiError(StatusCodes.CONFLICT, 'Bạn đã nộp đơn cho học bổng này rồi!')
    }

    const scholarship = await scholarshipModel.findOneById(data.scholarshipId)
    if (!scholarship) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy học bổng!')
    }

    const availability = await scholarshipModel.checkAvailability(data.scholarshipId)
    if (!availability.available) {
      throw new ApiError(StatusCodes.BAD_REQUEST, availability.reason)
    }

    const applicationData = {
      userId,
      scholarshipId: data.scholarshipId,
      courseId: data.courseId,
      requestedAmount: data.requestedAmount || scholarship.amountPerRecipient,
      status: APPLICATION_STATUS.DRAFT
    }

    const result = await scholarshipApplicationModel.createNew(applicationData)
    const application = await scholarshipApplicationModel.findOneById(result.insertedId)

    return application
  } catch (error) { throw error }
}

// Cập nhật application (chỉ khi còn là draft)
const updateApplication = async (applicationId, userId, data) => {
  try {
    const application = await scholarshipApplicationModel.findOneById(applicationId)
    if (!application) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn!')
    }

    if (application.userId !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền sửa đơn này!')
    }

    if (application.status !== APPLICATION_STATUS.DRAFT) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Chỉ có thể sửa đơn khi còn ở trạng thái nháp!')
    }

    const updateData = {}
    if (data.motivationLetter !== undefined) updateData.motivationLetter = data.motivationLetter
    if (data.courseId) updateData.courseId = data.courseId
    if (data.requestedAmount) updateData.requestedAmount = data.requestedAmount

    const updated = await scholarshipApplicationModel.update(applicationId, updateData)
    return updated
  } catch (error) { throw error }
}

// Nộp đơn (chuyển từ draft sang submitted)
const submitApplication = async (applicationId, userId) => {
  try {
    const application = await scholarshipApplicationModel.findOneById(applicationId)
    if (!application) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn!')
    }

    if (application.userId !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền nộp đơn này!')
    }

    if (application.status !== APPLICATION_STATUS.DRAFT) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Đơn đã được nộp trước đó!')
    }

    const profile = await workerProfileModel.findOneByUserId(userId)
    if (!profile || !profile.isCompleted) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Vui lòng hoàn thành hồ sơ trước khi nộp đơn!')
    }

    const updated = await scholarshipApplicationModel.updateStatus(
      applicationId,
      APPLICATION_STATUS.SUBMITTED,
      { submittedAt: Date.now() }
    )

    return updated
  } catch (error) { throw error }
}

// Xóa application (chỉ khi còn là draft)
const deleteApplication = async (applicationId, userId) => {
  try {
    const application = await scholarshipApplicationModel.findOneById(applicationId)
    if (!application) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn!')
    }

    if (application.userId !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền xóa đơn này!')
    }

    if (application.status !== APPLICATION_STATUS.DRAFT) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Chỉ có thể xóa đơn khi còn ở trạng thái nháp!')
    }

    await scholarshipApplicationModel.deleteApplication(applicationId)
    return { deleted: true }
  } catch (error) { throw error }
}

// Lấy application theo ID
const getApplicationById = async (applicationId, userId = null, userRole = null) => {
  try {
    const application = await scholarshipApplicationModel.findOneById(applicationId)
    if (!application) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn!')
    }

    if (userId) {
      const isOwner = application.userId === userId
      const scholarship = await scholarshipModel.findOneById(application.scholarshipId)
      const isNgoOwner = scholarship?.ngoId === userId
      const isAdmin = userRole === USER_ROLES.ADMIN

      if (!isOwner && !isNgoOwner && !isAdmin) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền xem đơn này!')
      }
    }

    const [scholarship, course, user] = await Promise.all([
      scholarshipModel.findOneById(application.scholarshipId),
      courseModel.findOneById(application.courseId),
      userModel.findOneById(application.userId)
    ])

    return {
      ...application,
      scholarship: scholarship ? {
        _id: scholarship._id,
        title: scholarship.title,
        ngoId: scholarship.ngoId
      } : null,
      course: course ? {
        _id: course._id,
        title: course.title,
        thumbnail: course.thumbnail,
        fee: course.fee
      } : null,
      user: user ? {
        _id: user._id,
        displayName: user.displayName,
        email: user.email,
        phone: user.phone
      } : null
    }
  } catch (error) { throw error }
}

// Lấy applications của user
const getMyApplications = async (userId, queryParams) => {
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

    const { applications, totalApplications } = await scholarshipApplicationModel.findByUser(
      userId, skip, recordLimit, filters
    )

    const enrichedApplications = await Promise.all(
      applications.map(async (app) => {
        const [scholarship, course] = await Promise.all([
          scholarshipModel.findOneById(app.scholarshipId),
          courseModel.findOneById(app.courseId)
        ])
        return {
          ...app,
          scholarship: scholarship ? {
            _id: scholarship._id,
            title: scholarship.title,
            ngoId: scholarship.ngoId
          } : null,
          course: course ? {
            _id: course._id,
            title: course.title,
            thumbnail: course.thumbnail,
            fee: course.fee
          } : null
        }
      })
    )

    return {
      applications: enrichedApplications,
      pagination: {
        totalRecords: totalApplications,
        totalPages: Math.ceil(totalApplications / recordLimit),
        currentPage,
        limit: recordLimit
      }
    }
  } catch (error) { throw error }
}

// ============ NGO REVIEW ============

// Lấy pending applications cho NGO
const getPendingApplications = async (ngoId, queryParams) => {
  try {
    const {
      page = DEFAULT_PAGE,
      limit = DEFAULT_ITEM_PER_PAGE,
      scholarshipId
    } = queryParams

    const currentPage = parseInt(page, 10) || DEFAULT_PAGE
    const recordLimit = parseInt(limit, 10) || DEFAULT_ITEM_PER_PAGE
    const skip = (currentPage - 1) * recordLimit

    let applications
    let totalApplications

    if (scholarshipId) {
      const scholarship = await scholarshipModel.findOneByIdAndNgo(scholarshipId, ngoId)
      if (!scholarship) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy học bổng!')
      }

      const result = await scholarshipApplicationModel.findPendingByScholarship(
        scholarshipId, skip, recordLimit
      )
      applications = result.applications
      totalApplications = result.totalApplications
    } else {
      const scholarships = await scholarshipModel.findByNgo(ngoId, 0, 1000)
      const scholarshipIds = scholarships.scholarships.map(s => s._id.toString())

      const result = await scholarshipApplicationModel.findAll(skip, recordLimit, {
        scholarshipId: { $in: scholarshipIds }
      })

      const pendingApps = result.applications.filter(
        app => [APPLICATION_STATUS.SUBMITTED, APPLICATION_STATUS.REVIEWING].includes(app.status)
      )
      applications = pendingApps
      totalApplications = pendingApps.length
    }

    const enrichedApplications = await Promise.all(
      applications.map(async (app) => {
        const [scholarship, course, user, profile] = await Promise.all([
          scholarshipModel.findOneById(app.scholarshipId),
          courseModel.findOneById(app.courseId),
          userModel.findOneById(app.userId),
          workerProfileModel.findOneByUserId(app.userId)
        ])
        return {
          ...app,
          scholarship: scholarship ? {
            _id: scholarship._id,
            title: scholarship.title
          } : null,
          course: course ? {
            _id: course._id,
            title: course.title
          } : null,
          user: user ? {
            _id: user._id,
            displayName: user.displayName,
            email: user.email,
            phone: user.phone
          } : null,
          profile: profile ? {
            basicInfo: profile.basicInfo
          } : null
        }
      })
    )

    return {
      applications: enrichedApplications,
      pagination: {
        totalRecords: totalApplications,
        totalPages: Math.ceil(totalApplications / recordLimit),
        currentPage,
        limit: recordLimit
      }
    }
  } catch (error) { throw error }
}

// Duyệt đơn
const approveApplication = async (applicationId, ngoId, data) => {
  try {
    const application = await scholarshipApplicationModel.findOneById(applicationId)
    if (!application) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn!')
    }

    const scholarship = await scholarshipModel.findOneByIdAndNgo(application.scholarshipId, ngoId)
    if (!scholarship) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền duyệt đơn này!')
    }

    if (![APPLICATION_STATUS.SUBMITTED, APPLICATION_STATUS.REVIEWING].includes(application.status)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Đơn không ở trạng thái chờ duyệt!')
    }

    const availability = await scholarshipModel.checkAvailability(application.scholarshipId)
    if (!availability.available) {
      throw new ApiError(StatusCodes.BAD_REQUEST, availability.reason)
    }

    const linkedCourse = scholarship.linkedCourses?.find(
      c => c.courseId.toString() === application.courseId.toString()
    )
    const coverage = linkedCourse?.coverage || SCHOLARSHIP_COVERAGE.PARTIAL
    const maxAmount = linkedCourse?.maxAmount || scholarship.amountPerRecipient
    const approvedAmount = data.approvedAmount || maxAmount

    const updated = await scholarshipApplicationModel.update(applicationId, {
      status: APPLICATION_STATUS.APPROVED,
      approvedAmount: approvedAmount,
      coverage: coverage,
      reviewedBy: ngoId,
      reviewedAt: Date.now(),
      reviewNotes: data.reviewNotes || '',
      approvedAt: Date.now()
    })

    await scholarshipModel.incrementRecipients(application.scholarshipId, approvedAmount)

    return updated
  } catch (error) { throw error }
}

// Từ chối đơn
const rejectApplication = async (applicationId, ngoId, reason) => {
  try {
    const application = await scholarshipApplicationModel.findOneById(applicationId)
    if (!application) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn!')
    }

    const scholarship = await scholarshipModel.findOneByIdAndNgo(application.scholarshipId, ngoId)
    if (!scholarship) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền duyệt đơn này!')
    }

    if (![APPLICATION_STATUS.SUBMITTED, APPLICATION_STATUS.REVIEWING].includes(application.status)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Đơn không ở trạng thái chờ duyệt!')
    }

    const updated = await scholarshipApplicationModel.update(applicationId, {
      status: APPLICATION_STATUS.REJECTED,
      rejectionReason: reason,
      reviewedBy: ngoId,
      reviewedAt: Date.now()
    })

    return updated
  } catch (error) { throw error }
}

// Xếp vào danh sách chờ
const waitlistApplication = async (applicationId, ngoId) => {
  try {
    const application = await scholarshipApplicationModel.findOneById(applicationId)
    if (!application) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn!')
    }

    const scholarship = await scholarshipModel.findOneByIdAndNgo(application.scholarshipId, ngoId)
    if (!scholarship) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền duyệt đơn này!')
    }

    const updated = await scholarshipApplicationModel.update(applicationId, {
      status: APPLICATION_STATUS.WAITLIST,
      reviewedBy: ngoId,
      reviewedAt: Date.now()
    })

    return updated
  } catch (error) { throw error }
}

// Kháng cáo
const appealApplication = async (applicationId, userId, reason) => {
  try {
    const application = await scholarshipApplicationModel.findOneById(applicationId)
    if (!application) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn!')
    }

    if (application.userId !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền kháng cáo đơn này!')
    }

    if (application.status !== APPLICATION_STATUS.REJECTED) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Chỉ có thể kháng cáo đơn bị từ chối!')
    }

    const scholarship = await scholarshipModel.findOneById(application.scholarshipId)
    if (!scholarship?.allowAppeals) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Học bổng này không cho phép kháng cáo!')
    }

    const updated = await scholarshipApplicationModel.addAppeal(applicationId, {
      reason,
      submittedAt: Date.now(),
      status: APPEAL_STATUS.PENDING
    })

    return updated
  } catch (error) { throw error }
}

// ============ DISBURSEMENT & CLAWBACK ============

// Xử lý hoàn thành khóa học - giải ngân
const processCompletion = async (enrollmentId) => {
  try {
    const enrollment = await enrollmentModel.findOneById(enrollmentId)
    if (!enrollment?.scholarship?.applicationId) return

    const application = await scholarshipApplicationModel.findOneById(
      enrollment.scholarship.applicationId
    )
    if (!application) return

    const fundedAmount = enrollment.scholarship.fundedAmount

    await scholarshipApplicationModel.addDisbursement(application._id.toString(), {
      amount: fundedAmount,
      date: Date.now(),
      status: DISBURSEMENT_STATUS.DISBURSED,
      note: 'Giải ngân khi hoàn thành khóa học'
    })

    await enrollmentModel.update(enrollmentId, {
      'scholarship.disbursedAmount': fundedAmount,
      'scholarship.disbursements': [...enrollment.scholarship.disbursements, {
        amount: fundedAmount,
        date: Date.now(),
        status: DISBURSEMENT_STATUS.DISBURSED
      }]
    })

    return { disbursed: true, amount: fundedAmount }
  } catch (error) {
    console.error('Error processing completion:', error)
    throw error
  }
}

// Xử lý bỏ học - thu hồi
const processClawback = async (enrollmentId) => {
  try {
    const enrollment = await enrollmentModel.findOneById(enrollmentId)
    if (!enrollment?.scholarship?.applicationId) return

    const application = await scholarshipApplicationModel.findOneById(
      enrollment.scholarship.applicationId
    )
    if (!application) return

    const progress = enrollment.progress?.percentage || 0
    const fundedAmount = enrollment.scholarship.fundedAmount
    const disbursedAmount = enrollment.scholarship.disbursedAmount || 0

    let clawbackAmount = 0
    if (progress < 50) {
      clawbackAmount = disbursedAmount
    } else if (progress < 80) {
      clawbackAmount = Math.floor(disbursedAmount * 0.5)
    }

    if (clawbackAmount > 0) {
      await scholarshipModel.decrementRecipients(
        application.scholarshipId,
        clawbackAmount
      )

      await scholarshipApplicationModel.addDisbursement(application._id.toString(), {
        amount: -clawbackAmount,
        date: Date.now(),
        status: DISBURSEMENT_STATUS.CLAWBACK,
        note: `Thu hồi do bỏ học (${progress}% hoàn thành)`
      })

      await enrollmentModel.update(enrollmentId, {
        'scholarship.clawbackAmount': clawbackAmount,
        'scholarship.disbursements': [...enrollment.scholarship.disbursements, {
          amount: -clawbackAmount,
          date: Date.now(),
          status: DISBURSEMENT_STATUS.CLAWBACK
        }]
      })

      return { clawback: true, amount: clawbackAmount }
    }

    return { clawback: false, amount: 0 }
  } catch (error) {
    console.error('Error processing clawback:', error)
    throw error
  }
}

// Xử lý hủy đơn - hoàn tiền
const processRefund = async (enrollmentId) => {
  try {
    const enrollment = await enrollmentModel.findOneById(enrollmentId)
    if (!enrollment?.scholarship?.applicationId) return

    const application = await scholarshipApplicationModel.findOneById(
      enrollment.scholarship.applicationId
    )
    if (!application) return

    const disbursedAmount = enrollment.scholarship.disbursedAmount || 0

    if (disbursedAmount > 0) {
      await scholarshipModel.decrementRecipients(
        application.scholarshipId,
        disbursedAmount
      )

      await scholarshipApplicationModel.addDisbursement(application._id.toString(), {
        amount: -disbursedAmount,
        date: Date.now(),
        status: DISBURSEMENT_STATUS.REFUNDED,
        note: 'Hoàn tiền do hủy đăng ký'
      })

      await enrollmentModel.update(enrollmentId, {
        'scholarship.disbursements': [...enrollment.scholarship.disbursements, {
          amount: -disbursedAmount,
          date: Date.now(),
          status: DISBURSEMENT_STATUS.REFUNDED
        }]
      })

      return { refunded: true, amount: disbursedAmount }
    }

    return { refunded: false, amount: 0 }
  } catch (error) {
    console.error('Error processing refund:', error)
    throw error
  }
}

// ============ ADMIN ============

// Lấy tất cả applications (admin)
const getAllApplications = async (queryParams) => {
  try {
    const {
      page = DEFAULT_PAGE,
      limit = DEFAULT_ITEM_PER_PAGE,
      status,
      scholarshipId
    } = queryParams

    const currentPage = parseInt(page, 10) || DEFAULT_PAGE
    const recordLimit = parseInt(limit, 10) || DEFAULT_ITEM_PER_PAGE
    const skip = (currentPage - 1) * recordLimit

    const filters = {}
    if (status) filters.status = status
    if (scholarshipId) filters.scholarshipId = scholarshipId

    const { applications, totalApplications } = await scholarshipApplicationModel.findAll(
      skip, recordLimit, filters
    )

    const enrichedApplications = await Promise.all(
      applications.map(async (app) => {
        const [scholarship, course, user] = await Promise.all([
          scholarshipModel.findOneById(app.scholarshipId),
          courseModel.findOneById(app.courseId),
          userModel.findOneById(app.userId)
        ])
        return {
          ...app,
          scholarship: scholarship ? {
            _id: scholarship._id,
            title: scholarship.title,
            ngoId: scholarship.ngoId
          } : null,
          course: course ? {
            _id: course._id,
            title: course.title
          } : null,
          user: user ? {
            _id: user._id,
            displayName: user.displayName,
            email: user.email
          } : null
        }
      })
    )

    return {
      applications: enrichedApplications,
      pagination: {
        totalRecords: totalApplications,
        totalPages: Math.ceil(totalApplications / recordLimit),
        currentPage,
        limit: recordLimit
      }
    }
  } catch (error) { throw error }
}

export const applicationService = {
  // CRUD
  createApplication,
  updateApplication,
  submitApplication,
  deleteApplication,
  getApplicationById,
  getMyApplications,

  // NGO Review
  getPendingApplications,
  approveApplication,
  rejectApplication,
  waitlistApplication,
  appealApplication,

  // Disbursement
  processCompletion,
  processClawback,
  processRefund,

  // Admin
  getAllApplications
}
