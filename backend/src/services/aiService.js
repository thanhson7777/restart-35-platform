/**
 * AI Service - Business Logic cho AI features
 */

import { aiProvider } from '~/providers/aiProvider'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'

/**
 * Lấy danh sách công việc gợi ý cho user
 *
 * @param {Object} params - Parameters từ worker profile
 * @returns {Promise<Object>} - Kết quả gợi ý việc làm
 */
const getRecommendedJobs = async ({
  skills,
  experience,
  location,
  targetJob,
  targetSalary,
  preferredJobType,
  limit = 10,
  allowRemote = false
}) => {
  try {
    // Validate input
    if (!skills || skills.length === 0) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Skills là bắt buộc để gợi ý việc làm'
      )
    }

    // Cap limit ở backend (max: 50)
    const cappedLimit = Math.min(50, Math.max(1, limit || 10))

    const result = await aiProvider.recommendJobs({
      skills,
      experience,
      location,
      targetJob,
      targetSalary,
      preferredJobType,
      limit: cappedLimit,
      allowRemote
    })

    return result
  } catch (error) {
    // Nếu là ApiError thì throw lại
    if (error.isApiError) {
      throw error
    }

    // Xử lý error từ AI Service
    console.error('AI Service error:', error)

    // Check nếu AI service không available
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new ApiError(
        StatusCodes.SERVICE_UNAVAILABLE,
        'AI Service hiện không khả dụng. Vui lòng thử lại sau.'
      )
    }

    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể lấy gợi ý việc làm. Vui lòng thử lại.'
    )
  }
}

/**
 * Lấy danh sách tất cả jobs từ AI Service
 *
 * @param {number} limit - Số lượng jobs tối đa
 * @returns {Promise<Object>} - Danh sách jobs
 */
const getAllJobs = async (limit = 50) => {
  try {
    const cappedLimit = Math.min(100, Math.max(1, limit || 50))
    const result = await aiProvider.getAllJobs(cappedLimit)
    return result
  } catch (error) {
    console.error('AI Service getAllJobs error:', error)

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new ApiError(
        StatusCodes.SERVICE_UNAVAILABLE,
        'AI Service hiện không khả dụng'
      )
    }

    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể lấy danh sách việc làm'
    )
  }
}

/**
 * Lấy thông tin chi tiết một job
 *
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} - Chi tiết job
 */
const getJobById = async (jobId) => {
  try {
    if (!jobId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Job ID là bắt buộc')
    }

    const result = await aiProvider.getJobById(jobId)
    return result
  } catch (error) {
    if (error.isApiError) {
      throw error
    }

    console.error('AI Service getJobById error:', error)

    if (error.response?.status === 404) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy công việc')
    }

    if (error.code === 'ECONNREFUSED') {
      throw new ApiError(
        StatusCodes.SERVICE_UNAVAILABLE,
        'AI Service hiện không khả dụng'
      )
    }

    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể lấy thông tin công việc'
    )
  }
}

/**
 * Health check AI Service
 *
 * @returns {Promise<Object>} - Health status
 */
const healthCheck = async () => {
  try {
    const result = await aiProvider.healthCheck()
    return result
  } catch (error) {
    console.error('AI Service health check failed:', error)
    return {
      status: 'error',
      message: 'AI Service không khả dụng'
    }
  }
}

export const aiService = {
  getRecommendedJobs,
  getAllJobs,
  getJobById,
  healthCheck
}

export default aiService
