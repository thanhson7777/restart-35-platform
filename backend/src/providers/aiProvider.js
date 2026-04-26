/**
 * AI Provider - Giao tiếp với Python AI Service
 * Module này chịu trách nhiệm giao tiếp trực tiếp với Python FastAPI service
 */

import axios from 'axios'
import { env } from '~/config/enviroment'

// Base URL cho AI Service (Python FastAPI)
const AI_SERVICE_BASE_URL = `http://${env.AI_SERVICE_HOST || 'localhost'}:${env.AI_SERVICE_PORT || '8000'}`

/**
 * Axios instance cho AI Service với timeout cao hơn (ML models cần thời gian xử lý)
 */
const aiApiClient = axios.create({
  baseURL: AI_SERVICE_BASE_URL,
  timeout: 60000, // 60s cho ML predictions
  headers: {
    'Content-Type': 'application/json'
  }
})

/**
 * AI Provider class - Singleton pattern để quản lý AI Service connections
 */
class AIProvider {
  /**
   * Health check AI Service
   * GET /api/v1/ai/health
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      const response = await aiApiClient.get('/api/v1/ai/health')
      return response.data
    } catch (error) {
      console.error('[AIProvider] Health check failed:', error.message)
      throw error
    }
  }

  /**
   * Gợi ý công việc cho user dựa trên kỹ năng
   * POST /api/v1/ai/recommend-jobs
   *
   * @param {Object} params - Parameters
   * @param {string[]} params.skills - Danh sách skills của user
   * @param {number} params.experience - Số năm kinh nghiệm
   * @param {string} params.location - Tỉnh/thành phố mong muốn
   * @param {string} params.targetJob - Công việc mong muốn
   * @param {number} params.targetSalary - Mức lương mong muốn
   * @param {string} params.preferredJobType - Loại công việc ưa thích (full-time, part-time, etc.)
   * @param {number} params.limit - Số lượng kết quả (default: 10, max: 50)
   * @param {boolean} params.allowRemote - Cho phép làm việc từ xa
   * @returns {Promise<Object>} Kết quả gợi ý việc làm
   */
  async recommendJobs({
    skills,
    experience = 0,
    location = null,
    targetJob = null,
    targetSalary = null,
    preferredJobType = null,
    limit = 10,
    allowRemote = false
  }) {
    try {
      // Build payload - chỉ gửi các field có giá trị
      const payload = {
        skills,
        experience,
        limit
      }

      if (location) payload.location = location
      if (targetJob) payload.target_job = targetJob
      if (targetSalary) payload.target_salary = targetSalary
      if (preferredJobType) payload.preferred_job_type = preferredJobType
      if (allowRemote) payload.allow_remote = allowRemote

      const response = await aiApiClient.post('/api/v1/ai/recommend-jobs', payload)
      return response.data
    } catch (error) {
      console.error('[AIProvider] recommendJobs failed:', error.message)
      throw error
    }
  }

  /**
   * Lấy danh sách tất cả jobs từ database
   * GET /api/v1/ai/jobs
   *
   * @param {number} limit - Số lượng jobs tối đa (default: 50)
   * @returns {Promise<Object>} Danh sách jobs
   */
  async getAllJobs(limit = 50) {
    try {
      const response = await aiApiClient.get('/api/v1/ai/jobs', {
        params: { limit }
      })
      return response.data
    } catch (error) {
      console.error('[AIProvider] getAllJobs failed:', error.message)
      throw error
    }
  }

  /**
   * Lấy thông tin chi tiết một job
   * GET /api/v1/ai/jobs/{jobId}
   *
   * @param {string} jobId - Job ID (vd: job_0001)
   * @returns {Promise<Object>} Chi tiết job
   */
  async getJobById(jobId) {
    try {
      const response = await aiApiClient.get(`/api/v1/ai/jobs/${jobId}`)
      return response.data
    } catch (error) {
      console.error('[AIProvider] getJobById failed:', error.message)
      throw error
    }
  }

  /**
   * Dự đoán rủi ro thất nghiệp của người lao động
   * POST /api/v1/ai/predict-risk
   *
   * @param {Object} workerData - Dữ liệu người lao động
   * @param {number} workerData.age - Tuổi (35-65)
   * @param {string} workerData.gender - Giới tính (male/female)
   * @param {string} workerData.education - Trình độ học vấn
   * @param {number} workerData.experience_years - Số năm kinh nghiệm
   * @param {string} workerData.employment_status - Tình trạng việc làm
   * @param {string} workerData.marital_status - Tình trạng hôn nhân
   * @param {number} workerData.target_salary - Mức lương mong muốn
   * @param {string} workerData.region - Khu vực (north/central/south)
   * @param {string[]} workerData.skills - Danh sách kỹ năng
   * @param {string} [workerData.target_job] - Công việc mong muốn
   * @param {string} [workerData.preferred_job_type] - Loại công việc ưa thích
   * @param {number} [workerData.barrier_health] - Rào cản sức khỏe (0-1)
   * @param {number} [workerData.barrier_family] - Rào cản gia đình (0-1)
   * @param {number} [workerData.barrier_techGap] - Rào cản công nghệ (0-1)
   * @param {number} [workerData.barrier_location] - Rào cản địa lý (0-1)
   * @param {number} [workerData.barrier_language] - Rào cản ngôn ngữ (0-1)
   * @returns {Promise<Object>} Kết quả dự đoán rủi ro (risk_level, risk_score, probability, recommendation)
   */
  async predictRisk(workerData) {
    try {
      const response = await aiApiClient.post('/api/v1/ai/predict-risk', workerData)
      return response.data
    } catch (error) {
      console.error('[AIProvider] predictRisk failed:', error.message)
      throw error
    }
  }

