/**
 * Recommendation Feedback Routes
 */

import express from 'express'
import {
  trackFeedbackController,
  getMetricsController,
  getTimelineController,
  getTopCoursesController,
  getMyFeedbackController
} from '~/controllers/recommendationFeedbackController'

const router = express.Router()

// POST /v1/recommendation-feedback — track feedback (authenticated user)
router.post('/', trackFeedbackController)

// GET /v1/recommendation-feedback/me — user's own feedback history
router.get('/me', getMyFeedbackController)

// GET /v1/recommendation-feedback/metrics — aggregated metrics
router.get('/metrics', getMetricsController)

// GET /v1/recommendation-feedback/timeline — daily timeline
router.get('/timeline', getTimelineController)

// GET /v1/recommendation-feedback/top-courses — top courses
router.get('/top-courses', getTopCoursesController)

export const recommendationFeedbackRoute = router
