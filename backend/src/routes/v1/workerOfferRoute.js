import express from 'express'
import { offerController } from '~/controllers/offerController'
import { offerValidation } from '~/validations/offerValidation'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

// Lấy danh sách offers của worker
Router.get('/',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedWorker,
  offerValidation.validateGetOffers,
  offerController.getMyOffers
)

// Lấy chi tiết offer
Router.get('/:id',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedWorker,
  offerValidation.checkId,
  offerController.getMyOfferById
)

// Chấp nhận offer
Router.post('/:id/accept',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedWorker,
  offerValidation.checkId,
  offerValidation.validateAcceptOffer,
  offerController.acceptOffer
)

// Từ chối offer
Router.post('/:id/reject',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedWorker,
  offerValidation.checkId,
  offerValidation.validateRejectOffer,
  offerController.rejectOffer
)

// Lấy offers đang chờ
Router.get('/pending/list',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedWorker,
  offerController.getPendingOffers
)

export const workerOfferRoute = Router
