/**
 * AI APIs - Gọi Backend AI endpoints
 * Frontend -> Backend Node.js -> AI Service (Python FastAPI)
 */

import { authorizeAxiosInstance } from '~/utils/authorizeAxios'
import { API_ROOT } from '~/utils/constants'

// Base URL cho AI endpoints qua Backend
const AI_BASE_URL = `${API_ROOT}/v1/ai`

/**
 * Lấy danh sách công việc gợi ý cho user dựa trên kỹ năng
 *
 * @param {Object} params - Parameters
 * @param {string[]} params.skills - Danh sách skills của user (bắt buộc)
 * @param {number} params.experience - Số năm kinh nghiệm (default: 0)
 * @param {string} [params.location] - Tỉnh/thành phố mong muốn
 * @param {string} [params.targetJob] - Công việc mong muốn
 * @param {number} [params.targetSalary] - Mức lương mong muốn (VND)
 * @param {string} [params.preferredJobType] - Loại công việc ưa thích
 * @param {number} [params.limit] - Số lượng kết quả (default: 10, max: 50)
 * @returns {Promise<Object>} - Kết quả gợi ý việc làm { jobs[], total, filters_applied }
 */
export const getRecommendedJobsAPI = async ({
  skills,
  experience = 0,
  location = null,
  targetJob = null,
  targetSalary = null,
  preferredJobType = null,
  limit = 10
} = {}) => {
  // Validate required fields
  if (!skills || skills.length === 0) {
    throw new Error('Skills là bắt buộc để gợi ý việc làm')
  }

  const payload = {
    skills,
    experience: Math.floor(experience), // Convert float to int
    limit
  }

  // Chỉ thêm các optional fields nếu có giá trị
  if (location) payload.location = location
  if (targetJob) payload.target_job = targetJob
  if (targetSalary) payload.target_salary = targetSalary
  if (preferredJobType) payload.preferred_job_type = preferredJobType

  const response = await authorizeAxiosInstance.post(
    `${AI_BASE_URL}/recommend-jobs`,
    payload
  )
  return response.data
}

/**
 * Lấy danh sách tất cả jobs từ AI Service
 *
 * @param {number} limit - Số lượng jobs tối đa (default: 50, max: 100)
 * @returns {Promise<Object>} - Danh sách jobs { jobs[], total }
 */
export const getAllJobsAPI = async (limit = 50) => {
  const response = await authorizeAxiosInstance.get(
    `${AI_BASE_URL}/jobs?limit=${limit}`
  )
  return response.data
}

/**
 * Lấy thông tin chi tiết một job
 *
 * @param {string} jobId - Job ID (vd: job_0001)
 * @returns {Promise<Object>} - Chi tiết job
 */
export const getJobByIdAPI = async (jobId) => {
  if (!jobId) {
    throw new Error('Job ID là bắt buộc')
  }
  const response = await authorizeAxiosInstance.get(`${AI_BASE_URL}/jobs/${jobId}`)
  return response.data
}

/**
 * Dự đoán rủi ro thất nghiệp của người lao động
 *
 * @param {Object} workerData - Dữ liệu người lao động
 * @param {number} workerData.age - Tuổi (35-65, bắt buộc)
 * @param {string} workerData.gender - Giới tính (male/female)
 * @param {string} [workerData.education] - Trình độ học vấn
 * @param {number} [workerData.experience_years] - Số năm kinh nghiệm
 * @param {string} [workerData.employment_status] - Tình trạng việc làm
 * @param {string} [workerData.marital_status] - Tình trạng hôn nhân
 * @param {number} [workerData.target_salary] - Mức lương mong muốn
 * @param {string} [workerData.region] - Khu vực (north/central/south)
 * @param {string[]} workerData.skills - Danh sách kỹ năng (bắt buộc)
 * @param {string} [workerData.target_job] - Công việc mong muốn
 * @param {string} [workerData.preferred_job_type] - Loại công việc ưa thích
 * @returns {Promise<Object>} - Kết quả dự đoán { risk_level, risk_score, probability, confidence, recommendation }
 */
