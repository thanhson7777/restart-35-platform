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
 * - GET  /career-path/cached  - Lấy career path từ cache
 * - POST /career-path/generate - Trigger generation career path
 * - DELETE /career-path/cache - Xóa cache career path
 */

import express from 'express'
import { aiController } from '~/controllers/aiController'
import { authMiddleware } from '~/middlewares/authMiddleware'

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

// ============================================================================
// CAREER TRANSITIONS ROUTES (35+)
// ============================================================================

/**
 * @route   POST /v1/ai/career-transitions
 * @desc    Lấy gợi ý chuyển đổi nghề nghiệp cho lao động 35+
 * @access  Private (requires auth)
 * @body    { age, current_role, current_industry, experience_years, skills, barriers, work_history, ... }
 */
Router.post('/career-transitions', aiController.getCareerTransitions)

/**
 * @route   GET /v1/ai/career-transitions/urgency
 * @desc    Lấy mức độ khẩn cấp chuyển đổi nghề theo tuổi (35+)
 * @access  Public
 * @query   age - Tuổi người dùng (18-70)
 */
Router.get('/career-transitions/urgency', aiController.getTransitionsUrgency)

/**
 * @route   GET /v1/ai/career-transitions/industries
 * @desc    Lấy danh sách ngành nghề được hỗ trợ cho chuyển đổi (35+)
 * @access  Public
 */
Router.get('/career-transitions/industries', aiController.getTransitionsIndustries)

/**
 * @route   GET /v1/ai/career-transitions/skills
 * @desc    Lấy skill gaps cho một ngành cụ thể (35+)
 * @access  Public
 * @query   industry - Ngành cần xem skill gaps (e.g., co_khi, ban_hang)
 */
Router.get('/career-transitions/skills', aiController.getTransitionsSkills)

// ============================================================================
// CACHED CAREER PATH ROUTES
// ============================================================================

/**
 * @route   GET /v1/ai/career-path/cached
 * @desc    Lấy career path từ cache (Redis -> MongoDB)
 * @access  Private (requires auth)
 */
Router.get(
  '/career-path/cached',
  authMiddleware.isAuthorized,
  aiController.getCachedCareerPath
)

/**
 * @route   POST /v1/ai/career-path/generate
 * @desc    Trigger generation career path mới
 * @access  Private (requires auth)
 * @body    { age, currentRole, currentIndustry, experiences, ... }
 */
Router.post(
  '/career-path/generate',
  authMiddleware.isAuthorized,
  aiController.triggerCareerPathGeneration
)

/**
 * @route   DELETE /v1/ai/career-path/cache
 * @desc    Xóa cache career path (khi profile thay đổi)
 * @access  Private (requires auth)
 */
Router.delete(
  '/career-path/cache',
  authMiddleware.isAuthorized,
  aiController.invalidateCareerPathCache
)

// ============================================================================
// RAG (RETRIEVAL-AUGMENTED GENERATION) ROUTES
// ============================================================================

/**
 * @route   POST /v1/ai/rag/career-recommendation
 * @desc    Trigger RAG-based career recommendation
 * @access  Private (requires auth)
 * @body    { profile: {...} }
 */
Router.post(
  '/rag/career-recommendation',
  authMiddleware.isAuthorized,
  aiController.triggerRAGCareerRecommendation
)

/**
 * @route   GET /v1/ai/rag/career-recommendation
 * @desc    Get cached RAG recommendation for user
 * @access  Private (requires auth)
 */
Router.get(
  '/rag/career-recommendation',
  authMiddleware.isAuthorized,
  aiController.getCachedRAGRecommendation
)

/**
 * @route   DELETE /v1/ai/rag/cache
 * @desc    Xóa cache RAG recommendation (khi profile thay đổi)
 * @access  Private (requires auth)
 */
Router.delete(
  '/rag/cache',
  authMiddleware.isAuthorized,
  aiController.invalidateRAGCache
)

/**
 * @route   POST /v1/ai/rag/career-recommendation/refresh
 * @desc    Refresh RAG recommendation
 * @access  Private (requires auth)
 * @body    { profile: {...} }
 */
Router.post(
  '/rag/career-recommendation/refresh',
  authMiddleware.isAuthorized,
  aiController.refreshRAGRecommendation
)

/**
 * @route   GET /v1/ai/rag/sources
 * @desc    Get available RAG data sources
 * @access  Public
 */
Router.get('/rag/sources', aiController.getRAGSources)

/**
 * @route   GET /v1/ai/rag/health
 * @desc    Get RAG system health status
 * @access  Public
 */
Router.get('/rag/health', aiController.getRAGHealth)

/**
 * @route   POST /v1/ai/rag/startup-suggestions
 * @desc    Get RAG-based startup suggestions
 * @access  Private (requires auth)
 * @body    { profile: {...}, budget: "50-100 triệu" }
 */
Router.post(
  '/rag/startup-suggestions',
  authMiddleware.isAuthorized,
  aiController.getRAGStartupSuggestions
)

/**
 * @route   POST /v1/ai/rag/skills-gap
 * @desc    Get RAG-based skills gap analysis
 * @access  Private (requires auth)
 * @body    { profile: {...} }
 */
Router.post(
  '/rag/skills-gap',
  authMiddleware.isAuthorized,
  aiController.getRAGSkillsGap
)

// ============================================================================
// ESCO SKILL GAP ROUTES
// ============================================================================

/**
 * @route   POST /v1/ai/skill-gap/esco
 * @desc    Get ESCO-based skill gap analysis
 * @access  Private
 * @body    { user_skills: string[], target_occupation: string, age: number, max_gaps: number }
 */
Router.post(
  '/skill-gap/esco',
  authMiddleware.isAuthorized,
  aiController.analyzeEscoSkillGaps
)

/**
 * @route   GET /v1/ai/skill-gap/health
 * @desc    Get ESCO skill gap service health
 * @access  Public
 */
Router.get('/skill-gap/health', aiController.getSkillGapHealth)

// ============================================================================
// FEDERATED CAREER ANALYSIS ROUTES (Phase 3)
// ============================================================================

/**
 * @route   POST /v1/ai/career/analyze-full
 * @desc    Federated career analysis (RAG + Skill Gap combined)
 * @access  Private
 * @body    { user_profile: {...}, options: {...} }
 */
Router.post(
  '/career/analyze-full',
  authMiddleware.isAuthorized,
  aiController.federatedCareerAnalysis
)

export const aiRoute = Router