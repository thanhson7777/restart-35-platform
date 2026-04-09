/**
 * AI Route - Định nghĩa routes cho AI Service
 */

import express from 'express'
import { aiController } from '~/controllers/aiController'

const Router = express.Router()

// Health check
Router.get('/health', aiController.healthCheck)

// Gợi ý việc làm
Router.post('/recommend-jobs', aiController.recommendJobs)

// Lấy danh sách jobs
Router.get('/jobs', aiController.getAllJobs)

// Lấy chi tiết một job
Router.get('/jobs/:id', aiController.getJobById)

export const aiRoute = Router