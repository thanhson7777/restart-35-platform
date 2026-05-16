import { applicationService } from '~/services/applicationService'
import { StatusCodes } from 'http-status-codes'
import { USER_ROLES } from '~/utils/constants'

// ============ WORKER ROUTES ============

// Lấy applications của worker
const getMyApplications = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const result = await applicationService.getMyApplications(userId, req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách đơn thành công!',
      data: result.applications,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

// Tạo application mới (draft)
const createApplication = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const application = await applicationService.createApplication(userId, req.body)

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Tạo đơn thành công!',
      data: application
    })
  } catch (error) { next(error) }
}

// Lấy chi tiết application
const getApplicationById = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const { id } = req.params
    const userRole = req.user.role

    const application = await applicationService.getApplicationById(id, userId, userRole)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thông tin đơn thành công!',
      data: application
    })
  } catch (error) { next(error) }
}

// Cập nhật application
const updateApplication = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const { id } = req.params

    const application = await applicationService.updateApplication(id, userId, req.body)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cập nhật đơn thành công!',
      data: application
    })
  } catch (error) { next(error) }
}

// Nộp đơn
const submitApplication = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const { id } = req.params

    const application = await applicationService.submitApplication(id, userId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Nộp đơn thành công!',
      data: application
    })
  } catch (error) { next(error) }
}

// Xóa application
const deleteApplication = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const { id } = req.params

    await applicationService.deleteApplication(id, userId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Xóa đơn thành công!'
    })
  } catch (error) { next(error) }
}

// Kháng cáo
const appealApplication = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const { id } = req.params
    const { reason } = req.body

    const application = await applicationService.appealApplication(id, userId, reason)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Gửi kháng cáo thành công!',
      data: application
    })
  } catch (error) { next(error) }
}

// ============ NGO ROUTES ============

// Lấy pending applications cho NGO
const getPendingApplications = async (req, res, next) => {
  try {
    const ngoId = req.user._id.toString()
    const result = await applicationService.getPendingApplications(ngoId, req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách đơn chờ duyệt thành công!',
      data: result.applications,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

// Lấy application để review
const getApplicationForReview = async (req, res, next) => {
  try {
    const ngoId = req.user._id.toString()
    const { id } = req.params

    const application = await applicationService.getApplicationById(id, ngoId, USER_ROLES.NGO)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thông tin đơn thành công!',
      data: application
    })
  } catch (error) { next(error) }
}

// Duyệt đơn
const approveApplication = async (req, res, next) => {
  try {
    const ngoId = req.user._id.toString()
    const { id } = req.params
    const { approvedAmount, reviewNotes } = req.body

    const application = await applicationService.approveApplication(id, ngoId, {
      approvedAmount,
      reviewNotes
    })

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Phê duyệt đơn thành công!',
      data: application
    })
  } catch (error) { next(error) }
}

// Từ chối đơn
const rejectApplication = async (req, res, next) => {
  try {
    const ngoId = req.user._id.toString()
    const { id } = req.params
    const { reason } = req.body

    if (!reason) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Vui lòng cung cấp lý do từ chối!'
      })
    }

    const application = await applicationService.rejectApplication(id, ngoId, reason)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Từ chối đơn thành công!',
      data: application
    })
  } catch (error) { next(error) }
}

// Xếp vào danh sách chờ
const waitlistApplication = async (req, res, next) => {
  try {
    const ngoId = req.user._id.toString()
    const { id } = req.params

    const application = await applicationService.waitlistApplication(id, ngoId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Thêm vào danh sách chờ thành công!',
      data: application
    })
  } catch (error) { next(error) }
}

// ============ ADMIN ROUTES ============

// Lấy tất cả applications
const getAllApplications = async (req, res, next) => {
  try {
    const result = await applicationService.getAllApplications(req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách đơn thành công!',
      data: result.applications,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

export const applicationController = {
  // Worker
  getMyApplications,
  createApplication,
  getApplicationById,
  updateApplication,
  submitApplication,
  deleteApplication,
  appealApplication,

  // NGO
  getPendingApplications,
  getApplicationForReview,
  approveApplication,
  rejectApplication,
  waitlistApplication,

  // Admin
  getAllApplications
}