export const predictRiskAPI = async (workerData) => {
  // Validate required fields
  if (!workerData.age) {
    throw new Error('Tuổi là bắt buộc để dự đoán rủi ro')
  }
  if (!workerData.skills || workerData.skills.length === 0) {
    throw new Error('Skills là bắt buộc để dự đoán rủi ro')
  }

  const response = await authorizeAxiosInstance.post(
    `${AI_BASE_URL}/predict-risk`,
    workerData
  )
  return response.data
}

/**
 * Phân tích tổng hợp người lao động (risk prediction + job recommendations)
 *
 * @param {Object} workerData - Dữ liệu người lao động
 * @param {number} workerData.age - Tuổi (bắt buộc)
 * @param {string[]} workerData.skills - Danh sách kỹ năng (bắt buộc)
 * @param {number} [workerData.limit] - Số lượng job recommendations (default: 5)
 * @returns {Promise<Object>} - Kết quả phân tích { worker_analysis: { risk_data, jobs, metadata } }
 */
export const analyzeWorkerAPI = async (workerData) => {
  // Validate required fields
  if (!workerData.age) {
    throw new Error('Tuổi là bắt buộc để phân tích')
  }
  if (!workerData.skills || workerData.skills.length === 0) {
    throw new Error('Skills là bắt buộc để phân tích')
  }

  const response = await authorizeAxiosInstance.post(
    `${AI_BASE_URL}/analyze-worker`,
    workerData
  )
  return response.data
}

/**
 * Health check AI Service thông qua Backend
 *
 * @returns {Promise<Object>} - Health status { status, service, version }
 */
export const healthCheckAIAPI = async () => {
  const response = await authorizeAxiosInstance.get(`${AI_BASE_URL}/health`)
  return response.data
}

/**
 * Lấy feature importance từ model
 *
 * @returns {Promise<Object>} - Feature importance data
 */
export const getFeatureImportanceAPI = async () => {
  const response = await authorizeAxiosInstance.get(`${AI_BASE_URL}/feature-importance`)
  return response.data
}

/**
 * Lấy thông tin model đang sử dụng
 *
 * @returns {Promise<Object>} - Model info { model_type, version, threshold, strategy }
 */
export const getModelInfoAPI = async () => {
  const response = await authorizeAxiosInstance.get(`${AI_BASE_URL}/model-info`)
  return response.data
}

/**
 * Khám phá lộ trình sự nghiệp cho người lao động
 * POST /v1/ai/career-path
 *
 * @param {Object} profileData - Dữ liệu hồ sơ người lao động
 * @param {number} profileData.age - Tuổi (bắt buộc)
 * @param {string} [profileData.current_role] - Vị trí hiện tại
 * @param {string} [profileData.current_industry] - Ngành hiện tại
 * @param {Array<{industry: string, role: string, years: number, skills: string[]}>} [profileData.experiences] - Danh sách kinh nghiệm làm việc
 * @param {number} [profileData.target_salary] - Mức lương mong muốn (VND)
 * @param {string} [profileData.work_preference] - Sở thích công việc: remote, hybrid, onsite
 * @param {boolean} [profileData.include_age_transition] - Bao gồm chuyển đổi theo tuổi (default: true)
 * @param {boolean} [profileData.include_management_track] - Bao gồm thang quản lý (default: true)
 * @returns {Promise<Object>} - Kết quả career paths { success, data: { user_profile, management_track, age_transition, skill_upgrades, ... } }
 */

