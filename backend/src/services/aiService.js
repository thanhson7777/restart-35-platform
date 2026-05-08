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

    // Handle both direct response and wrapped response
    return {
      data: result.data || result
    }
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
 * @param {Object} params - Parameters
 * @param {number} params.limit - Số lượng jobs tối đa
 * @param {string} [params.location] - Tỉnh/TP mong muốn
 * @param {string} [params.jobType] - Loại công việc
 * @param {number} [params.salaryMin] - Mức lương tối thiểu
 * @param {number} [params.salaryMax] - Mức lương tối đa
 * @param {number} [params.postedWithin] - Jobs đăng trong N ngày
 * @param {string[]} [params.skills] - Lọc theo kỹ năng
 * @param {number} [params.matchMin] - Match score tối thiểu
 * @returns {Promise<Object>} Danh sách jobs
 */
const getAllJobs = async ({
  limit = 50,
  location,
  jobType,
  salaryMin,
  salaryMax,
  postedWithin,
  skills,
  matchMin
}) => {
  try {
    const cappedLimit = Math.min(100, Math.max(1, limit || 50))
    const result = await aiProvider.getAllJobs(cappedLimit)

    // Handle both direct response and wrapped response
    let jobs = result.data?.jobs || result.jobs || []

    // Apply client-side filters
    if (location) {
      jobs = jobs.filter(job =>
        job.location?.toLowerCase().includes(location.toLowerCase()) ||
        job.province?.toLowerCase().includes(location.toLowerCase())
      )
    }

    if (jobType) {
      jobs = jobs.filter(job =>
        job.job_type?.toLowerCase() === jobType.toLowerCase() ||
        job.jobType?.toLowerCase() === jobType.toLowerCase()
      )
    }

    if (salaryMin) {
      jobs = jobs.filter(job => {
        const jobSalary = job.salary_min || job.salaryMin || 0
        return jobSalary >= salaryMin
      })
    }

    if (salaryMax) {
      jobs = jobs.filter(job => {
        const jobSalary = job.salary_max || job.salaryMax || Infinity
        return jobSalary <= salaryMax
      })
    }

    if (postedWithin) {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - postedWithin)
      jobs = jobs.filter(job => {
        const postedDate = new Date(job.posted_date || job.postedDate || job.created_at)
        return postedDate >= cutoffDate
      })
    }

    if (skills && skills.length > 0) {
      jobs = jobs.filter(job => {
        const jobSkills = job.required_skills || job.requiredSkills || job.skills || []
        const hasMatchingSkill = skills.some(skill =>
          jobSkills.some(jobSkill =>
            jobSkill.toLowerCase().includes(skill.toLowerCase()) ||
            skill.toLowerCase().includes(jobSkill.toLowerCase())
          )
        )
        return hasMatchingSkill
      })
    }

    if (matchMin) {
      jobs = jobs.filter(job => {
        const matchScore = job.match_score || job.matchScore || 0
        return matchScore >= matchMin
      })
    }

    return {
      data: {
        jobs,
        total: jobs.length,
        filters_applied: {
          location,
          jobType,
          salaryMin,
          salaryMax,
          postedWithin,
          skills,
          matchMin
        }
      }
    }
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

// ============================================================================
// CAREER PATH SERVICES
// ============================================================================

/**
 * Khám phá lộ trình sự nghiệp
 *
 * @param {Object} params - Profile parameters
 * @returns {Promise<Object>} Kết quả khám phá lộ trình nghề nghiệp
 */
const discoverCareerPath = async ({
  age,
  currentRole = null,
  currentIndustry = null,
  experiences = [],
  targetSalary = null,
  workPreference = null,
  includeAgeTransition = true,
  includeManagementTrack = true
}) => {
  try {
    if (!age) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Tuổi là bắt buộc')
    }

    const result = await aiProvider.discoverCareerPath({
      age,
      currentRole,
      currentIndustry,
      experiences,
      targetSalary,
      workPreference,
      includeAgeTransition,
      includeManagementTrack
    })

    return result
  } catch (error) {
    if (error.isApiError) {
      throw error
    }

    console.error('[AIService] discoverCareerPath error:', error)

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new ApiError(
        StatusCodes.SERVICE_UNAVAILABLE,
        'AI Service hiện không khả dụng'
      )
    }

    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể khám phá lộ trình sự nghiệp'
    )
  }
}

