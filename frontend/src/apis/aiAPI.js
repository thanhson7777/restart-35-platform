/**
 * AI APIs - Gọi backend AI endpoints
 */

import { authorizeAxiosInstance } from '~/utils/authorizeAxios'
import { AI_SERVICE_ROOT } from '~/utils/constants'

/**
 * Lấy danh sách công việc gợi ý cho user
 *
 * @param {Object} params - Parameters
 * @param {string[]} params.skills - Danh sách skills của user
 * @param {number} params.experience - Số năm kinh nghiệm
 * @param {string} params.location - Tỉnh/thành phố mong muốn
 * @param {string} params.targetJob - Công việc mong muốn
 * @param {number} params.targetSalary - Mức lương mong muốn
 * @param {string} params.preferredJobType - Loại công việc ưa thích
 * @param {number} params.limit - Số lượng kết quả (default: 10)
 * @returns {Promise<Object>} - Kết quả gợi ý việc làm
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
  const payload = {
    skills,
    experience: Math.floor(experience), // Convert float to int
    limit
  }

  if (location) payload.location = location
  if (targetJob) payload.target_job = targetJob
  if (targetSalary) payload.target_salary = targetSalary
  if (preferredJobType) payload.preferred_job_type = preferredJobType

  const response = await authorizeAxiosInstance.post(
    `${AI_SERVICE_ROOT}/api/v1/ai/recommend-jobs`,
    payload
  )
  return response.data
}

/**
 * Lấy danh sách tất cả jobs từ AI Service
 *
 * @param {number} limit - Số lượng jobs tối đa
 * @returns {Promise<Object>} - Danh sách jobs
 */
export const getAllJobsAPI = async (limit = 50) => {
  const response = await authorizeAxiosInstance.get(
    `${AI_SERVICE_ROOT}/api/v1/ai/jobs?limit=${limit}`
  )
  return response.data
}

/**
 * Lấy thông tin chi tiết một job
 *
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} - Chi tiết job
 */
export const getJobByIdAPI = async (jobId) => {
  const response = await authorizeAxiosInstance.get(
    `${AI_SERVICE_ROOT}/api/v1/ai/jobs/${jobId}`
  )
  return response.data
}

/**
 * Health check AI Service
 *
 * @returns {Promise<Object>} - Health status
 */
export const healthCheckAIAPI = async () => {
  const response = await authorizeAxiosInstance.get(
    `${AI_SERVICE_ROOT}/api/v1/ai/health`
  )
  return response.data
}