// Industry normalization mapping - chuẩn hóa industry name về key
const INDUSTRY_NORMALIZE_MAP = {
  // IT / Technology
  'it': 'tu_van',
  'technology': 'tu_van',
  'tech': 'tu_van',
  'software': 'tu_van',
  'web': 'tu_van',
  'developer': 'tu_van',
  'programmer': 'tu_van',
  'công nghệ': 'tu_van',
  'cntt': 'tu_van',
  'cntt': 'tu_van',
  // Manufacturing
  'manufacturing': 'co_khi',
  'sản xuất': 'co_khi',
  'cơ khí': 'co_khi',
  'production': 'co_khi',
  'factory': 'co_khi',
  'dệt may': 'co_khi',
  'textile': 'co_khi',
  'garment': 'co_khi',
  // Business / Sales
  'business': 'ban_hang',
  'kinh doanh': 'ban_hang',
  'sales': 'ban_hang',
  'sale': 'ban_hang',
  'retail': 'ban_hang',
  'marketing': 'ban_hang',
  // Finance / Consulting
  'finance': 'tu_van',
  'tài chính': 'tu_van',
  'banking': 'tu_van',
  'insurance': 'tu_van',
  'consulting': 'tu_van',
  // Education
  'education': 'nhan_su',
  'giáo dục': 'nhan_su',
  'training': 'nhan_su',
  'school': 'nhan_su',
  // Healthcare
  'healthcare': 'hanh_chinh',
  'y tế': 'hanh_chinh',
  'hospital': 'hanh_chinh',
  'medical': 'hanh_chinh',
  // Service
  'service': 'phuc_vu',
  'dịch vụ': 'phuc_vu',
  'restaurant': 'phuc_vu',
  'nhà hàng': 'phuc_vu',
  'hotel': 'phuc_vu',
  'khách sạn': 'phuc_vu',
  // Admin
  'admin': 'hanh_chinh',
  'administrative': 'hanh_chinh',
  'office': 'hanh_chinh',
  'hành chính': 'hanh_chinh',
  // HR
  'hr': 'nhan_su',
  'nhân sự': 'nhan_su',
  'human resources': 'nhan_su',
  // Security
  'security': 'bao_ve',
  'bảo vệ': 'bao_ve',
  'safety': 'bao_ve',
  // Driver
  'driver': 'lai_xe',
  'lái xe': 'lai_xe',
  'transport': 'lai_xe',
  'vận tải': 'lai_xe',
  'logistics': 'lai_xe',
}

/**
 * Normalize industry name to standard key
 * @param {string} industry - Industry name
 * @returns {string} - Normalized industry key
 */
const normalizeIndustry = (industry) => {
  if (!industry) return 'tu_van' // Default fallback

  const normalized = industry.toLowerCase().trim()

  // Check direct match
  if (INDUSTRY_NORMALIZE_MAP[normalized]) {
    return INDUSTRY_NORMALIZE_MAP[normalized]
  }

  // Check partial match
  for (const [key, value] of Object.entries(INDUSTRY_NORMALIZE_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value
    }
  }

  // Default fallback
  return 'tu_van'
}

/**
 * Normalize experiences array with proper industry keys
 * @param {Array} experiences - Array of work experiences
 * @returns {Array} - Normalized experiences
 */
const normalizeExperiences = (experiences) => {
  if (!Array.isArray(experiences)) return []

  return experiences.map(exp => ({
    ...exp,
    industry: normalizeIndustry(exp.industry || exp.current_industry),
    role: exp.role || '',
    years: parseFloat(exp.years || 0),
    skills: Array.isArray(exp.skills) ? exp.skills : []
  }))
}

export const discoverCareerPathAPI = async (profileData) => {
  // Validate required fields
  if (!profileData.age) {
    throw new Error('Tuổi là bắt buộc để khám phá lộ trình sự nghiệp')
  }

  // Normalize experiences with proper industry keys
  const normalizedExperiences = normalizeExperiences(profileData.experiences || [])

  // Also normalize current_industry if provided
  const normalizedCurrentIndustry = normalizeIndustry(profileData.current_industry)

  const payload = {
    age: profileData.age,
    experiences: normalizedExperiences,
    include_age_transition: profileData.include_age_transition !== false,
    include_management_track: profileData.include_management_track !== false
  }

  // Add current role and industry (normalized)
  if (profileData.current_role) payload.current_role = profileData.current_role
  if (normalizedCurrentIndustry) payload.current_industry = normalizedCurrentIndustry
  if (profileData.target_salary) payload.target_salary = profileData.target_salary
  if (profileData.work_preference) payload.work_preference = profileData.work_preference

  const response = await authorizeAxiosInstance.post(
    `${AI_BASE_URL}/career-path`,
    payload
  )
  return response.data
}

