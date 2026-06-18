import { recruitmentJobModel } from '~/models/recruitmentJobModel'
import { applicationModel } from '~/models/applicationModel'
import { userModel } from '~/models/userModel'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import {
  DEFAULT_PAGE,
  DEFAULT_ITEM_PER_PAGE,
  RECRUITMENT_JOB_STATUS,
  USER_ROLES
} from '~/utils/constants'

// ============ ENTERPRISE: JOB CRUD ============

// Tạo tin tuyển dụng mới
const createJob = async (enterpriseId, data) => {
  try {
    const user = await userModel.findOneById(enterpriseId)
    if (!user || user.role !== USER_ROLES.ENTERPRISE) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Chỉ doanh nghiệp mới được tạo tin tuyển dụng!')
    }

    const { organizationModel } = await import('~/models/organizationModel')
    const organization = await organizationModel.findOneById(user.organizationId)
    
    if (!organization) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Không tìm thấy thông tin tổ chức/doanh nghiệp!')
    }

    // Kiểm tra thời hạn gói
    if (organization.subscriptionEndDate && Date.now() > organization.subscriptionEndDate) {
      throw new ApiError(StatusCodes.PAYMENT_REQUIRED, 'Gói dịch vụ của bạn đã hết hạn. Vui lòng gia hạn để tiếp tục đăng tin.')
    }

    // Lazy Reset Quota
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
    let usedQuota = organization.currentMonthUsedJobQuota || 0
    let monthlyQuota = organization.monthlyJobQuota || 0

    if (organization.quotaMonth !== currentMonth) {
      usedQuota = 0
    }

    if (usedQuota >= monthlyQuota && monthlyQuota > 0) {
      // If monthlyQuota is 0, we assume it's free/unlimited or maybe we should block it?
      // Usually monthlyQuota=0 means no package, so we should block.
      throw new ApiError(StatusCodes.PAYMENT_REQUIRED, 'Bạn đã hết hạn mức đăng tin trong tháng. Vui lòng nâng cấp gói.')
    } else if (monthlyQuota === 0) {
      throw new ApiError(StatusCodes.PAYMENT_REQUIRED, 'Bạn chưa có gói dịch vụ nào hoặc gói đã hết hạn mức. Vui lòng nâng cấp gói.')
    }

    const jobData = {
      enterpriseId,
      enterpriseInfo: {
        name: user.organization?.name || user.name || 'Doanh nghiệp',
        logo: user.organization?.logo || '',
        industry: user.organization?.industry || '',
        size: user.organization?.size || '',
        verified: user.organization?.verified || false
      },
      job: {
        title: data.title,
        description: data.description,
        requirements: data.requirements || [],
        benefits: data.benefits || [],
        salary: data.salary || {},
        type: data.type,
        quantity: data.quantity || 1,
        gender: data.gender || 'any',
        ageRange: data.ageRange || {},
        workingHours: data.workingHours || '',
        category: data.category || ''
      },
      requirements: {
        education: data.education || '',
        experience: data.experience || 0,
        skills: data.skills || [],
        certifications: data.certifications || [],
        languages: data.languages || []
      },
      location: {
        address: data.address,
        province: data.province,
        district: data.district || '',
        ward: data.ward || '',
        type: data.locationType || 'onsite',
        coordinates: data.coordinates || {}
      },
      interviewConfig: {
        meetingType: data.meetingType || 'google_meet',
        officeAddress: data.officeAddress || '',
        onlineLink: '',
        duration: data.interviewDuration || 60,
        allowReschedule: data.allowReschedule !== false,
        maxReschedules: data.maxReschedules || 2,
        reminderMinutes: data.reminderMinutes || 60,
        suggestedSlots: data.suggestedSlots || []
      },
      targetCourses: data.targetCourses || [],
      hiringBonus: {
        enabled: data.hiringBonus?.enabled || false,
        amount: data.hiringBonus?.amount || null,
        payoutCondition: data.hiringBonus?.payoutCondition || null
      },
      deadline: data.deadline || null,
      status: RECRUITMENT_JOB_STATUS.DRAFT,
      stats: {
        views: 0,
        applications: 0,
        shortlisted: 0,
        interviews: 0,
        hires: 0
      }
    }

    const result = await recruitmentJobModel.createNew(jobData)
    const job = await recruitmentJobModel.findOneById(result.insertedId)

    if (organization.quotaMonth !== currentMonth) {
      await organizationModel.resetAndIncrementQuota(organization._id, currentMonth)
    } else {
      await organizationModel.incrementQuotaUsage(organization._id)
    }

    return job
  } catch (error) { throw error }
}

