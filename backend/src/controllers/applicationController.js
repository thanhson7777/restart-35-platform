import { StatusCodes } from 'http-status-codes'
import { applicationService } from '~/services/applicationService'

// ============ WORKER: APPLY ============

const applyToJob = async (req, res, next) => {
  try {
    const result = await applicationService.applyToJob(req.params.jobId, req.user._id, req.body)
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Ứng tuyển thành công!',
      data: result
    })
  } catch (error) { next(error) }
}

const getMyApplications = async (req, res, next) => {
  try {
    const { page, limit, status } = req.query
    const filters = {}
    if (status) filters.status = status

    const result = await applicationService.getMyApplications(req.user._id, page, limit, filters)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách đơn ứng tuyển thành công!',
      data: result.applications,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

const getMyApplicationById = async (req, res, next) => {
  try {
    const result = await applicationService.getMyApplicationById(req.params.id, req.user._id)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy chi tiết đơn ứng tuyển thành công!',
      data: result
    })
  } catch (error) { next(error) }
}

const withdrawApplication = async (req, res, next) => {
  try {
    await applicationService.withdrawApplication(req.params.id, req.user._id)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Đã rút đơn ứng tuyển thành công!'
    })
  } catch (error) { next(error) }
}

// ============ ENTERPRISE: MANAGE APPLICATIONS ============

const getApplications = async (req, res, next) => {
  try {
    const { page, limit, status, jobId, search } = req.query
    const filters = {}
    if (status) filters.status = status
    if (jobId) filters.jobId = jobId
    if (search) filters.search = search

    const result = await applicationService.getApplications(req.user._id, page, limit, filters)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách đơn ứng tuyển thành công!',
      data: result.applications,
      pagination: result.pagination,
      stats: result.stats
    })
  } catch (error) { next(error) }
}

const getApplicationById = async (req, res, next) => {
  try {
    const result = await applicationService.getApplicationById(req.params.id, req.user._id)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy chi tiết đơn ứng tuyển thành công!',
      data: result
    })
  } catch (error) { next(error) }
}

const getWorkerProfile = async (req, res, next) => {
  try {
    const result = await applicationService.getWorkerProfile(req.params.id, req.user._id)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thông tin ứng viên thành công!',
      data: result
    })
  } catch (error) { next(error) }
}

const updateApplicationStatus = async (req, res, next) => {
  try {
    const result = await applicationService.updateApplicationStatus(
      req.params.id,
      req.user._id,
      req.body.status,
      req.body.note
    )
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cập nhật trạng thái đơn ứng tuyển thành công!',
      data: result
    })
  } catch (error) { next(error) }
}

const shortlistApplication = async (req, res, next) => {
  try {
    const result = await applicationService.shortlistApplication(
      req.params.id,
      req.user._id,
      req.body.reason
    )
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Đã chọn ứng viên vào danh sách phỏng vấn!',
      data: result
    })
  } catch (error) { next(error) }
}

const rejectApplication = async (req, res, next) => {
  try {
    const result = await applicationService.rejectApplication(
      req.params.id,
      req.user._id,
      req.body.reason
    )
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Đã từ chối ứng viên!',
      data: result
    })
  } catch (error) { next(error) }
}

const getApplicationInterview = async (req, res, next) => {
  try {
    const result = await applicationService.getApplicationInterview(req.params.id, req.user._id)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thông tin phỏng vấn thành công!',
      data: result
    })
  } catch (error) { next(error) }
}

export const applicationController = {
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
  getApplicationInterview
}
