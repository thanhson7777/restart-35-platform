import express from 'express'
import { partnershipController } from '~/controllers/partnershipController'
import { partnershipValidation } from '~/validations/partnershipValidation'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

Router.post(
  '/',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedEnterprise,
  partnershipValidation.createPartnership,
  partnershipController.createPartnership
)

Router.get(
  '/',
  authMiddleware.isAuthorized,
  partnershipValidation.queryPartnerships,
  partnershipController.getPartnerships
)

Router.get(
  '/:id',
  authMiddleware.isAuthorized,
  partnershipValidation.checkId,
  partnershipController.getPartnershipById
)

Router.put(
  '/:id/respond',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedTrainer,
  partnershipValidation.checkId,
  partnershipValidation.respondPartnership,
  partnershipController.respondPartnership
)

Router.put(
  '/:id/confirm',
  authMiddleware.isAuthorized,
  partnershipValidation.checkId,
  partnershipValidation.confirmPartnership,
  partnershipController.confirmPartnership
)

Router.put(
  '/:id/cancel',
  authMiddleware.isAuthorized,
  partnershipValidation.checkId,
  partnershipValidation.cancelPartnership,
  partnershipController.cancelPartnership
)

Router.put(
  '/:id/negotiate',
  authMiddleware.isAuthorized,
  partnershipValidation.checkId,
  partnershipValidation.negotiatePartnership,
  partnershipController.negotiatePartnership
)

Router.get(
  '/:id/graduates',
  authMiddleware.isAuthorized,
  partnershipValidation.checkId,
  partnershipController.getPartnershipGraduates
)

Router.get(
  '/:id/learners',
  authMiddleware.isAuthorized,
  partnershipValidation.checkId,
  partnershipController.getPartnershipLearners
)

Router.get(
  '/:id/stats',
  authMiddleware.isAuthorized,
  partnershipValidation.checkId,
  partnershipController.getPartnershipStats
)

Router.put(
  '/:id/expire',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedAdmin,
  partnershipValidation.checkId,
  partnershipValidation.expirePartnership,
  partnershipController.expirePartnership
)

export const partnershipRoute = Router
