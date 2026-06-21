import { interviewModel } from '~/models/interviewModel'
import { applicationModel } from '~/models/applicationModel'
import { recruitmentJobModel } from '~/models/recruitmentJobModel'
import { userModel } from '~/models/userModel'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import {
  DEFAULT_PAGE,
  DEFAULT_ITEM_PER_PAGE,
  RECRUITMENT_INTERVIEW_STATUS,
  RECRUITMENT_APPLICATION_STATUS,
  PLACEMENT_STATUS,
  USER_ROLES
} from '~/utils/constants'
import { placementModel } from '~/models/placementModel'

// ============ ENTERPRISE: INTERVIEW MANAGEMENT ============

// Tạo lịch phỏng vấn
const createInterview = async (enterpriseId, data) => {
  try {
    // Kiểm tra application tồn tại
    const application = await applicationModel.findOneByIdAndEnterprise(data.applicationId, enterpriseId)
    if (!application) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn ứng tuyển!')
    }

    // Kiểm tra application đã được shortlist
    if (application.status !== RECRUITMENT_APPLICATION_STATUS.SHORTLISTED &&
        application.status !== RECRUITMENT_APPLICATION_STATUS.INTERVIEW_SCHEDULED) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Ứng viên chưa được chọn vào danh sách phỏng vấn!')
    }

    // Lấy interview config từ job
    const job = await recruitmentJobModel.findOneById(data.jobId)

    const interviewData = {
      applicationId: data.applicationId,
      jobId: data.jobId,
      workerId: application.workerId,
      enterpriseId,
      scheduledAt: data.scheduledAt,
      duration: data.duration || job?.interviewConfig?.duration || 60,
      meetingType: data.meetingType || job?.interviewConfig?.meetingType || 'google_meet',
      meetingLink: data.meetingLink || '',
      officeAddress: data.officeAddress || job?.interviewConfig?.officeAddress || '',
      enterpriseInterviewer: {
        name: data.interviewerName || '',
        email: data.interviewerEmail || '',
        phone: data.interviewerPhone || '',
        position: data.interviewerPosition || ''
      },
      workerConfirmed: true,
      enterpriseConfirmed: true,
      status: RECRUITMENT_INTERVIEW_STATUS.CONFIRMED,
      notes: data.notes || ''
    }

    const result = await interviewModel.createNew(interviewData)

    // Update application status
    await applicationModel.updateStatus(
      data.applicationId,
      RECRUITMENT_APPLICATION_STATUS.INTERVIEW_SCHEDULED,
      enterpriseId,
      'Lịch phỏng vấn đã được đặt'
    )

    // Link interview to application
    await applicationModel.update(data.applicationId, {
      interviewId: result.insertedId.toString()
    })

    // Increment interview count on job
    await recruitmentJobModel.incrementStats(data.jobId, 'interviews')

    const interview = await interviewModel.findOneById(result.insertedId)
    return interview
  } catch (error) { throw error }
}

// Lấy danh sách phỏng vấn của enterprise
const getInterviews = async (enterpriseId, page = DEFAULT_PAGE, limit = DEFAULT_ITEM_PER_PAGE, filters = {}) => {
  try {
    page = parseInt(page, 10)
    limit = parseInt(limit, 10)
    const skip = (page - 1) * limit
    const { interviews, total } = await interviewModel.findByEnterprise(enterpriseId, skip, limit, filters)

    // Enrich interviews with worker and job info
    const enrichedInterviews = await Promise.all(
      interviews.map(async (interview) => {
        const worker = await userModel.findOneById(interview.workerId)
        const job = await recruitmentJobModel.findOneById(interview.jobId)
        return {
          ...interview,
          worker: worker ? {
            _id: worker._id,
            name: worker.displayName || worker.username || 'Ứng viên',
            email: worker.email,
            avatar: worker.avatar,
            phone: worker.phone
          } : null,
          job: job ? {
            _id: job._id,
            title: job.title || 'Vị trí công việc'
          } : null
        }
      })
    )

    return {
      interviews: enrichedInterviews,
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error) { throw error }
}

// Lấy chi tiết phỏng vấn
const getInterviewById = async (interviewId, userId = null, role = null) => {
  try {
    let interview
    if (role === 'enterprise') {
      interview = await interviewModel.findOneByIdAndEnterprise(interviewId, userId)
    } else if (role === 'worker') {
      interview = await interviewModel.findOneByIdAndWorker(interviewId, userId)
    } else {
      interview = await interviewModel.findOneById(interviewId)
    }

    if (!interview) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy lịch phỏng vấn!')
    }

    // Enrich interview with worker and job info
    const worker = await userModel.findOneById(interview.workerId)
    const job = await recruitmentJobModel.findOneById(interview.jobId)

    return {
      ...interview,
      worker: worker ? {
        _id: worker._id,
        name: worker.displayName || worker.username || 'Ứng viên',
        email: worker.email,
        avatar: worker.avatar,
        phone: worker.phone
      } : null,
      job: job ? {
        _id: job._id,
        title: job.title || 'Vị trí công việc'
      } : null
    }
  } catch (error) { throw error }
}

