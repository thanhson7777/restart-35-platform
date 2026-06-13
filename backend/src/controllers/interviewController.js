import { StatusCodes } from 'http-status-codes'
import { interviewService } from '~/services/interviewService'

// ============ ENTERPRISE: INTERVIEW MANAGEMENT ============

const createInterview = async (req, res, next) => {
  try {
    const result = await interviewService.createInterview(req.user._id, req.body)
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Tạo lịch phỏng vấn thành công!',
      data: result
    })
  } catch (error) { next(error) }
}

const getInterviews = async (req, res, next) => {
  try {
    const { page, limit, status, applicationId, jobId, fromDate, toDate } = req.query
    const filters = {}
    if (status) {
      filters.status = status.includes(',') ? { $in: status.split(',') } : status
    }
    if (applicationId) filters.applicationId = applicationId
    if (jobId) filters.jobId = jobId
    if (fromDate) filters.scheduledAt = { $gte: new Date(fromDate) }
    if (toDate) {
      filters.scheduledAt = { ...filters.scheduledAt, $lte: new Date(toDate) }
    }

    const result = await interviewService.getInterviews(req.user._id, page, limit, filters)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách phỏng vấn thành công!',
      data: result.interviews,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

const getInterviewById = async (req, res, next) => {
  try {
    const result = await interviewService.getInterviewById(req.params.id, req.user._id, 'enterprise')
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy chi tiết phỏng vấn thành công!',
      data: result
    })
  } catch (error) { next(error) }
}

const rescheduleInterview = async (req, res, next) => {
  try {
    const result = await interviewService.rescheduleInterview(
      req.params.id,
      req.user._id,
      req.body.scheduledAt,
      req.body.reason
    )
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Đã hoãn lịch phỏng vấn!',
      data: result
    })
  } catch (error) { next(error) }
}

const updateInterview = async (req, res, next) => {
  try {
    const result = await interviewService.updateInterview(req.params.id, req.user._id, req.body)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cập nhật lịch phỏng vấn thành công!',
      data: result
    })
  } catch (error) { next(error) }
}

const cancelInterview = async (req, res, next) => {
  try {
    const result = await interviewService.cancelInterview(req.params.id, req.user._id, req.body.reason)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Đã hủy lịch phỏng vấn!',
      data: result
    })
  } catch (error) { next(error) }
}

const completeInterview = async (req, res, next) => {
  try {
    const result = await interviewService.completeInterview(req.params.id, req.user._id, req.body)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Đã hoàn thành phỏng vấn!',
      data: result
    })
  } catch (error) { next(error) }
}

const markNoShow = async (req, res, next) => {
  try {
    const result = await interviewService.markNoShow(req.params.id, req.user._id)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Đã đánh dấu ứng viên không đến!',
      data: result
    })
  } catch (error) { next(error) }
}

// ============ WORKER: INTERVIEW MANAGEMENT ============

const getMyInterviews = async (req, res, next) => {
  try {
    const { page, limit, status } = req.query
    const filters = {}
    if (status) {
      filters.status = status.includes(',') ? { $in: status.split(',') } : status
    }

    const result = await interviewService.getMyInterviews(req.user._id, page, limit, filters)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách phỏng vấn thành công!',
      data: result.interviews,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

const getMyInterviewById = async (req, res, next) => {
  try {
    const result = await interviewService.getMyInterviewById(req.params.id, req.user._id)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy chi tiết phỏng vấn thành công!',
      data: result
    })
  } catch (error) { next(error) }
}

const confirmInterview = async (req, res, next) => {
  try {
    const result = await interviewService.confirmInterview(req.params.id, req.user._id)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Đã xác nhận tham gia phỏng vấn!',
      data: result
    })
  } catch (error) { next(error) }
}

const requestReschedule = async (req, res, next) => {
  try {
    const result = await interviewService.requestReschedule(
      req.params.id,
      req.user._id,
      req.body.reason,
      req.body.newPreferredTime
    )
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Đã gửi yêu cầu hoãn lịch phỏng vấn!',
      data: result
    })
  } catch (error) { next(error) }
}

// ============ UPCOMING ============

const getUpcomingInterviews = async (req, res, next) => {
  try {
    const { page, limit } = req.query
    const role = req.user.role === 'enterprise' ? 'enterprise' : 'worker'
    const result = await interviewService.getUpcomingInterviews(req.user._id, role, page, limit)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách phỏng vấn sắp tới thành công!',
      data: result.interviews,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

// ============ STATS ============

const getEnterpriseStats = async (req, res, next) => {
  try {
    const result = await interviewService.getEnterpriseStats(req.user._id)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thống kê phỏng vấn thành công!',
      data: result
    })
  } catch (error) { next(error) }
}

export const interviewController = {
  // Enterprise
  createInterview,
  getInterviews,
  getInterviewById,
  rescheduleInterview,
  updateInterview,
  cancelInterview,
  completeInterview,
  markNoShow,
  getEnterpriseStats,

  // Worker
  getMyInterviews,
  getMyInterviewById,
  confirmInterview,
  requestReschedule,

  // Common
  getUpcomingInterviews
}