// Cập nhật tin tuyển dụng
const updateJob = async (jobId, enterpriseId, data) => {
  try {
    const job = await recruitmentJobModel.findOneByIdAndEnterprise(jobId, enterpriseId)
    if (!job) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy tin tuyển dụng!')
    }

    if (job.status === RECRUITMENT_JOB_STATUS.PUBLISHED) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Không thể chỉnh sửa tin đã đăng!')
    }

    const updateData = {}

    if (data.title) {
      updateData.job = { ...job.job, title: data.title }
    }
    if (data.description) {
      updateData.job = { ...updateData.job || job.job, description: data.description }
    }
    if (data.type) {
      updateData.job = { ...updateData.job || job.job, type: data.type }
    }
    if (data.quantity) {
      updateData.job = { ...updateData.job || job.job, quantity: data.quantity }
    }
    if (data.requirements !== undefined) {
      updateData.job = { ...updateData.job || job.job, requirements: data.requirements }
    }
    if (data.benefits !== undefined) {
      updateData.job = { ...updateData.job || job.job, benefits: data.benefits }
    }
    if (data.salary !== undefined) {
      updateData.job = { ...updateData.job || job.job, salary: data.salary }
    }
    if (data.gender !== undefined) {
      updateData.job = { ...updateData.job || job.job, gender: data.gender }
    }
    if (data.ageRange !== undefined) {
      updateData.job = { ...updateData.job || job.job, ageRange: data.ageRange }
    }
    if (data.workingHours !== undefined) {
      updateData.job = { ...updateData.job || job.job, workingHours: data.workingHours }
    }
    if (data.category !== undefined) {
      updateData.job = { ...updateData.job || job.job, category: data.category }
    }

    if (data.education !== undefined) {
      updateData.requirements = { ...job.requirements, education: data.education }
    }
    if (data.experience !== undefined) {
      updateData.requirements = { ...updateData.requirements || job.requirements, experience: data.experience }
    }
    if (data.skills !== undefined) {
      updateData.requirements = { ...updateData.requirements || job.requirements, skills: data.skills }
    }
    if (data.certifications !== undefined) {
      updateData.requirements = { ...updateData.requirements || job.requirements, certifications: data.certifications }
    }
    if (data.languages !== undefined) {
      updateData.requirements = { ...updateData.requirements || job.requirements, languages: data.languages }
    }

    if (data.address || data.province) {
      updateData.location = {
        ...job.location,
        address: data.address || job.location.address,
        province: data.province || job.location.province,
        district: data.district !== undefined ? data.district : job.location.district,
        ward: data.ward !== undefined ? data.ward : job.location.ward,
        type: data.locationType || job.location.type,
        coordinates: data.coordinates || job.location.coordinates
      }
    }

    if (data.interviewConfig) {
      updateData.interviewConfig = { ...job.interviewConfig, ...data.interviewConfig }
    }
    if (data.targetCourses !== undefined) {
      updateData.targetCourses = data.targetCourses
    }
    if (data.hiringBonus !== undefined) {
      updateData.hiringBonus = { ...job.hiringBonus, ...data.hiringBonus }
    }
    if (data.deadline !== undefined) {
      updateData.deadline = data.deadline
    }

    const updated = await recruitmentJobModel.update(jobId, updateData)
    return updated
  } catch (error) { throw error }
}

