import { applicationModel } from '~/models/applicationModel'
import { recruitmentJobModel } from '~/models/recruitmentJobModel'
import { workerProfileModel } from '~/models/workerProfileModel'
import { userModel } from '~/models/userModel'
import { notificationService } from '~/services/notificationService'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import {
  DEFAULT_PAGE,
  DEFAULT_ITEM_PER_PAGE,
  RECRUITMENT_APPLICATION_STATUS,
  RECRUITMENT_JOB_STATUS,
  USER_ROLES
} from '~/utils/constants'

// ============ WORKER: APPLY ============

// Ứng tuyển vào job
const applyToJob = async (jobId, workerId, data = {}) => {
  try {
    // Kiểm tra job tồn tại và đã publish
    const job = await recruitmentJobModel.findOneById(jobId)
    if (!job) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy tin tuyển dụng!')
    }

    if (job.status !== RECRUITMENT_JOB_STATUS.PUBLISHED) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Tin tuyển dụng không còn nhận đơn!')
    }

    // Kiểm tra deadline
    if (job.deadline) {
      const deadlineDate = new Date(job.deadline);
      deadlineDate.setHours(23, 59, 59, 999);
      if (deadlineDate < new Date()) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Tin tuyển dụng đã hết hạn nộp đơn!')
      }
    }

    // Kiểm tra worker đã ứng tuyển chưa
    const hasApplied = await applicationModel.checkExistingApplication(jobId, workerId)
    if (hasApplied) {
      throw new ApiError(StatusCodes.CONFLICT, 'Bạn đã ứng tuyển tin này rồi!')
    }

    // Kiểm tra worker tồn tại
    const worker = await userModel.findOneById(workerId)
    if (!worker || worker.role !== USER_ROLES.WORKER) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Chỉ người lao động mới được ứng tuyển!')
    }

    const applicationData = {
      jobId,
      workerId,
      enterpriseId: job.enterpriseId,
      status: RECRUITMENT_APPLICATION_STATUS.NEW,
      source: data.source || 'direct',
      coverLetter: data.coverLetter || '',
      notes: data.notes || ''
    }

    const result = await applicationModel.createNew(applicationData)

    // Increment application count on job
    await recruitmentJobModel.incrementStats(jobId, 'applications')

    const application = await applicationModel.findOneById(result.insertedId)

    // Notify enterprise
    try {
      await notificationService.createUserNotification({
        recipientId: job.enterpriseId.toString(),
        senderId: workerId.toString(),
        type: 'NEW_APPLICATION',
        title: 'Có ứng viên mới',
        message: `Một ứng viên vừa ứng tuyển vào vị trí ${job.job?.title || job.title || 'của bạn'}`,
        link: `/enterprise/applications/${result.insertedId.toString()}`,
        entityType: 'APPLICATION',
        entityId: result.insertedId.toString()
      })
    } catch (notifErr) {
      console.error('Lỗi khi tạo thông báo cho doanh nghiệp:', notifErr)
    }

    return application
  } catch (error) { throw error }
}

// Lấy danh sách đơn đã nộp của worker
const getMyApplications = async (workerId, page = DEFAULT_PAGE, limit = DEFAULT_ITEM_PER_PAGE, filters = {}) => {
  try {
    page = parseInt(page, 10)
    limit = parseInt(limit, 10)
    const skip = (page - 1) * limit
    const { applications, total } = await applicationModel.findByWorker(workerId, skip, limit, filters)

    return {
      applications,
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error) { throw error }
}

// Lấy chi tiết đơn của worker
const getMyApplicationById = async (applicationId, workerId) => {
  try {
    const application = await applicationModel.findOneByIdAndWorker(applicationId, workerId)
    if (!application) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn ứng tuyển!')
    }

    return application
  } catch (error) { throw error }
}

// Rút đơn ứng tuyển
const withdrawApplication = async (applicationId, workerId) => {
  try {
    const result = await applicationModel.withdraw(applicationId, workerId)
    return result
  } catch (error) { throw error }
}

// ============ ENTERPRISE: MANAGE APPLICATIONS ============

