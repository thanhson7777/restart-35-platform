/**
 * AI Route - Định nghĩa routes cho AI Service
 *
 * Các endpoint:
 * - GET  /health              - Health check AI Service
 * - POST /recommend-jobs      - Gợi ý việc làm dựa trên skills
 * - GET  /jobs                - Lấy danh sách jobs
 * - GET  /jobs/:id            - Lấy chi tiết một job
 * - GET  /jobs/:id/similar    - Tìm jobs tương tự
 * - POST /predict-risk        - Dự đoán rủi ro thất nghiệp
 * - POST /analyze-worker      - Phân tích tổng hợp người lao động
 * - GET  /feature-importance  - Lấy feature importance
 * - GET  /model-info          - Lấy thông tin model
 * - GET  /semantic-status     - Kiểm tra trạng thái semantic search
 * - POST /career-path        - Khám phá lộ trình sự nghiệp
 * - GET  /career-path/urgency - Mức độ khẩn cấp chuyển đổi nghề
 * - GET  /career-path/industries - Danh sách ngành nghề hỗ trợ
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
 * @query   location - Tỉnh/TP mong muốn
 * @query   jobType - Loại công việc (full-time, part-time, temporary, freelance)
 * @query   salaryMin - Mức lương tối thiểu (VND)
 * @query   salaryMax - Mức lương tối đa (VND)
 * @query   postedWithin - Jobs đăng trong N ngày (1, 3, 7, 30)
 * @query   skills - Lọc theo kỹ năng (comma-separated)
 * @query   matchMin - Match score tối thiểu (0-100)
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
 * @route   GET /v1/ai/jobs/:id/similar
 * @desc    Tìm jobs tương tự dựa trên semantic search
 * @access  Public
 * @param   id - Job ID
 * @query   limit - Số lượng kết quả (default: 5)
 */
Router.get('/jobs/:id/similar', aiController.getSimilarJobs)

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

/**
 * @route   GET /v1/ai/semantic-status
 * @desc    Kiểm tra trạng thái semantic search
 * @access  Public
 */
Router.get('/semantic-status', aiController.getSemanticStatus)

// ============================================================================
// CAREER PATH ROUTES
// ============================================================================

/**
 * @route   POST /v1/ai/career-path
 * @desc    Khám phá lộ trình sự nghiệp
 * @access  Private (requires auth)
 * @body    { age, currentRole, currentIndustry, experiences, ... }
 */
Router.post('/career-path', aiController.discoverCareerPath)

/**
 * @route   GET /v1/ai/career-path/urgency
 * @desc    Lấy mức độ khẩn cấp chuyển đổi nghề theo tuổi
 * @access  Public
 * @query   age - Tuổi người dùng
 */
Router.get('/career-path/urgency', aiController.getAgeUrgency)

/**
 * @route   GET /v1/ai/career-path/industries
 * @desc    Lấy danh sách các ngành nghề được hỗ trợ
 * @access  Public
 */
Router.get('/career-path/industries', aiController.getCareerIndustries)

export const aiRoute = Router