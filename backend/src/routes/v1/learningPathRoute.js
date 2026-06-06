/**
 * Learning Path Routes
 */

import express from 'express'
import { getJobLearningPathController } from '~/controllers/learningPathController'

const router = express.Router()

// GET /v1/jobs/:id/learning-path
router.get('/:id/learning-path', getJobLearningPathController)

export const learningPathRoute = router
