import express from 'express'
import { escoController } from '~/controllers/escoController'
import { authMiddleware } from '~/middlewares/authMiddleware'

const router = express.Router()

// Public routes (no auth required)
router.get('/search', escoController.search)
router.get('/occupation/popular', escoController.getPopular)
router.get('/occupation/:uri/skills', escoController.getOccupationSkills)
router.get('/occupation/:uri', escoController.getOccupation)
router.get('/sync/status', escoController.getSyncStatus)

// Protected routes (auth required)
router.post('/track', authMiddleware.isAuthorized, escoController.trackUsage)
router.post('/translate', authMiddleware.isAuthorized, escoController.createTranslationOverride)

// Admin routes
router.post('/sync', authMiddleware.isAuthorizedAdmin, escoController.syncData)

export const escoRoute = router
