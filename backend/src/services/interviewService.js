import { interviewModel } from '~/models/interviewModel'
import { applicationModel } from '~/models/applicationModel'
import { recruitmentJobModel } from '~/models/recruitmentJobModel'
import { userModel } from '~/models/userModel'
import { notificationService } from '~/services/notificationService'
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

import { BrevoProvider } from '~/providers/BrevoProvider'

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

    const duration = data.duration || job?.interviewConfig?.duration || 60
    const scheduledAt = data.scheduledAt

    // Kiểm tra trùng lịch (Overlap Checking)
    const overlapInterview = await interviewModel.checkOverlap(application.workerId, enterpriseId, scheduledAt, duration)
    if (overlapInterview) {
      const isEnterpriseOverlap = overlapInterview.enterpriseId === String(enterpriseId)
      const message = isEnterpriseOverlap 
        ? 'Khung giờ này doanh nghiệp đã có một lịch phỏng vấn khác!' 
        : 'Khung giờ này ứng viên đang vướng lịch phỏng vấn khác!'
      throw new ApiError(StatusCodes.CONFLICT, message)
    }

    const meetingType = data.meetingType || job?.interviewConfig?.meetingType || 'google_meet'
    let meetingLink = data.meetingLink || ''

    // Tự động tạo link Jitsi Meet
    if (meetingType === 'google_meet' && !meetingLink) {
      const uniqueSuffix = data.applicationId.toString().slice(-6) + '-' + Date.now().toString().slice(-4)
      meetingLink = `https://meet.jit.si/Restart35-Interview-${uniqueSuffix}`
    }

    const interviewData = {
      applicationId: data.applicationId,
      jobId: data.jobId,
      workerId: application.workerId,
      enterpriseId,
      scheduledAt,
      duration,
      meetingType,
      meetingLink,
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

    // Notify worker
    try {
      const worker = await userModel.findOneById(application.workerId)
      const enterprise = await userModel.findOneById(enterpriseId)

      await notificationService.createUserNotification({
        recipientId: application.workerId.toString(),
        senderId: enterpriseId.toString(),
        type: 'INTERVIEW_SCHEDULED',
        title: 'Lịch phỏng vấn mới',
        message: `Bạn có một lịch phỏng vấn mới từ ${job.enterpriseInfo?.name || job.enterprise?.name || 'doanh nghiệp'} cho vị trí ${job.job?.title || job.title}`,
        link: `/my/interviews`,
        entityType: 'INTERVIEW',
        entityId: result.insertedId.toString()
      })

      // Send Email with Calendar Invite (.ics) to worker
      if (worker?.email) {
        const jobTitle = job.job?.title || job.title || 'Vị trí ứng tuyển'
        const enterpriseName = job.enterpriseInfo?.name || job.enterprise?.name || 'doanh nghiệp'
        const startIcs = new Date(scheduledAt).toISOString().replace(/-|:|\.\d+/g, '')
        const endIcs = new Date(scheduledAt + duration * 60 * 1000).toISOString().replace(/-|:|\.\d+/g, '')

        const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Restart-35//NONSGML v1.0//EN
BEGIN:VEVENT
UID:${result.insertedId}@restart35.com
DTSTAMP:${new Date().toISOString().replace(/-|:|\.\d+/g, '')}
DTSTART:${startIcs}
DTEND:${endIcs}
SUMMARY:Phỏng vấn: ${jobTitle}
DESCRIPTION:Lời mời phỏng vấn từ ${enterpriseName}. Link họp: ${meetingLink || 'Chưa có link'}
LOCATION:${meetingLink || interviewData.officeAddress || 'Trực tuyến'}
END:VEVENT
END:VCALENDAR`

        const htmlContent = `
          <h2>Xin chào ${worker.firstName || 'Ứng viên'},</h2>
          <p>Bạn đã được mời tham gia phỏng vấn cho vị trí <strong>${jobTitle}</strong> tại <strong>${enterpriseName}</strong>.</p>
          <p><strong>Thời gian:</strong> ${new Date(scheduledAt).toLocaleString('vi-VN')}</p>
          ${meetingLink ? `<p><strong>Link cuộc họp (Jitsi Meet):</strong> <a href="${meetingLink}">${meetingLink}</a></p>` : ''}
          ${interviewData.officeAddress ? `<p><strong>Địa điểm:</strong> ${interviewData.officeAddress}</p>` : ''}
          <p>Vui lòng kiểm tra file đính kèm để thêm lịch vào Google Calendar / Outlook của bạn.</p>
          <br/>
          <p>Trân trọng,</p>
          <p>Hệ thống Restart-35</p>
        `

        const attachment = {
          name: 'invite.ics',
          content: Buffer.from(icsContent).toString('base64')
        }

        await BrevoProvider.sendEmail(worker.email, `[Restart-35] Lời mời phỏng vấn: ${jobTitle}`, htmlContent, attachment)
      }
    } catch (notifErr) {
      console.error('Lỗi khi tạo thông báo/email lịch phỏng vấn cho ứng viên:', notifErr)
    }

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
      
      const job = await recruitmentJobModel.findOneById(result.jobId)
      const enterprise = await userModel.findOneById(enterpriseId)
      try {
        await notificationService.createUserNotification({
          recipientId: result.workerId.toString(),
          senderId: enterpriseId.toString(),
          type: 'APPLICATION_REJECTED',
          title: 'Kết quả phỏng vấn',
          message: `Rất tiếc, bạn không trúng tuyển cho vị trí ${job?.job?.title || job?.title} tại ${enterprise?.organization?.name || enterprise?.displayName || 'Doanh nghiệp'}`,
          link: `/my/interviews/${result._id.toString()}`,
          entityType: 'INTERVIEW',
          entityId: result._id.toString()
        })
      } catch (err) { console.error('Notification error', err) }
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

      try {
        await notificationService.createUserNotification({
          recipientId: result.workerId.toString(),
          senderId: enterpriseId.toString(),
          type: 'APPLICATION_HIRED',
          title: 'Kết quả phỏng vấn',
          message: `Chúc mừng! Bạn đã trúng tuyển vị trí ${job?.job?.title || job?.title} tại ${enterprise?.organization?.name || enterprise?.displayName || 'Doanh nghiệp'}`,
          link: `/my/interviews/${result._id.toString()}`,
          entityType: 'INTERVIEW',
          entityId: result._id.toString()
        })
      } catch (err) { console.error('Notification error', err) }
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
