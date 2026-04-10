/**
 * AI Route - Định nghĩa routes cho AI Service
 *
 * Các endpoint:
 * - GET  /health              - Health check AI Service
 * - POST /recommend-jobs      - Gợi ý việc làm dựa trên skills
 * - GET  /jobs                - Lấy danh sách jobs
 * - GET  /jobs/:id            - Lấy chi tiết một job
 * - POST /predict-risk        - Dự đoán rủi ro thất nghiệp
 * - POST /analyze-worker      - Phân tích tổng hợp người lao động
 * - GET  /feature-importance  - Lấy feature importance
 * - GET  /model-info          - Lấy thông tin model
 */

import express from 'express'
import { aiController } from '~/controllers/aiController'

const Router = express.Router()

/**
 * @route   GET /v1/ai/health
 * @desc    Health check AI Service
 * @access  Public
 */
Router.get('/health', aiController.healthCheck)

/**
 * @route   POST /v1/ai/recommend-jobs
 * @desc    Gợi ý việc làm cho user dựa trên kỹ năng
 * @access  Private (requires auth)
 * @body    { skills: string[], experience: number, ... }
 */
Router.post('/recommend-jobs', aiController.recommendJobs)

/**
 * @route   GET /v1/ai/jobs
 * @desc    Lấy danh sách tất cả jobs
 * @access  Public
 * @query   limit - Số lượng jobs tối đa (default: 50)
 */
Router.get('/jobs', aiController.getAllJobs)

/**
 * @route   GET /v1/ai/jobs/:id
 * @desc    Lấy thông tin chi tiết một job
 * @access  Public
 * @param   id - Job ID (e.g., job_0001)
 */
Router.get('/jobs/:id', aiController.getJobById)

/**
 * @route   POST /v1/ai/predict-risk
 * @desc    Dự đoán rủi ro thất nghiệp của người lao động
 * @access  Private (requires auth)
 * @body    Worker data including age, skills, experience, etc.
 */
Router.post('/predict-risk', aiController.predictRisk)

/**
 * @route   POST /v1/ai/analyze-worker
 * @desc    Phân tích tổng hợp người lao động (risk + recommendations)
 * @access  Private (requires auth)
 * @body    Worker data for comprehensive analysis
 */
Router.post('/analyze-worker', aiController.analyzeWorker)

/**
 * @route   GET /v1/ai/feature-importance
 * @desc    Lấy thông tin feature importance từ model
 * @access  Public
 */
Router.get('/feature-importance', aiController.getFeatureImportance)

/**
 * @route   GET /v1/ai/model-info
 * @desc    Lấy thông tin model đang được sử dụng
 * @access  Public
 */
Router.get('/model-info', aiController.getModelInfo)

export const aiRoute = Router