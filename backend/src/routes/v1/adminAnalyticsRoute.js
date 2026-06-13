import express from 'express'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { adminAnalyticsController } from '~/controllers/adminAnalyticsController'

const router = express.Router()

// Ensure only admin can access these routes
router.use(authMiddleware.isAuthorized)
router.use(authMiddleware.isAuthorizedAdmin)

router.get('/kpis', adminAnalyticsController.getKPIs)
router.get('/user-growth', adminAnalyticsController.getUserGrowth)
router.get('/roles-distribution', adminAnalyticsController.getRolesDistribution)
router.get('/learning-progress', adminAnalyticsController.getLearningProgress)
router.get('/application-funnel', adminAnalyticsController.getApplicationFunnel)
router.get('/application-status', adminAnalyticsController.getApplicationStatus)

export const adminAnalyticsRoute = router