// Lấy danh sách tin của enterprise
const getJobs = async (enterpriseId, page = DEFAULT_PAGE, limit = DEFAULT_ITEM_PER_PAGE, filters = {}) => {
  try {
    page = parseInt(page, 10)
    limit = parseInt(limit, 10)
    const skip = (page - 1) * limit
    const { jobs, total } = await recruitmentJobModel.findByEnterprise(enterpriseId, skip, limit, filters)

    return {
      jobs,
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error) { throw error }
}

// Lấy chi tiết tin tuyển dụng
const getJobById = async (jobId, enterpriseId = null) => {
  try {
    let job
    if (enterpriseId) {
      job = await recruitmentJobModel.findOneByIdAndEnterprise(jobId, enterpriseId)
    } else {
      job = await recruitmentJobModel.findOneById(jobId)
    }

    if (!job) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy tin tuyển dụng!')
    }

    // Increment views if published
    if (job.status === RECRUITMENT_JOB_STATUS.PUBLISHED) {
      await recruitmentJobModel.incrementStats(jobId, 'views')
    }

    return job
  } catch (error) { throw error }
}

// Xóa tin tuyển dụng
const deleteJob = async (jobId, enterpriseId) => {
  try {
    const result = await recruitmentJobModel.deleteJob(jobId, enterpriseId)
    return result
  } catch (error) { throw error }
}

// Gửi tin để duyệt
const submitForApproval = async (jobId, enterpriseId) => {
  try {
    const job = await recruitmentJobModel.findOneByIdAndEnterprise(jobId, enterpriseId)
    if (!job) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy tin tuyển dụng!')
    }

    if (!job.job?.title || !job.job?.description || !job.location?.address || !job.job?.type) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Vui lòng điền đầy đủ thông tin bắt buộc!')
    }

    const result = await recruitmentJobModel.submitForApproval(jobId, enterpriseId)
    return result
  } catch (error) { throw error }
}

// Đóng tin tuyển dụng
const closeJob = async (jobId, enterpriseId) => {
  try {
    const result = await recruitmentJobModel.closeJob(jobId, enterpriseId)
    return result
  } catch (error) { throw error }
}

// Lấy danh sách ứng viên của tin
const getJobApplications = async (jobId, enterpriseId, page = DEFAULT_PAGE, limit = DEFAULT_ITEM_PER_PAGE, filters = {}) => {
  try {
    page = parseInt(page, 10)
    limit = parseInt(limit, 10)
    const job = await recruitmentJobModel.findOneByIdAndEnterprise(jobId, enterpriseId)
    if (!job) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy tin tuyển dụng!')
    }

    const skip = (page - 1) * limit
    const { applications, total } = await applicationModel.findByJob(jobId, enterpriseId, skip, limit, filters)

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

// Lấy stats của tin
const getJobStats = async (jobId, enterpriseId) => {
  try {
    const job = await recruitmentJobModel.findOneByIdAndEnterprise(jobId, enterpriseId)
    if (!job) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy tin tuyển dụng!')
    }

    const stats = await recruitmentJobModel.getStats(jobId)
    return stats
  } catch (error) { throw error }
}

// ============ ADMIN: JOB APPROVAL ============

// Lấy danh sách tin chờ duyệt
const getPendingJobs = async (page = DEFAULT_PAGE, limit = DEFAULT_ITEM_PER_PAGE, filters = {}) => {
  try {
    page = parseInt(page, 10)
    limit = parseInt(limit, 10)
    const skip = (page - 1) * limit
    const { jobs, total } = await recruitmentJobModel.findPendingApproval(skip, limit, filters)

    return {
      jobs,
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error) { throw error }
}

// Lấy chi tiết tin để duyệt
const getJobForReview = async (jobId) => {
  try {
    const job = await recruitmentJobModel.findOneById(jobId)
    if (!job) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy tin tuyển dụng!')
    }

    if (job.status !== RECRUITMENT_JOB_STATUS.PENDING_APPROVAL) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Tin không ở trạng thái chờ duyệt!')
    }

    return job
  } catch (error) { throw error }
}

