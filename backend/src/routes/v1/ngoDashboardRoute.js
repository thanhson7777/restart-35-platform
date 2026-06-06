import express from 'express'
import { ngoDashboardController } from '~/controllers/ngoDashboardController'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

Router.get('/overview', authMiddleware.isAuthorized, authMiddleware.isAuthorizedNGO, ngoDashboardController.getOverview)
Router.get('/sponsorship', authMiddleware.isAuthorized, authMiddleware.isAuthorizedNGO, ngoDashboardController.getSponsorship)
Router.get('/impact', authMiddleware.isAuthorized, authMiddleware.isAuthorizedNGO, ngoDashboardController.getImpact)

export const ngoDashboardRoute = Router
