import express from 'express'
import { enterpriseDashboardController } from '~/controllers/enterpriseDashboardController'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

Router.get('/overview', authMiddleware.isAuthorized, authMiddleware.isAuthorizedEnterprise, enterpriseDashboardController.getOverview)
Router.get('/recruitment', authMiddleware.isAuthorized, authMiddleware.isAuthorizedEnterprise, enterpriseDashboardController.getRecruitment)
Router.get('/sponsorship', authMiddleware.isAuthorized, authMiddleware.isAuthorizedEnterprise, enterpriseDashboardController.getSponsorship)
Router.get('/partnerships', authMiddleware.isAuthorized, authMiddleware.isAuthorizedEnterprise, enterpriseDashboardController.getPartnerships)

export const enterpriseDashboardRoute = Router
