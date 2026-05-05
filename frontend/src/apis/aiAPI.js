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
export const discoverCareerPathAPI = async (profileData) => {
  // Validate required fields
  if (!profileData.age) {
    throw new Error('Tuổi là bắt buộc để khám phá lộ trình sự nghiệp')
  }

  const payload = {
    age: profileData.age,
    experiences: profileData.experiences || [],
    include_age_transition: profileData.include_age_transition !== false,
    include_management_track: profileData.include_management_track !== false
  }

  // Thêm các optional fields nếu có giá trị
  if (profileData.current_role) payload.current_role = profileData.current_role
  if (profileData.current_industry) payload.current_industry = profileData.current_industry
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
    transition_types: profileData.transition_types || ['management', 'cross_industry', 'universal'],
    limit: profileData.limit || 10
  }

  // Optional fields
  if (profileData.target_salary) payload.target_salary = profileData.target_salary
  if (profileData.barriers && profileData.barriers.length > 0) payload.barriers = profileData.barriers

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