/**
 * Lấy mức độ khẩn cấp chuyển đổi nghề theo tuổi
 *
 * @param {number} age - Tuổi người dùng
 * @returns {Promise<Object>} Thông tin mức độ khẩn cấp
 */
const getAgeUrgency = async (age) => {
  try {
    if (!age) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Tuổi là bắt buộc')
    }

    const result = await aiProvider.getAgeUrgency(age)
    return result
  } catch (error) {
    if (error.isApiError) {
      throw error
    }

    console.error('[AIService] getAgeUrgency error:', error)

    if (error.code === 'ECONNREFUSED') {
      throw new ApiError(
        StatusCodes.SERVICE_UNAVAILABLE,
        'AI Service hiện không khả dụng'
      )
    }

    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể lấy thông tin mức độ khẩn cấp'
    )
  }
}

/**
 * Lấy danh sách các ngành nghề được hỗ trợ
 *
 * @returns {Promise<Object>} Danh sách ngành nghề
 */
const getCareerIndustries = async () => {
  try {
    const result = await aiProvider.getCareerIndustries()
    return result
  } catch (error) {
    if (error.isApiError) {
      throw error
    }

    console.error('[AIService] getCareerIndustries error:', error)

    if (error.code === 'ECONNREFUSED') {
      throw new ApiError(
        StatusCodes.SERVICE_UNAVAILABLE,
        'AI Service hiện không khả dụng'
      )
    }

    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể lấy danh sách ngành nghề'
    )
  }
}

// ============================================================================
// SEMANTIC SEARCH SERVICES
// ============================================================================

/**
 * Kiểm tra trạng thái semantic search
 *
 * @returns {Promise<Object>} Trạng thái semantic search
 */
const getSemanticStatus = async () => {
  try {
    const result = await aiProvider.getSemanticStatus()
    return result
  } catch (error) {
    if (error.isApiError) {
      throw error
    }

    console.error('[AIService] getSemanticStatus error:', error)

    if (error.code === 'ECONNREFUSED') {
      throw new ApiError(
        StatusCodes.SERVICE_UNAVAILABLE,
        'AI Service hiện không khả dụng'
      )
    }

    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể lấy trạng thái semantic search'
    )
  }
}

/**
 * Tìm jobs tương tự dựa trên semantic search
 *
 * @param {string} jobId - Job ID
 * @param {number} limit - Số lượng kết quả
 * @returns {Promise<Object>} Danh sách jobs tương tự
 */
const getSimilarJobs = async (jobId, limit = 5) => {
  try {
    if (!jobId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Job ID là bắt buộc')
    }

    const cappedLimit = Math.min(20, Math.max(1, limit || 5))
    const result = await aiProvider.getSimilarJobs(jobId, cappedLimit)
    return result
  } catch (error) {
    if (error.isApiError) {
      throw error
    }

    console.error('[AIService] getSimilarJobs error:', error)

    if (error.code === 'ECONNREFUSED') {
      throw new ApiError(
        StatusCodes.SERVICE_UNAVAILABLE,
        'AI Service hiện không khả dụng'
      )
    }

    if (error.response?.status === 503) {
      throw new ApiError(
        StatusCodes.SERVICE_UNAVAILABLE,
        'Semantic search hiện không khả dụng'
      )
    }

    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể tìm jobs tương tự'
    )
  }
}

// ============================================================================
// CAREER TRANSITIONS SERVICES (35+)
// ============================================================================

/**
 * Lấy gợi ý chuyển đổi nghề nghiệp cho lao động 35+
 *
 * @param {Object} profileData - Dữ liệu hồ sơ người lao động
 * @returns {Promise<Object>} Kết quả transitions
 */