// Hoãn lịch phỏng vấn (enterprise)
const rescheduleInterview = async (interviewId, enterpriseId, newTime, reason = null) => {
  try {
    const interview = await interviewModel.findOneByIdAndEnterprise(interviewId, enterpriseId)
    if (!interview) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy lịch phỏng vấn!')
    }

    // Get job to check max reschedules
    const job = await recruitmentJobModel.findOneById(interview.jobId)
    const maxReschedules = job?.interviewConfig?.maxReschedules || 2

    const result = await interviewModel.reschedule(interviewId, enterpriseId, newTime, reason, maxReschedules)
    return result
  } catch (error) { throw error }
}

// Cập nhật lịch phỏng vấn (không giới hạn như hoãn)
const updateInterview = async (interviewId, enterpriseId, updateData) => {
  try {
    const interview = await interviewModel.findOneByIdAndEnterprise(interviewId, enterpriseId)
    if (!interview) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy lịch phỏng vấn')
    }
    
    // Only update specific fields
    const payload = {}
    if (updateData.scheduledAt) payload.scheduledAt = updateData.scheduledAt
    
    const result = await interviewModel.update(interviewId, payload)
    return result
  } catch (error) { throw error }
}

// Hủy phỏng vấn
const cancelInterview = async (interviewId, enterpriseId, reason = null) => {
  try {
    const result = await interviewModel.cancelInterview(interviewId, enterpriseId, reason)

    // Revert application status
    await applicationModel.updateStatus(
      result.applicationId,
      RECRUITMENT_APPLICATION_STATUS.SHORTLISTED,
      enterpriseId,
      'Phỏng vấn đã bị hủy'
    )

    return result
  } catch (error) { throw error }
}

// Hoàn thành phỏng vấn
const completeInterview = async (interviewId, enterpriseId, feedback) => {
  try {
    const result = await interviewModel.completeInterview(interviewId, enterpriseId, feedback)

    if (feedback.enterpriseDecision === 'reject') {
      await applicationModel.updateStatus(
        result.applicationId,
        RECRUITMENT_APPLICATION_STATUS.REJECTED,
        enterpriseId,
        'Không trúng tuyển sau phỏng vấn'
      )
    } else if (feedback.enterpriseDecision === 'hire') {
      await applicationModel.updateStatus(
        result.applicationId,
        RECRUITMENT_APPLICATION_STATUS.HIRED,
        enterpriseId,
        'Đã trúng tuyển trực tiếp sau phỏng vấn'
      )

      // Fetch job and enterprise info to create placement
      const job = await recruitmentJobModel.findOneById(result.jobId)
      const enterprise = await userModel.findOneById(enterpriseId)

      const placementData = {
        userId: String(result.workerId),
        enterpriseId: String(result.enterpriseId),
        jobId: String(result.jobId),
        applicationId: String(result.applicationId),
        employer: {
          name: enterprise?.organization?.name || enterprise?.displayName || enterprise?.username || 'Doanh nghiệp',
          logo: enterprise?.organization?.logo || '',
          industry: enterprise?.organization?.industry || '',
          contactPerson: '',
          contactEmail: enterprise?.email || '',
          contactPhone: enterprise?.phone || ''
        },
        job: {
          title: job?.job?.title || 'Công việc',
          position: job?.job?.category || 'Nhân viên',
          salary: Number(feedback.enterpriseSalary) || Number(job?.job?.salary?.min) || 0,
          currency: job?.job?.salary?.currency || 'VND',
          employmentType: job?.job?.employmentType || 'full_time'
        },
        status: PLACEMENT_STATUS.ACCEPTED,
        offerDetails: {
          offeredDate: Date.now(),
          offeredSalary: Number(feedback.enterpriseSalary) || Number(job?.job?.salary?.min) || 0,
          startDate: feedback.enterpriseStartDate || Date.now()
        },
        startedDate: feedback.enterpriseStartDate || Date.now(),
        referralSource: null
      }

      const placement = await placementModel.createNew(placementData)
      await applicationModel.update(result.applicationId, {
        placementId: placement.insertedId.toString()
      })
    } else {
      // Default fallback
      await applicationModel.updateStatus(
        result.applicationId,
        RECRUITMENT_APPLICATION_STATUS.INTERVIEWED,
        enterpriseId,
        'Phỏng vấn đã hoàn thành'
      )
    }

    return result
  } catch (error) { throw error }
}