// Lấy danh sách đơn của enterprise
const getApplications = async (enterpriseId, page = DEFAULT_PAGE, limit = DEFAULT_ITEM_PER_PAGE, filters = {}) => {
  try {
    page = parseInt(page, 10)
    limit = parseInt(limit, 10)
    const skip = (page - 1) * limit
    const { applications, total } = await applicationModel.findByEnterprise(enterpriseId, skip, limit, filters)

    // Enrich data with worker and job info
    const enrichedApplications = await Promise.all(
      applications.map(async (app) => {
        const worker = await userModel.findOneById(app.workerId)
        const job = await recruitmentJobModel.findOneById(app.jobId)
        return {
          ...app,
          worker: worker ? {
            _id: worker._id,
            name: worker.displayName || worker.username || 'Ứng viên',
            email: worker.email,
            avatar: worker.avatar
          } : null,
          job: job ? {
            _id: job._id,
            title: job.title || 'Vị trí công việc'
          } : null
        }
      })
    )

    // Calculate stats
    const db = await import('~/config/mongodb').then(m => m.GET_DB())
    const matchQuery = { 
      enterpriseId: { $in: [enterpriseId, enterpriseId.toString()] },
      _destroy: { $ne: true } 
    }
    if (filters.jobId) matchQuery.jobId = filters.jobId

    const rawStats = await db.collection(applicationModel.APPLICATION_COLLECTION_NAME).aggregate([
      { $match: matchQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray()

    const statusCounts = {
      new: 0,
      reviewing: 0,
      shortlisted: 0,
      interview_scheduled: 0,
      interviewed: 0,
      offered: 0,
      hired: 0,
      rejected: 0,
      withdrawn: 0,
      all: 0
    }

    rawStats.forEach(item => {
      statusCounts[item._id] = item.count
      statusCounts.all += item.count
    })

    const stats = {
      all: statusCounts.all,
      new: statusCounts.new,
      reviewing: statusCounts.reviewing + statusCounts.shortlisted,
      interviewing: statusCounts.interview_scheduled + statusCounts.interviewed,
      hired: statusCounts.hired + statusCounts.offered,
      rejected: statusCounts.rejected + statusCounts.withdrawn
    }

    return {
      applications: enrichedApplications,
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit)
      },
      stats
    }
  } catch (error) { throw error }
}

// Lấy chi tiết đơn
const getApplicationById = async (applicationId, enterpriseId) => {
  try {
    const application = await applicationModel.findOneByIdAndEnterprise(applicationId, enterpriseId)
    if (!application) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn ứng tuyển!')
    }

    return application
  } catch (error) { throw error }
}

// Lấy worker profile để enterprise xem
const getWorkerProfile = async (applicationId, enterpriseId) => {
  try {
    const application = await applicationModel.findOneByIdAndEnterprise(applicationId, enterpriseId)
    if (!application) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn ứng tuyển!')
    }

    // Lấy user info
    const user = await userModel.findOneById(application.workerId)
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy người dùng!')
    }

    // Lấy worker profile
    const workerProfile = await workerProfileModel.findOneByUserId(application.workerId)

    return {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar
      },
      profile: workerProfile
    }
  } catch (error) { throw error }
}

// Cập nhật trạng thái đơn
const updateApplicationStatus = async (applicationId, enterpriseId, newStatus, note = null) => {
  try {
    const application = await applicationModel.findOneByIdAndEnterprise(applicationId, enterpriseId)
    if (!application) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn ứng tuyển!')
    }

    const result = await applicationModel.updateStatus(applicationId, newStatus, enterpriseId, note)
    return result
  } catch (error) { throw error }
}

// Shortlist ứng viên
const shortlistApplication = async (applicationId, enterpriseId, reason = null) => {
  try {
    const result = await applicationModel.shortlist(applicationId, enterpriseId, reason)

    // Increment shortlisted count on job
    await recruitmentJobModel.incrementStats(result.jobId, 'shortlisted')

    return result
  } catch (error) { throw error }
}

// Từ chối ứng viên
const rejectApplication = async (applicationId, enterpriseId, reason = null) => {
  try {
    const result = await applicationModel.rejectApplication(applicationId, enterpriseId, reason)
    return result
  } catch (error) { throw error }
}

// Lấy interview của một application
const getApplicationInterview = async (applicationId, enterpriseId) => {
  try {
    const application = await applicationModel.findOneByIdAndEnterprise(applicationId, enterpriseId)
    if (!application) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn ứng tuyển!')
    }

    if (!application.interviewId) {
      return null
    }

    const { interviewModel } = await import('~/models/interviewModel')
    const interview = await interviewModel.findByApplication(applicationId)
    return interview
  } catch (error) { throw error }
}

