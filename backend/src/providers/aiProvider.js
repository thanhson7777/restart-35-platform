/**
 * AI Provider - Giao tiếp với Python AI Service
 */

import axios from 'axios'
import { env } from '~/config/enviroment'

const AI_SERVICE_BASE_URL = `http://${env.AI_SERVICE_HOST || 'localhost'}:${env.AI_SERVICE_PORT || '8000'}`

/**
 * Tạo axios instance cho AI Service
 */
const aiApiClient = axios.create({
  baseURL: AI_SERVICE_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

/**
 * AI Provider class
 */
class AIProvider {
  /**
   * Health check AI Service
   */
  async healthCheck() {
    try {
      const response = await aiApiClient.get('/api/v1/ai/health')
      return response.data
    } catch (error) {
      console.error('AI Service health check failed:', error.message)
      throw error
    }
  }

  /**
   * Gợi ý công việc cho user
   *
   * @param {Object} params - Parameters
   * @param {string[]} params.skills - Danh sách skills của user
   * @param {number} params.experience - Số năm kinh nghiệm
   * @param {string} params.location - Tỉnh/thành phố mong muốn
   * @param {string} params.targetJob - Công việc mong muốn
   * @param {number} params.targetSalary - Mức lương mong muốn
   * @param {string} params.preferredJobType - Loại công việc ưa thích
   * @param {number} params.limit - Số lượng kết quả (default: 10, max: 50)
   * @param {boolean} params.allowRemote - Cho phép làm việc từ xa
   * @returns {Promise<Object>} - Kết quả gợi ý việc làm
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
      console.error('AI recommend jobs failed:', error.message)
      throw error
    }
  }

  /**
   * Lấy danh sách tất cả jobs
   *
   * @param {number} limit - Số lượng jobs tối đa (default: 50)
   * @returns {Promise<Object>} - Danh sách jobs
   */
  async getAllJobs(limit = 50) {
    try {
      const response = await aiApiClient.get('/api/v1/ai/jobs', {
        params: { limit }
      })
      return response.data
    } catch (error) {
      console.error('AI get all jobs failed:', error.message)
      throw error
    }
  }

  /**
   * Lấy thông tin chi tiết một job
   *
   * @param {string} jobId - Job ID (vd: job_0001)
   * @returns {Promise<Object>} - Chi tiết job
   */
  async getJobById(jobId) {
    try {
      const response = await aiApiClient.get(`/api/v1/ai/jobs/${jobId}`)
      return response.data
    } catch (error) {
      console.error('AI get job by id failed:', error.message)
      throw error
    }
  }
}

export const aiProvider = new AIProvider()
export default aiProvider