/**
 * Lấy thông tin mức độ khẩn cấp chuyển đổi nghề theo tuổi
 * GET /v1/ai/career-path/urgency
 *
 * @param {number} age - Tuổi của người lao động (18-70)
 * @returns {Promise<Object>} - Thông tin urgency { success, data: { age, urgency, description, recommendations } }
 */
export const getCareerPathUrgencyAPI = async (age) => {
  if (!age || age < 18 || age > 70) {
    throw new Error('Tuổi phải từ 18 đến 70')
  }
  const response = await authorizeAxiosInstance.get(`${AI_BASE_URL}/career-path/urgency?age=${age}`)
  return response.data
}

/**
 * Lấy danh sách các ngành nghề được hỗ trợ
 * GET /v1/ai/career-path/industries
 *
 * @returns {Promise<Object>} - Danh sách ngành { success, data: { industries: [{id, name, levels_count, ...}] } }
 */
export const getCareerPathIndustriesAPI = async () => {
  const response = await authorizeAxiosInstance.get(`${AI_BASE_URL}/career-path/industries`)
  return response.data
}

/**
 * =============================================================================
 * CAREER TRANSITION APIs (35+)
 * =============================================================================
 */

/**
 * Lấy gợi ý chuyển đổi nghề nghiệp cho lao động 35+
 * POST /v1/ai/career-transitions
 *
 * @param {Object} profileData - Dữ liệu hồ sơ người lao động
 * @param {number} profileData.age - Tuổi (bắt buộc)
 * @param {string} profileData.current_role - Vị trí hiện tại
 * @param {string} profileData.current_industry - Ngành hiện tại (e.g., ban_hang, co_khi)
 * @param {number} profileData.experience_years - Số năm kinh nghiệm
 * @param {string[]} profileData.skills - Danh sách kỹ năng
 * @param {number} [profileData.target_salary] - Mức lương mong muốn (VND)
 * @param {string[]} [profileData.barriers] - Các rào cản
 * @param {string[]} [profileData.transition_types] - Loại chuyển đổi: management, cross_industry, universal
 * @param {number} [profileData.limit] - Số lượng kết quả (default: 10)
 * @returns {Promise<Object>} - Kết quả transitions
 */
export const getCareerTransitionsAPI = async (profileData) => {
  if (!profileData.age) {
    throw new Error('Tuổi là bắt buộc để khám phá chuyển đổi nghề')
  }
  if (!profileData.current_role) {
    throw new Error('Vị trí hiện tại là bắt buộc')
  }
  if (!profileData.current_industry) {
    throw new Error('Ngành hiện tại là bắt buộc')
  }

  const payload = {
    age: profileData.age,
    current_role: profileData.current_role,
    current_industry: profileData.current_industry,
    experience_years: profileData.experience_years || 0,
    skills: profileData.skills || [],
    transition_types: profileData.transition_types || ['management', 'cross_industry', 'universal', 'multi_industry'],
    limit: profileData.limit || 10
  }

  // Optional fields
  if (profileData.target_salary) payload.target_salary = profileData.target_salary
  if (profileData.barriers && profileData.barriers.length > 0) payload.barriers = profileData.barriers

  // Multi-industry fields (for users with diverse work history)
  if (profileData.work_history && profileData.work_history.length > 0) {
    payload.work_history = profileData.work_history
  }
  if (profileData.personality_traits && profileData.personality_traits.length > 0) {
    payload.personality_traits = profileData.personality_traits
  }
  if (profileData.interests && profileData.interests.length > 0) {
    payload.interests = profileData.interests
  }
  if (profileData.values && profileData.values.length > 0) {
    payload.values = profileData.values
  }

  const response = await authorizeAxiosInstance.post(
    `${AI_BASE_URL}/career-transitions`,
    payload
  )
  return response.data
}

