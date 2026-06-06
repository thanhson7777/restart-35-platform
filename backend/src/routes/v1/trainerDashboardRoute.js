import express from 'express'
import { trainerDashboardController } from '~/controllers/trainerDashboardController'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { partnershipValidation } from '~/validations/partnershipValidation'

const Router = express.Router()

Router.get('/partnerships', authMiddleware.isAuthorized, authMiddleware.isAuthorizedTrainer, partnershipValidation.queryPartnerships, trainerDashboardController.getPartnerships)
Router.get('/partnerships/:id', authMiddleware.isAuthorized, authMiddleware.isAuthorizedTrainer, partnershipValidation.checkId, trainerDashboardController.getPartnershipDetail)
Router.get('/partnerships/:id/stats', authMiddleware.isAuthorized, authMiddleware.isAuthorizedTrainer, partnershipValidation.checkId, trainerDashboardController.getPartnershipStats)
Router.get('/enterprise-students', authMiddleware.isAuthorized, authMiddleware.isAuthorizedTrainer, trainerDashboardController.getEnterpriseStudents)

export const trainerDashboardRoute = Router
