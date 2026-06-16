import { StatusCodes } from 'http-status-codes'
import { recruitmentJobService } from '~/services/recruitmentJobService'
import { applicationService } from '~/services/applicationService'
import { GET_DB } from '~/config/mongodb'

// ============ ENTERPRISE: JOB CRUD ============

const createJob = async (req, res, next) => {
  try {
    const result = await recruitmentJobService.createJob(req.user._id, req.body)
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Tạo tin tuyển dụng thành công!',
      data: result
    })
  } catch (error) { next(error) }
}

const getJobs = async (req, res, next) => {
  try {
    const { page, limit, status, search } = req.query
    const filters = {}
    if (status) filters.status = status
    if (search) filters.search = search

    const result = await recruitmentJobService.getJobs(req.user._id, Number(page) || 1, Number(limit) || 20, filters)

    // Calculate global stats for tabs and overall counting
    const db = GET_DB()
    const rawJobStatus = await db.collection('recruitment_jobs').aggregate([
      { $match: { enterpriseId: { $in: [req.user._id, req.user._id.toString()] }, _destroy: { $ne: true } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray()

    const statusCounts = {
      draft: 0,
      pending_approval: 0,
      published: 0,
      closed: 0,
      expired: 0,
      total: 0
    }

    rawJobStatus.forEach(item => {
      statusCounts[item._id] = item.count
      statusCounts.total += item.count
    })

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách tin tuyển dụng thành công!',
      data: result.jobs,
      pagination: result.pagination,
      stats: statusCounts
    })
  } catch (error) { next(error) }
}

const getJobById = async (req, res, next) => {
  try {
    const result = await recruitmentJobService.getJobById(req.params.id, req.user._id)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy chi tiết tin tuyển dụng thành công!',
      data: result
    })
  } catch (error) { next(error) }
}

const updateJob = async (req, res, next) => {
  try {
    const result = await recruitmentJobService.updateJob(req.params.id, req.user._id, req.body)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cập nhật tin tuyển dụng thành công!',
      data: result
    })
  } catch (error) { next(error) }
}

const deleteJob = async (req, res, next) => {
  try {
    await recruitmentJobService.deleteJob(req.params.id, req.user._id)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Xóa tin tuyển dụng thành công!'
    })
  } catch (error) { next(error) }
}

const submitForApproval = async (req, res, next) => {
  try {
    const result = await recruitmentJobService.submitForApproval(req.params.id, req.user._id)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Đã gửi tin tuyển dụng để duyệt!',
      data: result
    })
  } catch (error) { next(error) }
}

const closeJob = async (req, res, next) => {
  try {
    const result = await recruitmentJobService.closeJob(req.params.id, req.user._id)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Đã đóng tin tuyển dụng!',
      data: result
    })
  } catch (error) { next(error) }
}

const getJobApplications = async (req, res, next) => {
  try {
    const { page, limit, status } = req.query
    const filters = {}
    if (status) filters.status = status

    const result = await recruitmentJobService.getJobApplications(req.params.id, req.user._id, page, limit, filters)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách ứng viên thành công!',
      data: result.applications,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

const getJobStats = async (req, res, next) => {
  try {
    const result = await recruitmentJobService.getJobStats(req.params.id, req.user._id)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thống kê tin tuyển dụng thành công!',
      data: result
    })
  } catch (error) { next(error) }
}

// ============ ADMIN: JOB APPROVAL ============

const getPendingJobs = async (req, res, next) => {
  try {
    const { page, limit } = req.query
    const result = await recruitmentJobService.getPendingJobs(page, limit)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách tin chờ duyệt thành công!',
      data: result.jobs,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

const getJobForReview = async (req, res, next) => {
  try {
    const result = await recruitmentJobService.getJobForReview(req.params.id)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy chi tiết tin tuyển dụng thành công!',
      data: result
    })
  } catch (error) { next(error) }
}

const approveJob = async (req, res, next) => {
  try {
    const result = await recruitmentJobService.approveJob(req.params.id)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Đã duyệt tin tuyển dụng!',
      data: result
    })
  } catch (error) { next(error) }
}

const rejectJob = async (req, res, next) => {
  try {
    const result = await recruitmentJobService.rejectJob(req.params.id, req.body.reason)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Đã từ chối tin tuyển dụng!',
      data: result
    })
  } catch (error) { next(error) }
}

const getRejectedJobs = async (req, res, next) => {
  try {
    const { page, limit } = req.query
    const result = await recruitmentJobService.getRejectedJobs(req.user._id, page, limit)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách tin bị từ chối thành công!',
      data: result.jobs,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

// ============ PUBLIC: JOB BOARD ============

const getPublishedJobs = async (req, res, next) => {
  try {
    const { page, limit, search, province, type, locationType } = req.query
    const filters = {}
    if (search) filters.search = search
    if (province) filters.province = province
    if (type) filters.type = type
    if (locationType) filters['location.type'] = locationType

    const result = await recruitmentJobService.getPublishedJobs(page, limit, filters)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách việc làm thành công!',
      data: result.jobs,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

const getPublicJobById = async (req, res, next) => {
  try {
    const result = await recruitmentJobService.getPublicJobById(req.params.id)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy chi tiết việc làm thành công!',
      data: result
    })
  } catch (error) { next(error) }
}

const getMapData = async (req, res, next) => {
  try {
    const result = await recruitmentJobService.getMapData()
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy dữ liệu map thành công!',
      data: result
    })
  } catch (error) { next(error) }
}

const getSimilarJobs = async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 5
    const result = await recruitmentJobService.getSimilarJobs(req.params.id, limit)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy việc làm tương tự thành công!',
      data: result
    })
  } catch (error) { next(error) }
}

const getRecommendedJobs = async (req, res, next) => {
  try {
    const { page, limit } = req.query
    // Build worker profile from query params (sent from frontend after fetching worker profile)
    const workerProfile = {
      skills: req.query.skills ? req.query.skills.split(',').map(s => s.trim()) : []
    }
    const result = await recruitmentJobService.getRecommendedJobs(
      workerProfile,
      Number(page) || 1,
      Number(limit) || 10
    )
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy việc làm gợi ý thành công!',
      data: result.jobs,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

const getEnterpriseApplicationStats = async (req, res, next) => {
  try {
    const stats = await applicationService.getEnterpriseApplicationStats()
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thống kê đơn ứng tuyển theo doanh nghiệp thành công!',
      data: stats
    })
  } catch (error) { next(error) }
}

const getAllApplicationsAdmin = async (req, res, next) => {
  try {
    const result = await applicationService.getAllApplicationsAdmin(req.query)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách đơn ứng tuyển thành công!',
      ...result
    })
  } catch (error) { next(error) }
}

export const recruitmentJobController = {
  // Enterprise
  createJob,
  getJobs,
  getJobById,
  updateJob,
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
  getEnterpriseApplicationStats,
  getAllApplicationsAdmin,

  // Public
  getPublishedJobs,
  getPublicJobById,
  getMapData,
  getSimilarJobs,
  getRecommendedJobs
}