const getCareerTransitions = async (profileData) => {
  try {
    // Validate required fields
    if (!profileData.age) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Tuổi là bắt buộc để khám phá chuyển đổi nghề')
    }
    if (!profileData.current_role) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Vị trí hiện tại là bắt buộc')
    }
    if (!profileData.current_industry) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Ngành hiện tại là bắt buộc')
    }

    const result = await aiProvider.getCareerTransitions(profileData)
    return result
  } catch (error) {
    if (error.isApiError) {
      throw error
    }

    console.error('[AIService] getCareerTransitions error:', error)

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new ApiError(
        StatusCodes.SERVICE_UNAVAILABLE,
        'AI Service hiện không khả dụng. Vui lòng thử lại sau.'
      )
    }

    if (error.response?.status === 400) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        error.response?.data?.detail || 'Dữ liệu không hợp lệ cho việc khám phá chuyển đổi nghề'
      )
    }

    if (error.response?.status === 500) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Lỗi từ AI Service khi khám phá chuyển đổi nghề'
      )
    }

    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể khám phá chuyển đổi nghề. Vui lòng thử lại.'
    )
  }
}

/**
 * Lấy mức độ khẩn cấp chuyển đổi nghề theo tuổi (35+)
 *
 * @param {number} age - Tuổi người dùng
 * @returns {Promise<Object>} Thông tin mức độ khẩn cấp
 */
const getTransitionsUrgency = async (age) => {
  try {
    if (!age || age < 18 || age > 70) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Tuổi phải từ 18 đến 70')
    }

    const result = await aiProvider.getTransitionsUrgency(age)
    return result
  } catch (error) {
    if (error.isApiError) {
      throw error
    }

    console.error('[AIService] getTransitionsUrgency error:', error)

    if (error.code === 'ECONNREFUSED') {
      throw new ApiError(
        StatusCodes.SERVICE_UNAVAILABLE,
        'AI Service hiện không khả dụng'
      )
    }

    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể lấy thông tin mức độ khẩn cấp'
    )
  }
}

/**
 * Lấy danh sách ngành nghề được hỗ trợ cho chuyển đổi (35+)
 *
 * @returns {Promise<Object>} Danh sách ngành nghề
 */
const getTransitionsIndustries = async () => {
  try {
    const result = await aiProvider.getTransitionsIndustries()
    return result
  } catch (error) {
    if (error.isApiError) {
      throw error
    }

    console.error('[AIService] getTransitionsIndustries error:', error)

    if (error.code === 'ECONNREFUSED') {
      throw new ApiError(
        StatusCodes.SERVICE_UNAVAILABLE,
        'AI Service hiện không khả dụng'
      )
    }

    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể lấy danh sách ngành nghề'
    )
  }
}

/**
 * Lấy skill gaps cho một ngành cụ thể (35+)
 *
 * @param {string} industry - Ngành cần xem skill gaps
 * @returns {Promise<Object>} Skill gaps cho ngành
 */
const getTransitionsSkills = async (industry) => {
  try {
    if (!industry) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Ngành là bắt buộc')
    }

    const result = await aiProvider.getTransitionsSkills(industry)
    return result
  } catch (error) {
    if (error.isApiError) {
      throw error
    }

    console.error('[AIService] getTransitionsSkills error:', error)

    if (error.code === 'ECONNREFUSED') {
      throw new ApiError(
        StatusCodes.SERVICE_UNAVAILABLE,
        'AI Service hiện không khả dụng'
      )
    }

    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể lấy thông tin skill gaps'
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
  getModelInfo,
  discoverCareerPath,
  getAgeUrgency,
  getCareerIndustries,
  getSemanticStatus,
  getSimilarJobs,
  // Career Transitions (35+)
  getCareerTransitions,
  getTransitionsUrgency,
  getTransitionsIndustries,
  getTransitionsSkills
}