// Duyệt tin
const approveJob = async (jobId) => {
  try {
    const result = await recruitmentJobModel.approveJob(jobId)
    return result
  } catch (error) { throw error }
}

// Từ chối tin
const rejectJob = async (jobId, reason) => {
  try {
    if (!reason) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Vui lòng cung cấp lý do từ chối!')
    }

    const result = await recruitmentJobModel.rejectJob(jobId, reason)
    return result
  } catch (error) { throw error }
}

// Lấy danh sách tin bị từ chối của enterprise
const getRejectedJobs = async (enterpriseId, page = DEFAULT_PAGE, limit = DEFAULT_ITEM_PER_PAGE) => {
  try {
    page = parseInt(page, 10)
    limit = parseInt(limit, 10)
    const skip = (page - 1) * limit
    const { jobs, total } = await recruitmentJobModel.findRejected(enterpriseId, skip, limit)

    return {
      jobs,
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error) { throw error }
}

// ============ PUBLIC: JOB BOARD ============

// Lấy danh sách tin đã publish
const getPublishedJobs = async (page = DEFAULT_PAGE, limit = DEFAULT_ITEM_PER_PAGE, filters = {}) => {
  try {
    page = parseInt(page, 10)
    limit = parseInt(limit, 10)
    const skip = (page - 1) * limit
    const { jobs, total } = await recruitmentJobModel.findPublished(skip, limit, filters)

    return {
      jobs,
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error) { throw error }
}

// Lấy chi tiết tin public
const getPublicJobById = async (jobId) => {
  try {
    const job = await recruitmentJobModel.findOneById(jobId)
    if (!job) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy tin tuyển dụng!')
    }

    if (job.status !== RECRUITMENT_JOB_STATUS.PUBLISHED) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Tin tuyển dụng không tồn tại!')
    }

    // Increment views
    await recruitmentJobModel.incrementStats(jobId, 'views')

    // Remove enterprise internal info for public view
    const publicJob = { ...job }
    delete publicJob.interviewConfig

    return publicJob
  } catch (error) { throw error }
}

// Lấy dữ liệu map của các tin đã publish
const getMapData = async () => {
  try {
    const jobs = await recruitmentJobModel.findMapData()
    return jobs
  } catch (error) { throw error }
}

// Lấy việc làm tương tự
const getSimilarJobs = async (jobId, limit = 5) => {
  try {
    const job = await recruitmentJobModel.findOneById(jobId)
    if (!job) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy tin tuyển dụng!')
    }
    if (job.status !== RECRUITMENT_JOB_STATUS.PUBLISHED) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Tin tuyển dụng không tồn tại!')
    }

    const jobs = await recruitmentJobModel.findSimilar(jobId, {
      category: job.job?.category,
      province: job.location?.province,
      type: job.job?.type,
      limit
    })
    return jobs
  } catch (error) { throw error }
}

// Gợi ý việc làm cho worker dựa trên profile
const getRecommendedJobs = async (workerProfile = {}, page = DEFAULT_PAGE, limit = DEFAULT_ITEM_PER_PAGE) => {
  try {
    page = parseInt(page, 10)
    limit = parseInt(limit, 10)
    const skip = (page - 1) * limit
    const { jobs, total } = await recruitmentJobModel.findRecommended(
      workerProfile.skills || [],
      skip,
      limit
    )
    return {
      jobs,
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error) { throw error }
}

export const recruitmentJobService = {
  // Enterprise
  createJob,
  updateJob,
  getJobs,
  getJobById,
  deleteJob,
  submitForApproval,
  closeJob,
  getJobApplications,
  getJobStats,

  // Admin
  getPendingJobs,
  getJobForReview,
  approveJob,
  rejectJob,
  getRejectedJobs,

  // Public
  getPublishedJobs,
  getPublicJobById,
  getMapData,
  getSimilarJobs,
  getRecommendedJobs
}