  /**
   * Phân tích tổng hợp người lao động (risk prediction + job recommendations)
   * POST /api/v1/ai/analyze-worker
   *
   * @param {Object} workerData - Dữ liệu người lao động (tương tự predictRisk)
   * @param {number} [workerData.limit] - Số lượng job recommendations (default: 5)
   * @returns {Promise<Object>} Kết quả phân tích tổng hợp (worker_analysis: {risk_data, jobs, metadata})
   */
  async analyzeWorker(workerData) {
    try {
      const response = await aiApiClient.post('/api/v1/ai/analyze-worker', workerData)
      return response.data
    } catch (error) {
      console.error('[AIProvider] analyzeWorker failed:', error.message)
      throw error
    }
  }

  /**
   * Lấy thông tin feature importance từ model
   * GET /api/v1/ai/feature-importance
   *
   * @returns {Promise<Object>} Feature importance data
   */
  async getFeatureImportance() {
    try {
      const response = await aiApiClient.get('/api/v1/ai/feature-importance')
      return response.data
    } catch (error) {
      console.error('[AIProvider] getFeatureImportance failed:', error.message)
      throw error
    }
  }

  /**
   * Lấy thông tin model đang được sử dụng
   * GET /api/v1/ai/model-info
   *
   * @returns {Promise<Object>} Model info (model_type, version, threshold, etc.)
   */
  async getModelInfo() {
    try {
      const response = await aiApiClient.get('/api/v1/ai/model-info')
      return response.data
    } catch (error) {
      console.error('[AIProvider] getModelInfo failed:', error.message)
      throw error
    }
  }

  // ============================================================================
  // CAREER PATH ENDPOINTS
  // ============================================================================

  /**
   * Khám phá lộ trình sự nghiệp
   * POST /api/v1/ai/career-path
   *
   * @param {Object} params - Profile parameters
   * @param {number} params.age - Tuổi người dùng
   * @param {string} [params.currentRole] - Vai trò hiện tại
   * @param {string} [params.currentIndustry] - Ngành hiện tại
   * @param {Array} params.experiences - Danh sách kinh nghiệm làm việc
   * @param {number} [params.targetSalary] - Mức lương mục tiêu
   * @param {string} [params.workPreference] - Ưu tiên làm việc (remote, hybrid, onsite)
   * @param {boolean} [params.includeAgeTransition] - Bao gồm chuyển đổi theo tuổi
   * @param {boolean} [params.includeManagementTrack] - Bao gồm lộ trình quản lý
   * @returns {Promise<Object>} Kết quả khám phá lộ trình nghề nghiệp
   */
  async discoverCareerPath({
    age,
    currentRole = null,
    currentIndustry = null,
    experiences = [],
    targetSalary = null,
    workPreference = null,
    includeAgeTransition = true,
    includeManagementTrack = true
  }) {
    try {
      const payload = {
        age,
        experiences
      }

      if (currentRole) payload.current_role = currentRole
      if (currentIndustry) payload.current_industry = currentIndustry
      if (targetSalary) payload.target_salary = targetSalary
      if (workPreference) payload.work_preference = workPreference
      payload.include_age_transition = includeAgeTransition
      payload.include_management_track = includeManagementTrack

      const response = await aiApiClient.post('/api/v1/ai/career-path', payload)
      return response.data
    } catch (error) {
      console.error('[AIProvider] discoverCareerPath failed:', error.message)
      throw error
    }
  }

  /**
   * Lấy mức độ khẩn cấp chuyển đổi nghề theo tuổi
   * GET /api/v1/ai/career-path/urgency
   *
   * @param {number} age - Tuổi người dùng
   * @returns {Promise<Object>} Thông tin mức độ khẩn cấp
   */
  async getAgeUrgency(age) {
    try {
      const response = await aiApiClient.get('/api/v1/ai/career-path/urgency', {
        params: { age }
      })
      return response.data
    } catch (error) {
      console.error('[AIProvider] getAgeUrgency failed:', error.message)
      throw error
    }
  }

  /**
   * Lấy danh sách các ngành nghề được hỗ trợ
   * GET /api/v1/ai/career-path/industries
   *
   * @returns {Promise<Object>} Danh sách ngành nghề
   */
  async getCareerIndustries() {
    try {
      const response = await aiApiClient.get('/api/v1/ai/career-path/industries')
      return response.data
    } catch (error) {
      console.error('[AIProvider] getCareerIndustries failed:', error.message)
      throw error
    }
  }

  // ============================================================================
  // SEMANTIC SEARCH ENDPOINTS
  // ============================================================================

  /**
   * Kiểm tra trạng thái semantic search
   * GET /api/v1/ai/semantic-status
   *
   * @returns {Promise<Object>} Trạng thái semantic search
   */
  async getSemanticStatus() {
    try {
      const response = await aiApiClient.get('/api/v1/ai/semantic-status')
      return response.data
    } catch (error) {
      console.error('[AIProvider] getSemanticStatus failed:', error.message)
      throw error
    }
  }

  /**
   * Tìm jobs tương tự dựa trên semantic search
   * GET /api/v1/ai/jobs/{jobId}/similar
   *
   * @param {string} jobId - Job ID
   * @param {number} limit - Số lượng kết quả (default: 5)
   * @returns {Promise<Object>} Danh sách jobs tương tự
   */
  async getSimilarJobs(jobId, limit = 5) {
    try {
      const response = await aiApiClient.get(`/api/v1/ai/jobs/${jobId}/similar`, {
        params: { limit }
      })
      return response.data
    } catch (error) {
      console.error('[AIProvider] getSimilarJobs failed:', error.message)
      throw error
    }
  }
}

// Export singleton instance
export const aiProvider = new AIProvider()