import { placementService } from '~/services/placementService'
import { StatusCodes } from 'http-status-codes'

// ============ CREATE ============
const createPlacement = async (req, res, next) => {
  try {
    const adminId = req.jwtDecoded._id.toString()
    const placement = await placementService.createPlacement(adminId, req.body)

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Tạo placement thành công!',
      data: placement
    })
  } catch (error) {
    next(error)
  }
}

// ============ READ ============
const getPlacements = async (req, res, next) => {
  try {
    const result = await placementService.getPlacements(req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách placements thành công!',
      data: result.placements,
      pagination: result.pagination
    })
  } catch (error) {
    next(error)
  }
}

const getMyPlacements = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id.toString()
    const result = await placementService.getMyPlacements(userId, req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy placements của tôi thành công!',
      data: result.placements,
      pagination: result.pagination
    })
  } catch (error) {
    next(error)
  }
}

const getPlacementById = async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.jwtDecoded._id.toString()
    const role = req.jwtDecoded.role

    const placement = await placementService.getPlacementById(id)
    const isOwner = placement.userId.toString() === userId
    const isAdmin = role === 'admin'

    if (!isOwner && !isAdmin) {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: 'Bạn không có quyền xem placement này!'
      })
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy chi tiết placement thành công!',
      data: placement
    })
  } catch (error) {
    next(error)
  }
}

// ============ UPDATE ============
const updatePlacement = async (req, res, next) => {
  try {
    const { id } = req.params
    const adminId = req.jwtDecoded._id.toString()

    const placement = await placementService.updatePlacement(id, req.body, adminId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cập nhật placement thành công!',
      data: placement
    })
  } catch (error) {
    next(error)
  }
}

const updatePlacementStatus = async (req, res, next) => {
  try {
    const { id } = req.params
    const adminId = req.jwtDecoded._id.toString()
    const { status, interviewDate, offerDetails, startedDate } = req.body

    const placement = await placementService.updatePlacementStatus(
      id,
      status,
      { interviewDate, offerDetails, startedDate },
      adminId
    )

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cập nhật trạng thái placement thành công!',
      data: placement
    })
  } catch (error) {
    next(error)
  }
}

const resignPlacement = async (req, res, next) => {
  try {
    const { id } = req.params
    const adminId = req.jwtDecoded._id.toString()
    const { resignationReason, resignationDate } = req.body

    const placement = await placementService.resignPlacement(
      id,
      adminId,
      resignationReason,
      resignationDate
    )

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Ghi nhận nghỉ việc thành công!',
      data: placement
    })
  } catch (error) {
    next(error)
  }
}

// ============ DELETE ============
const softDeletePlacement = async (req, res, next) => {
  try {
    const { id } = req.params
    const adminId = req.jwtDecoded._id.toString()

    await placementService.softDeletePlacement(id, adminId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Xóa placement thành công!'
    })
  } catch (error) {
    next(error)
  }
}

// ============ ANALYTICS ============
const getPlacementStats = async (req, res, next) => {
  try {
    const result = await placementService.getPlacementStats(req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thống kê placement thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const placementController = {
  createPlacement,
  getPlacements,
  getMyPlacements,
  getPlacementById,
  updatePlacement,
  updatePlacementStatus,
  resignPlacement,
  softDeletePlacement,
  getPlacementStats
}
