import express from 'express'
import { offerController } from '~/controllers/offerController'
import { offerValidation } from '~/validations/offerValidation'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

// ============ ENTERPRISE ROUTES ============

// Tạo offer
Router.post('/',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedEnterprise,
  offerValidation.validateCreateOffer,
  offerController.createOffer
)

// Lấy danh sách offers
Router.get('/',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedEnterprise,
  offerValidation.validateGetOffers,
  offerController.getOffers
)

// Lấy chi tiết offer
Router.get('/:id',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedEnterprise,
  offerValidation.checkId,
  offerController.getOfferById
)

// Thu hồi offer
Router.post('/:id/withdraw',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedEnterprise,
  offerValidation.checkId,
  offerValidation.validateWithdrawOffer,
  offerController.withdrawOffer
)

// Lấy thống kê
Router.get('/stats/summary',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedEnterprise,
  offerController.getEnterpriseStats
)

export const offerRoute = Router