/**
 * Lấy mức độ khẩn cấp chuyển đổi nghề theo tuổi (35+)
 * GET /v1/ai/career-transitions/urgency
 *
 * @param {number} age - Tuổi của người lao động (18-70)
 * @returns {Promise<Object>} - Thông tin urgency
 */
export const getTransitionsUrgencyAPI = async (age) => {
  if (!age || age < 18 || age > 70) {
    throw new Error('Tuổi phải từ 18 đến 70')
  }
  const response = await authorizeAxiosInstance.get(`${AI_BASE_URL}/career-transitions/urgency?age=${age}`)
  return response.data
}

/**
 * Lấy danh sách ngành nghề được hỗ trợ cho chuyển đổi
 * GET /v1/ai/career-transitions/industries
 *
 * @returns {Promise<Object>} - Danh sách ngành { industries, total, recommended_for_35_plus }
 */
export const getTransitionsIndustriesAPI = async () => {
  const response = await authorizeAxiosInstance.get(`${AI_BASE_URL}/career-transitions/industries`)
  return response.data
}

/**
 * Lấy skill gaps cho một ngành cụ thể
 * GET /v1/ai/career-transitions/skills
 *
 * @param {string} industry - Ngành cần xem skill gaps (e.g., co_khi, ban_hang)
 * @returns {Promise<Object>} - Skill gaps { industry, recommended_skills }
 */
export const getTransitionsSkillsAPI = async (industry) => {
  if (!industry) {
    throw new Error('Ngành là bắt buộc')
  }
  const response = await authorizeAxiosInstance.get(`${AI_BASE_URL}/career-transitions/skills?industry=${industry}`)
  return response.data
}

// =============================================================================
// CACHED CAREER PATH APIs
// =============================================================================

/**
 * Lấy career path từ cache (Redis -> MongoDB)
 * GET /v1/ai/career-path/cached
 *
 * @returns {Promise<Object>} - Career path data { success, source, data, generatedAt }
 * @returns {string} source - Nguồn data: 'cache' (Redis) | 'database' (MongoDB)
 */
export const getCachedCareerPathAPI = async () => {
  const response = await authorizeAxiosInstance.get(`${AI_BASE_URL}/career-path/cached`)
  return response.data
}

/**
 * Trigger generation career path mới
 * POST /v1/ai/career-path/generate
 *
 * @param {Object} profileData - Dữ liệu hồ sơ người lao động
 * @param {number} profileData.age - Tuổi (bắt buộc)
 * @param {string} [profileData.currentRole] - Vị trí hiện tại
 * @param {string} [profileData.currentIndustry] - Ngành hiện tại
 * @param {Array} [profileData.experiences] - Danh sách kinh nghiệm
 * @param {Array} [profileData.skills] - Danh sách kỹ năng
 * @param {Object} [profileData.barriers] - Các rào cản
 * @param {number} [profileData.targetSalary] - Mức lương mong muốn
 * @param {boolean} [profileData.includeAgeTransition] - Bao gồm chuyển đổi theo tuổi
 * @param {boolean} [profileData.includeManagementTrack] - Bao gồm thang quản lý
 * @returns {Promise<Object>} - Career path mới { success, message, data }
 */
