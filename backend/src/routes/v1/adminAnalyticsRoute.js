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
router.get('/dashboard-overview', adminAnalyticsController.getDashboardOverview)
router.get('/dashboard/users', adminAnalyticsController.getUsersAnalytics)
router.get('/dashboard/training', adminAnalyticsController.getTrainingAnalytics)
router.get('/dashboard/recruitment', adminAnalyticsController.getRecruitmentAnalytics)
router.get('/dashboard/finance', adminAnalyticsController.getFinancialAnalytics)
router.get('/dashboard/community', adminAnalyticsController.getCommunityAnalytics)
router.get('/export/excel', adminAnalyticsController.exportExcel)
router.get('/export/pdf', adminAnalyticsController.exportPdf)

export const adminAnalyticsRoute = router