// ============ GET APPLICATION WITH JOB INFO ============

// Lấy đơn kèm thông tin job
const getApplicationWithJob = async (applicationId) => {
  try {
    const application = await applicationModel.findOneById(applicationId)
    if (!application) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn ứng tuyển!')
    }

    const job = await recruitmentJobModel.findOneById(application.jobId)

    return {
      ...application,
      job: job
    }
  } catch (error) { throw error }
}

const getEnterpriseApplicationStats = async () => {
  return await applicationModel.getEnterpriseApplicationStats()
}

const getAllApplicationsAdmin = async (queryParams) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      jobId,
      workerId,
      enterpriseId,
      search,
      sortBy = 'appliedAt',
      sortOrder = 'desc'
    } = queryParams

    const currentPage = parseInt(page, 10) || 1
    const recordLimit = parseInt(limit, 10) || 10
    const skip = (currentPage - 1) * recordLimit

    const filters = {}
    if (status) filters.status = status
    if (jobId) filters.jobId = jobId
    if (workerId) filters.workerId = workerId
    if (enterpriseId) filters.enterpriseId = enterpriseId

    const result = await applicationModel.findAll(skip, recordLimit, filters, sortBy, sortOrder)

    // Enrich data
    const enrichedApplications = await Promise.all(
      result.applications.map(async (app) => {
        const worker = await userModel.findOneById(app.workerId)
        const job = await recruitmentJobModel.findOneById(app.jobId)
        const enterprise = await userModel.findOneById(app.enterpriseId)
        return {
          ...app,
          worker: worker ? {
            _id: worker._id,
            displayName: worker.displayName || worker.name || worker.username || 'Ứng viên',
            name: worker.displayName || worker.name || worker.username || 'Ứng viên',
            email: worker.email,
            avatar: worker.avatar
          } : {
            _id: app.workerId,
            displayName: 'Tài khoản đã xóa',
            name: 'Tài khoản đã xóa',
            email: 'Không có dữ liệu',
            avatar: null
          },
          job: job ? {
            _id: job._id,
            title: job?.job?.title || 'Vị trí công việc'
          } : null,
          enterprise: enterprise ? {
            _id: enterprise._id,
            displayName: job?.enterpriseInfo?.name || enterprise.displayName || enterprise.name || enterprise.username || 'Doanh nghiệp',
            name: job?.enterpriseInfo?.name || enterprise.displayName || enterprise.name || enterprise.username || 'Doanh nghiệp',
            email: enterprise.email
          } : null
        }
      })
    )

    const db = await import('~/config/mongodb').then(m => m.GET_DB())
    const rawStats = await db.collection(applicationModel.APPLICATION_COLLECTION_NAME).aggregate([
      { $match: { _destroy: { $ne: true } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray()

    const statusCounts = {
      new: 0,
      reviewing: 0,
      shortlisted: 0,
      interview_scheduled: 0,
      hired: 0,
      rejected: 0,
      withdrawn: 0
    }

    rawStats.forEach(item => {
      statusCounts[item._id] = item.count
    })
    
    const stats = {
      total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
      processing: statusCounts.new + statusCounts.reviewing + statusCounts.shortlisted + statusCounts.interview_scheduled + statusCounts.interviewed,
      approved: statusCounts.hired + statusCounts.offered,
      rejected: statusCounts.rejected + statusCounts.withdrawn
    }

    return {
      applications: enrichedApplications,
      pagination: {
        totalRecords: result.totalApplications,
        totalPages: Math.ceil(result.totalApplications / recordLimit),
        currentPage,
        limit: recordLimit
      },
      stats
    }
  } catch (error) { throw error }
}

export const applicationService = {
  // Worker
  applyToJob,
  getMyApplications,
  getMyApplicationById,
  withdrawApplication,

  // Enterprise
  getApplications,
  getApplicationById,
  getWorkerProfile,
  updateApplicationStatus,
  shortlistApplication,
  rejectApplication,
  getApplicationInterview,

  // Common
  getApplicationWithJob,

  // Admin
  getEnterpriseApplicationStats,
  getAllApplicationsAdmin
}