export const triggerCareerPathGenerationAPI = async (profileData) => {
  if (!profileData.age) {
    throw new Error('Tuổi là bắt buộc để tạo lộ trình sự nghiệp')
  }

  // Normalize experiences with proper industry keys
  const normalizedExperiences = normalizeExperiences(profileData.experiences || [])

  const payload = {
    age: profileData.age,
    includeAgeTransition: profileData.includeAgeTransition !== false,
    includeManagementTrack: profileData.includeManagementTrack !== false
  }

  if (profileData.currentRole) payload.currentRole = profileData.currentRole
  if (profileData.currentIndustry) payload.currentIndustry = normalizeIndustry(profileData.currentIndustry)
  if (normalizedExperiences.length > 0) payload.experiences = normalizedExperiences
  if (profileData.skills && profileData.skills.length > 0) payload.skills = profileData.skills
  if (profileData.barriers) payload.barriers = profileData.barriers
  if (profileData.targetSalary) payload.targetSalary = profileData.targetSalary

  const response = await authorizeAxiosInstance.post(
    `${AI_BASE_URL}/career-path/generate`,
    payload
  )
  return response.data
}

/**
 * Xóa cache career path (khi profile thay đổi)
 * DELETE /v1/ai/career-path/cache
 *
 * @returns {Promise<Object>} - Kết quả { success, message }
 */
export const invalidateCareerPathCacheAPI = async () => {
  const response = await authorizeAxiosInstance.delete(`${AI_BASE_URL}/career-path/cache`)
  return response.data
}

/**
 * Xóa cache RAG recommendation (khi profile thay đổi)
 * DELETE /v1/ai/rag/cache
 *
 * @returns {Promise<Object>} - Kết quả { success, message }
 */
export const invalidateRAGCacheAPI = async () => {
  const response = await authorizeAxiosInstance.delete(`${AI_BASE_URL}/rag/cache`)
  return response.data
}

// =============================================================================
// RAG CAREER RECOMMENDATION APIs
// =============================================================================

/**
 * Trigger RAG-based career recommendation generation
 * POST /v1/ai/rag/career-recommendation
 *
 * @param {Object} profile - User profile data
 * @param {Object} profile.basicInfo - Basic info { age, gender, province, education }
 * @param {Array} profile.employmentHistory - Work history [{ industry, role, years, skills }]
 * @param {Object} profile.aspirations - Aspirations { targetJob, targetIndustry, skills, targetSalary }
 * @param {Object} profile.barriers - Barriers { health, family, techGap, time, finance }
 * @param {boolean} [includeSalary=true] - Include salary data from RAG
 * @param {boolean} [includeTrends=true] - Include industry trends from RAG
 * @returns {Promise<Object>} - RAG recommendation { success, data: { best_fits, income_boost, progression }, sources, meta }
 */
export const triggerRAGCareerRecommendationAPI = async (profile, includeSalary = true, includeTrends = true) => {
  if (!profile || !profile.basicInfo || !profile.basicInfo.age) {
    throw new Error('Profile với age là bắt buộc để tạo RAG recommendation')
  }

  const payload = {
    profile,
    include_salary: includeSalary,
    include_trends: includeTrends
  }

  const response = await authorizeAxiosInstance.post(
    `${AI_BASE_URL}/rag/career-recommendation`,
    payload
  )
  return response.data
}

/**
 * Get cached RAG career recommendation for current user
 * GET /v1/ai/rag/career-recommendation
 *
 * @returns {Promise<Object>} - Cached RAG data {
 *   success, data: { best_fits, income_boost, progression },
 *   meta: { sources, generatedAt, refreshCount, expiresAt, isFresh, isExpired, status }
 * }
 */
export const getCachedRAGRecommendationAPI = async () => {
  const response = await authorizeAxiosInstance.get(`${AI_BASE_URL}/rag/career-recommendation`)
  return response.data
}

/**
 * Refresh RAG career recommendation
 * POST /v1/ai/rag/career-recommendation/refresh
 *
 * Rate limit: Max 1 refresh per 24 hours
 *
 * @param {Object} profile - User profile data (same structure as triggerRAGCareerRecommendationAPI)
 * @param {boolean} [includeSalary=true] - Include salary data
 * @param {boolean} [includeTrends=true] - Include industry trends
 * @returns {Promise<Object>} - Refreshed RAG data { success, data, meta }
 */