// Đánh dấu không đến
const markNoShow = async (interviewId, enterpriseId) => {
  try {
    const result = await interviewModel.markNoShow(interviewId, enterpriseId)

    // Update application status
    await applicationModel.updateStatus(
      result.applicationId,
      RECRUITMENT_APPLICATION_STATUS.SHORTLISTED,
      enterpriseId,
      'Ứng viên không đến phỏng vấn'
    )

    return result
  } catch (error) { throw error }
}

// ============ WORKER: INTERVIEW MANAGEMENT ============

// Lấy danh sách phỏng vấn của worker
const getMyInterviews = async (workerId, page = DEFAULT_PAGE, limit = DEFAULT_ITEM_PER_PAGE, filters = {}) => {
  try {
    page = parseInt(page, 10)
    limit = parseInt(limit, 10)
    const skip = (page - 1) * limit
    const { interviews, total } = await interviewModel.findByWorker(workerId, skip, limit, filters)

    return {
      interviews,
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error) { throw error }
}

// Lấy chi tiết phỏng vấn của worker
const getMyInterviewById = async (interviewId, workerId) => {
  try {
    const interview = await interviewModel.findOneByIdAndWorker(interviewId, workerId)
    if (!interview) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy lịch phỏng vấn!')
    }

    return interview
  } catch (error) { throw error }
}

// Xác nhận tham gia phỏng vấn
const confirmInterview = async (interviewId, workerId) => {
  try {
    const result = await interviewModel.confirmInterview(interviewId, workerId)
    return result
  } catch (error) { throw error }
}

// Worker yêu cầu hoãn
const requestReschedule = async (interviewId, workerId, reason, newPreferredTime = null) => {
  try {
    const result = await interviewModel.workerRequestReschedule(interviewId, workerId, reason, newPreferredTime)
    return result
  } catch (error) { throw error }
}

// ============ UPCOMING INTERVIEWS ============

// Lấy danh sách phỏng vấn sắp tới
const getUpcomingInterviews = async (userId, role, page = DEFAULT_PAGE, limit = DEFAULT_ITEM_PER_PAGE) => {
  try {
    page = parseInt(page, 10)
    limit = parseInt(limit, 10)
    const skip = (page - 1) * limit
    const { interviews, total } = await interviewModel.findUpcoming(userId, role, skip, limit)

    return {
      interviews,
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error) { throw error }
}

// ============ STATS ============

// Lấy stats của enterprise
const getEnterpriseStats = async (enterpriseId) => {
  try {
    const stats = await interviewModel.getStatsByEnterprise(enterpriseId)
    return stats
  } catch (error) { throw error }
}

export const interviewService = {
  // Enterprise
  createInterview,
  getInterviews,
  getInterviewById,
  rescheduleInterview,
  updateInterview,
  cancelInterview,
  completeInterview,
  markNoShow,

  // Worker
  getMyInterviews,
  getMyInterviewById,
  confirmInterview,
  requestReschedule,

  // Common
  getUpcomingInterviews,
  getEnterpriseStats
}
