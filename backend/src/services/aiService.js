/**
 * AI Service - Business Logic cho AI features
 * Xử lý các business logic liên quan đến AI/ML features
 */

import { aiProvider } from '~/providers/aiProvider'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'

/**
 * Lấy danh sách công việc gợi ý cho user dựa trên kỹ năng
 *
 * @param {Object} params - Parameters từ worker profile
 * @param {string[]} params.skills - Danh sách skills
 * @param {number} params.experience - Số năm kinh nghiệm
 * @param {string} [params.location] - Tỉnh/thành phố mong muốn
 * @param {string} [params.targetJob] - Công việc mong muốn
 * @param {number} [params.targetSalary] - Mức lương mong muốn
 * @param {string} [params.preferredJobType] - Loại công việc ưa thích
 * @param {number} [params.limit] - Số lượng kết quả (default: 10, max: 50)
 * @param {boolean} [params.allowRemote] - Cho phép làm việc từ xa
 * @returns {Promise<Object>} Kết quả gợi ý việc làm
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
    console.error('[AIService] getRecommendedJobs error:', error)

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
 * @returns {Promise<Object>} Danh sách jobs
 */
const getAllJobs = async (limit = 50) => {
  try {
    const cappedLimit = Math.min(100, Math.max(1, limit || 50))
    const result = await aiProvider.getAllJobs(cappedLimit)
    return result
  } catch (error) {
    console.error('[AIService] getAllJobs error:', error)

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
 * @returns {Promise<Object>} Chi tiết job
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

    console.error('[AIService] getJobById error:', error)

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
 * Dự đoán rủi ro thất nghiệp của người lao động
 *
 * @param {Object} workerData - Dữ liệu người lao động
 * @returns {Promise<Object>} Kết quả dự đoán rủi ro
 */
const predictRisk = async (workerData) => {
  try {
    // Validate required fields
    if (!workerData.age) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Tuổi là bắt buộc')
    }

    if (!workerData.skills || workerData.skills.length === 0) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Skills là bắt buộc để phân tích rủi ro')
    }

    const result = await aiProvider.predictRisk(workerData)
    return result
  } catch (error) {
    if (error.isApiError) {
      throw error
    }

    console.error('[AIService] predictRisk error:', error)

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new ApiError(
        StatusCodes.SERVICE_UNAVAILABLE,
        'AI Service hiện không khả dụng. Vui lòng thử lại sau.'
      )
    }

    // Check for specific AI Service errors
    if (error.response?.status === 400) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        error.response?.data?.detail || 'Dữ liệu không hợp lệ cho việc dự đoán rủi ro'
      )
    }

    if (error.response?.status === 500) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Lỗi từ AI Service khi dự đoán rủi ro'
      )
    }

    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể dự đoán rủi ro. Vui lòng thử lại.'
    )
  }
}

/**
 * Phân tích tổng hợp người lao động (risk prediction + recommendations)
 *
 * @param {Object} workerData - Dữ liệu người lao động
 * @returns {Promise<Object>} Kết quả phân tích tổng hợp
 */
const analyzeWorker = async (workerData) => {
  try {
    // Validate required fields
    if (!workerData.age) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Tuổi là bắt buộc')
    }

    if (!workerData.skills || workerData.skills.length === 0) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Skills là bắt buộc để phân tích')
    }

    const result = await aiProvider.analyzeWorker(workerData)
    return result
  } catch (error) {
    if (error.isApiError) {
      throw error
    }

    console.error('[AIService] analyzeWorker error:', error)

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new ApiError(
        StatusCodes.SERVICE_UNAVAILABLE,
        'AI Service hiện không khả dụng. Vui lòng thử lại sau.'
      )
    }

    if (error.response?.status === 400) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        error.response?.data?.detail || 'Dữ liệu không hợp lệ cho việc phân tích'
      )
    }

    if (error.response?.status === 500) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Lỗi từ AI Service khi phân tích'
      )
    }

    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể phân tích người lao động. Vui lòng thử lại.'
    )
  }
}

/**
 * Health check AI Service
 *
 * @returns {Promise<Object>} Health status
 */
const healthCheck = async () => {
  try {
    const result = await aiProvider.healthCheck()
    return result
  } catch (error) {
    console.error('[AIService] healthCheck error:', error)
    return {
      status: 'error',
      message: 'AI Service không khả dụng',
      error: error.message
    }
  }
}

/**
 * Lấy feature importance từ model
 *
 * @returns {Promise<Object>} Feature importance data
 */
const getFeatureImportance = async () => {
  try {
    const result = await aiProvider.getFeatureImportance()
    return result
  } catch (error) {
    console.error('[AIService] getFeatureImportance error:', error)

    if (error.code === 'ECONNREFUSED') {
      throw new ApiError(
        StatusCodes.SERVICE_UNAVAILABLE,
        'AI Service hiện không khả dụng'
      )
    }

    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể lấy feature importance'
    )
  }
}

/**
 * Lấy thông tin model đang sử dụng
 *
 * @returns {Promise<Object>} Model info
 */
const getModelInfo = async () => {
  try {
    const result = await aiProvider.getModelInfo()
    return result
  } catch (error) {
    console.error('[AIService] getModelInfo error:', error)

    if (error.code === 'ECONNREFUSED') {
      throw new ApiError(
        StatusCodes.SERVICE_UNAVAILABLE,
        'AI Service hiện không khả dụng'
      )
    }

    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể lấy thông tin model'
    )
  }
}

// Export các functions
export const aiService = {
  getRecommendedJobs,
  getAllJobs,
  getJobById,
  predictRisk,
  analyzeWorker,
  healthCheck,
  getFeatureImportance,
  getModelInfo
}