export const refreshRAGRecommendationAPI = async (profile, includeSalary = true, includeTrends = true) => {
  if (!profile || !profile.basicInfo || !profile.basicInfo.age) {
    throw new Error('Profile với age là bắt buộc để refresh RAG recommendation')
  }

  const payload = {
    profile,
    include_salary: includeSalary,
    include_trends: includeTrends
  }

  const response = await authorizeAxiosInstance.post(
    `${AI_BASE_URL}/rag/career-recommendation/refresh`,
    payload
  )
  return response.data
}

/**
 * Get available RAG data sources
 * GET /v1/ai/rag/sources
 *
 * Public endpoint - No auth required
 *
 * @returns {Promise<Object>} - Data sources {
 *   success, data: {
 *     sources: ['salary_benchmarks.json', 'industry_trends.json', ...],
 *     document_count, embedding_model, last_updated
 *   }
 * }
 */
export const getRAGSourcesAPI = async () => {
  // This endpoint is public, so we use regular axios instance without auth
  const { default: axiosInstance } = await import('axios')
  const { API_ROOT } = await import('~/utils/constants')

  const response = await axiosInstance.get(`${API_ROOT}/v1/ai/rag/sources`)
  return response.data
}

/**
 * Get RAG system health status
 * GET /v1/ai/rag/health
 *
 * Public endpoint - No auth required
 *
 * @returns {Promise<Object>} - Health status {
 *   status: 'healthy' | 'degraded' | 'error',
 *   components: {
 *     rag_engine: { status, initialized, document_count },
 *     llm: { status, available }
 *   },
 *   timestamp
 * }
 */
export const getRAGHealthAPI = async () => {
  // This endpoint is public, so we use regular axios instance without auth
  const { default: axiosInstance } = await import('axios')
  const { API_ROOT } = await import('~/utils/constants')

  const response = await axiosInstance.get(`${API_ROOT}/v1/ai/rag/health`)
  return response.data
}

// =============================================================================
// RAG STARTUP APIs
// =============================================================================

/**
 * Get RAG-based startup suggestions
 * POST /v1/ai/rag/startup-suggestions
 *
 * @param {Object} profile - User profile data
 * @param {string} [budget="50-100 triệu"] - Budget for startup
 * @returns {Promise<Object>} - Startup suggestions {
 *   success, startup_ideas: [{ name, description, required_capital, timeline, expected_profit, leverage_experience }]
 * }
 */
export const triggerStartupSuggestionAPI = async (profile, budget = '50-100 triệu') => {
  const response = await authorizeAxiosInstance.post(
    `${AI_BASE_URL}/rag/startup-suggestions`,
    { profile, budget }
  )
  return response.data
}

// =============================================================================
// ESCO-BASED SKILL GAP ANALYSIS (Phase 4)
// =============================================================================

/**
 * Analyze skill gaps using ESCO database
 * POST /api/v1/skill-gap/esco
 *
 * @param {string[]} userSkills - User's current skills
 * @param {string} targetOccupation - Target job title
 * @param {number} age - User's age
 * @param {number} maxGaps - Max number of gaps (default 15)
 * @param {Object} careerContext - Optional context: industry, strengths, aspirations, barriers
 * @returns {Promise<Object>} - ESCO skill gap analysis result
 */
export const analyzeSkillGapsFromEscoAPI = async (userSkills, targetOccupation, age = 30, maxGaps = 15, careerContext = null) => {
  const response = await authorizeAxiosInstance.post(
    `${AI_BASE_URL}/skill-gap/esco`,
    {
      user_skills: userSkills,
      target_occupation: targetOccupation,
      age: age,
      max_gaps: maxGaps,
      career_context: careerContext
    }
  )
  return response.data
}