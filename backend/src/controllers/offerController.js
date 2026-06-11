import { StatusCodes } from 'http-status-codes'
import { offerService } from '~/services/offerService'

// ============ ENTERPRISE: OFFER MANAGEMENT ============

const createOffer = async (req, res, next) => {
  try {
    const result = await offerService.createOffer(req.user._id, req.body)
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Tạo offer thành công!',
      data: result
    })
  } catch (error) { next(error) }
}

const getOffers = async (req, res, next) => {
  try {
    const { page, limit, status, applicationId, jobId } = req.query
    const filters = {}
    if (status) filters.status = status
    if (applicationId) filters.applicationId = applicationId
    if (jobId) filters.jobId = jobId

    const result = await offerService.getOffers(req.user._id, page, limit, filters)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách offers thành công!',
      data: result.offers,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

const getOfferById = async (req, res, next) => {
  try {
    const result = await offerService.getOfferById(req.params.id, req.user._id, 'enterprise')
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy chi tiết offer thành công!',
      data: result
    })
  } catch (error) { next(error) }
}

const withdrawOffer = async (req, res, next) => {
  try {
    const result = await offerService.withdrawOffer(req.params.id, req.user._id)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Đã thu hồi offer!',
      data: result
    })
  } catch (error) { next(error) }
}

// ============ WORKER: OFFER RESPONSE ============

const getMyOffers = async (req, res, next) => {
  try {
    const { page, limit, status } = req.query
    const filters = {}
    if (status) filters.status = status

    const result = await offerService.getMyOffers(req.user._id, page, limit, filters)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách offers thành công!',
      data: result.offers,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

const getMyOfferById = async (req, res, next) => {
  try {
    const result = await offerService.getMyOfferById(req.params.id, req.user._id)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy chi tiết offer thành công!',
      data: result
    })
  } catch (error) { next(error) }
}

const acceptOffer = async (req, res, next) => {
  try {
    const result = await offerService.acceptOffer(req.params.id, req.user._id, req.body.responseNote)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Chúc mừng bạn đã được nhận việc!',
      data: result
    })
  } catch (error) { next(error) }
}

const rejectOffer = async (req, res, next) => {
  try {
    const result = await offerService.rejectOffer(req.params.id, req.user._id, req.body.reason)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Đã từ chối offer!',
      data: result
    })
  } catch (error) { next(error) }
}

// ============ PENDING OFFERS ============

const getPendingOffers = async (req, res, next) => {
  try {
    const result = await offerService.getPendingOffers(req.user._id)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách offers đang chờ thành công!',
      data: result
    })
  } catch (error) { next(error) }
}

// ============ STATS ============

const getEnterpriseStats = async (req, res, next) => {
  try {
    const result = await offerService.getEnterpriseStats(req.user._id)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thống kê offers thành công!',
      data: result
    })
  } catch (error) { next(error) }
}

export const offerController = {
  // Enterprise
  createOffer,
  getOffers,
  getOfferById,
  withdrawOffer,
  getEnterpriseStats,

  // Worker
  getMyOffers,
  getMyOfferById,
  acceptOffer,
  rejectOffer,

  // Common
  getPendingOffers
}
