import { partnershipService } from '~/services/partnershipService'
import { StatusCodes } from 'http-status-codes'

const createPartnership = async (req, res, next) => {
  try {
    const enterpriseId = req.user._id.toString()
    const partnership = await partnershipService.createPartnership(enterpriseId, req.body)

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Tạo yêu cầu hợp tác thành công!',
      data: partnership
    })
  } catch (error) { next(error) }
}

const getPartnerships = async (req, res, next) => {
  try {
    const actorId = req.user._id.toString()
    const role = req.user.role
    const result = await partnershipService.getPartnerships(actorId, role, req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách partnership thành công!',
      data: result.partnerships,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

const getPartnershipById = async (req, res, next) => {
  try {
    const partnership = await partnershipService.getPartnershipById(
      req.params.id,
      req.user._id.toString(),
      req.user.role
    )

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy chi tiết partnership thành công!',
      data: partnership
    })
  } catch (error) { next(error) }
}

const respondPartnership = async (req, res, next) => {
  try {
    const partnership = await partnershipService.respondPartnership(
      req.params.id,
      req.user._id.toString(),
      req.body
    )

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Phản hồi partnership thành công!',
      data: partnership
    })
  } catch (error) { next(error) }
}

const confirmPartnership = async (req, res, next) => {
  try {
    const partnership = await partnershipService.confirmPartnership(
      req.params.id,
      req.user._id.toString(),
      req.user.role,
      req.body
    )

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Xác nhận partnership thành công!',
      data: partnership
    })
  } catch (error) { next(error) }
}

const cancelPartnership = async (req, res, next) => {
  try {
    const partnership = await partnershipService.cancelPartnership(
      req.params.id,
      req.user._id.toString(),
      req.user.role,
      req.body.reason
    )

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Hủy partnership thành công!',
      data: partnership
    })
  } catch (error) { next(error) }
}

const negotiatePartnership = async (req, res, next) => {
  try {
    const partnership = await partnershipService.negotiatePartnership(
      req.params.id,
      req.user._id.toString(),
      req.user.role,
      req.body
    )

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cập nhật đàm phán thành công!',
      data: partnership
    })
  } catch (error) { next(error) }
}

const getPartnershipGraduates = async (req, res, next) => {
  try {
    const result = await partnershipService.getPartnershipGraduates(
      req.params.id,
      req.user._id.toString(),
      req.user.role,
      req.query
    )

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách learner tốt nghiệp thành công!',
      data: result.graduates,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

const getPartnershipLearners = async (req, res, next) => {
  try {
    const result = await partnershipService.getPartnershipLearners(
      req.params.id,
      req.user._id.toString(),
      req.user.role,
      req.query
    )

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách learner thành công!',
      data: result.learners,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

const getPartnershipStats = async (req, res, next) => {
  try {
    const stats = await partnershipService.getPartnershipStats(
      req.params.id,
      req.user._id.toString(),
      req.user.role
    )

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thống kê partnership thành công!',
      data: stats
    })
  } catch (error) { next(error) }
}

const expirePartnership = async (req, res, next) => {
  try {
    const partnership = await partnershipService.expirePartnership(req.params.id)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Đánh dấu partnership hết hạn thành công!',
      data: partnership
    })
  } catch (error) { next(error) }
}

export const partnershipController = {
  createPartnership,
  getPartnerships,
  getPartnershipById,
  respondPartnership,
  confirmPartnership,
  cancelPartnership,
  negotiatePartnership,
  getPartnershipGraduates,
  getPartnershipLearners,
  getPartnershipStats,
  expirePartnership
}
