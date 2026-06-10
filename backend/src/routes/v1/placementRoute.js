import express from 'express'
import { placementValidation } from '~/validators/placementValidation'
import { placementController } from '~/controllers/placementController'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

// ============ WORKER ROUTES ============

// Placements của tôi
Router.get(
  '/my',
  authMiddleware.isAuthorized,
  placementController.getMyPlacements
)

// ============ TRAINER / ADMIN ROUTES ============

// Danh sách placements (filter)
Router.get(
  '/',
  authMiddleware.isAuthorizedTrainerOrAdmin,
  placementController.getPlacements
)

// Thống kê success rate
Router.get(
  '/analytics/success-rate',
  authMiddleware.isAuthorizedAdmin,
  placementController.getPlacementStats
)

// Tạo placement
Router.post(
  '/',
  authMiddleware.isAuthorizedTrainerOrAdmin,
  placementValidation.createPlacement,
  placementController.createPlacement
)

// ============ SHARED ROUTES (Owner + Trainer + Admin) ============

// Chi tiết placement
Router.get(
  '/:id',
  authMiddleware.isAuthorized,
  placementValidation.checkPlacementId,
  placementController.getPlacementById
)

// Gửi feedback cho placement
Router.post(
  '/:id/feedback',
  authMiddleware.isAuthorized,
  placementValidation.checkPlacementId,
  placementController.givePlacementFeedback
)

// Cập nhật thông tin placement
Router.put(
  '/:id',
  authMiddleware.isAuthorizedTrainerOrAdmin,
  placementValidation.checkPlacementId,
  placementValidation.updatePlacement,
  placementController.updatePlacement
)

// Cập nhật trạng thái placement
Router.put(
  '/:id/status',
  authMiddleware.isAuthorizedTrainerOrAdmin,
  placementValidation.checkPlacementId,
  placementValidation.updatePlacementStatus,
  placementController.updatePlacementStatus
)

// Ghi nhận nghỉ việc
Router.put(
  '/:id/resign',
  authMiddleware.isAuthorizedAdmin,
  placementValidation.checkPlacementId,
  placementValidation.resignPlacement,
  placementController.resignPlacement
)

// Xóa mềm placement
Router.delete(
  '/:id',
  authMiddleware.isAuthorizedAdmin,
  placementValidation.checkPlacementId,
  placementController.softDeletePlacement
)

export const placementRoute = Router
