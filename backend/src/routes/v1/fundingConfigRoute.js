import express from 'express'
import { fundingConfigValidation } from '~/validators/fundingConfigValidation'
import { fundingConfigController } from '~/controllers/fundingConfigController'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

// ============ PUBLIC ROUTES ============

// Lấy danh sách funding configs
Router.get(
  '/',
  fundingConfigController.getFundingConfigs
)

// Lấy funding config theo khóa học
Router.get(
  '/:courseId',
  fundingConfigValidation.checkCourseId,
  fundingConfigController.getFundingConfigByCourse
)

// Tính phí theo hình thức thanh toán
Router.get(
  '/:courseId/calculate',
  fundingConfigValidation.checkCourseId,
  fundingConfigValidation.calculateFunding,
  fundingConfigController.calculateFunding
)

// ============ ADMIN ROUTES ============

// Tạo funding config
Router.post(
  '/',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedAdmin,
  fundingConfigValidation.createFundingConfig,
  fundingConfigController.createFundingConfig
)

// Cập nhật funding config
Router.put(
  '/:courseId',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedAdmin,
  fundingConfigValidation.checkCourseId,
  fundingConfigValidation.updateFundingConfig,
  fundingConfigController.updateFundingConfig
)

// Xóa funding config
Router.delete(
  '/:courseId',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedAdmin,
  fundingConfigValidation.checkCourseId,
  fundingConfigController.deleteFundingConfig
)

export const fundingConfigRoute = Router
