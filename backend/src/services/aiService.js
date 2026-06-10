/**
 * AI Service - Business Logic cho AI features
 * Xử lý các business logic liên quan đến AI/ML features
 */

import { aiProvider } from '~/providers/aiProvider'
import { careerRecommendationModel } from '~/models/careerRecommendationModel'
import { env } from '~/config/enviroment'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import axios from 'axios'
import crypto from 'crypto'

/**
 * Compute MD5 hash of a profile object for cache invalidation.
 * @param {Object} profile - User profile object
 * @returns {string} MD5 hex hash
 */
const computeProfileHash = (profile) => {
  const str = JSON.stringify(profile, Object.keys(profile).sort())
  return crypto.createHash('md5').update(str).digest('hex')
}

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

// ============================================================================
// RAG (Retrieval-Augmented Generation) SERVICES
// ============================================================================

/**
 * Trigger RAG-based career recommendation cho user
 *
 * @param {string} userId - User ID
 * @param {Object} profile - User profile data
 * @returns {Promise<Object>} RAG recommendation result
 */
const triggerRAGCareerRecommendation = async (userId, profile) => {
  try {
    // Validate required profile data
    if (!profile || !profile.basicInfo || !profile.basicInfo.age) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Profile data là bắt buộc')
    }

    // Call AI Service RAG endpoint
    const ragResult = await aiProvider.getRAGCareerRecommendation(profile)

    if (!ragResult.success) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        ragResult.message || 'RAG recommendation failed'
      )
    }

    // Save to MongoDB
    const profileHash = computeProfileHash(profile)
    const updateData = {
      ragRecommendations: {
        best_fits: ragResult.best_fits || [],
        income_boost: ragResult.income_boost || [],
        progression: ragResult.progression || []
      },
      ragSources: ragResult.sources || [],
      ragGeneratedAt: new Date(),
      ragRefreshCount: 1,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      status: 'active',
      scoringMethod: 'rag',
      profileHash
    }

    await careerRecommendationModel.upsertByUserId(userId, updateData)

    return {
      success: true,
      data: ragResult,
      meta: {
        userId,
        sources: ragResult.sources || [],
        generatedAt: new Date().toISOString(),
        expiresIn: '7 days'
      }
    }
  } catch (error) {
    if (error.isApiError) {
      throw error
    }

    console.error('[AIService] triggerRAGCareerRecommendation error:', error)

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new ApiError(
        StatusCodes.SERVICE_UNAVAILABLE,
        'AI Service hiện không khả dụng. Vui lòng thử lại sau.'
      )
    }

    if (error.response?.status === 503) {
      throw new ApiError(
        StatusCodes.SERVICE_UNAVAILABLE,
        'RAG system hiện không khả dụng'
      )
    }

    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể tạo RAG recommendation. Vui lòng thử lại.'
    )
  }
}

/**
 * Lấy cached RAG recommendation cho user
 *
 * @param {string} userId - User ID
 * @param {Object} [currentProfile] - Current profile to compare hash
 * @returns {Promise<Object>} Cached RAG recommendation
 */
const getCachedRAGRecommendation = async (userId, currentProfile = null) => {
  try {
    if (!userId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'User ID là bắt buộc')
    }

    // Get from MongoDB
    const cachedData = await careerRecommendationModel.getRAGRecommendationsByUserId(userId)

    if (!cachedData || !cachedData.ragRecommendations) {
      return {
        success: false,
        data: null,
        message: 'Chưa có RAG recommendation cho user này',
        meta: {
          hasData: false,
          recommendation: 'Goi API trigger de tao moi'
        }
      }
    }

    // Check if profile has changed → force regenerate
    if (currentProfile && cachedData.profileHash) {
      const currentHash = computeProfileHash(currentProfile)
      if (cachedData.profileHash !== currentHash) {
        return {
          success: false,
          data: null,
          message: 'Profile đã thay đổi, cần regenerate',
          meta: {
            hasData: false,
            stale: true,
            forceRegenerate: true
          }
        }
      }
    }

    // Check if expired
    const isExpired = cachedData.expiresAt && new Date(cachedData.expiresAt) < new Date()

    return {
      success: true,
      data: cachedData.ragRecommendations,
      meta: {
        userId,
        sources: cachedData.ragSources || [],
        generatedAt: cachedData.ragGeneratedAt,
        refreshCount: cachedData.ragRefreshCount || 0,
        expiresAt: cachedData.expiresAt,
        isFresh: !isExpired,
        isExpired,
        status: cachedData.status
      }
    }
  } catch (error) {
    if (error.isApiError) {
      throw error
    }

    console.error('[AIService] getCachedRAGRecommendation error:', error)
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể lấy cached RAG recommendation'
    )
  }
}

/**
 * Refresh RAG recommendation cho user
 *
 * @param {string} userId - User ID
 * @param {Object} profile - User profile data
 * @returns {Promise<Object>} Refreshed RAG recommendation
 */
const refreshRAGRecommendation = async (userId, profile) => {
  try {
    if (!userId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'User ID là bắt buộc')
    }

    if (!profile || !profile.basicInfo) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Profile data là bắt buộc')
    }

    // Get current recommendation to check refresh count
    const currentData = await careerRecommendationModel.getRAGRecommendationsByUserId(userId)
    const currentCount = currentData?.ragRefreshCount || 0

    // Rate limit: max 1 refresh per day (consider 24 hours)
    if (currentCount > 0) {
      const lastRefresh = currentData?.ragGeneratedAt
      if (lastRefresh) {
        const hoursSinceLastRefresh = (Date.now() - new Date(lastRefresh).getTime()) / (1000 * 60 * 60)
        if (hoursSinceLastRefresh < 24) {
          throw new ApiError(
            StatusCodes.TOO_MANY_REQUESTS,
            `Đã refresh gần đây. Vui lòng chờ ${Math.ceil(24 - hoursSinceLastRefresh)} giờ trước khi refresh tiếp.`
          )
        }
      }
    }

    // Call AI Service
    const ragResult = await aiProvider.getRAGCareerRecommendation(profile)

    if (!ragResult.success) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        ragResult.message || 'RAG refresh failed'
      )
    }

    // Update MongoDB
    const profileHash = computeProfileHash(profile)
    const updateData = {
      ragRecommendations: {
        best_fits: ragResult.best_fits || [],
        income_boost: ragResult.income_boost || [],
        progression: ragResult.progression || []
      },
      ragSources: ragResult.sources || [],
      ragGeneratedAt: new Date(),
      ragRefreshCount: currentCount + 1,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'active',
      scoringMethod: 'rag',
      profileHash
    }

    await careerRecommendationModel.updateRAGRecommendations(userId, updateData)

    return {
      success: true,
      data: ragResult,
      meta: {
        userId,
        sources: ragResult.sources || [],
        generatedAt: new Date().toISOString(),
        refreshCount: currentCount + 1,
        expiresIn: '7 days'
      }
    }
  } catch (error) {
    if (error.isApiError) {
      throw error
    }

    console.error('[AIService] refreshRAGRecommendation error:', error)

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new ApiError(
        StatusCodes.SERVICE_UNAVAILABLE,
        'AI Service hiện không khả dụng'
      )
    }

    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể refresh RAG recommendation'
    )
  }
}

/**
 * Lấy RAG data sources
 *
 * @returns {Promise<Object>} RAG data sources
 */
const getRAGSources = async () => {
  try {
    const result = await aiProvider.getRAGSources()
    return result
  } catch (error) {
    console.error('[AIService] getRAGSources error:', error)
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể lấy RAG sources'
    )
  }
}

/**
 * Kiểm tra trạng thái RAG system
 *
 * @returns {Promise<Object>} RAG health status
 */
const getRAGHealth = async () => {
  try {
    const result = await aiProvider.getRAGHealth()
    return result
  } catch (error) {
    console.error('[AIService] getRAGHealth error:', error)
    return {
      status: 'error',
      message: 'Khong the kiem tra trang thai RAG',
      error: error.message
    }
  }
}

/**
 * Get RAG-based startup suggestions
 * @param {Object} profile - User profile data
 * @param {string} budget - Budget for startup
 * @returns {Promise<Object>} - Startup suggestions
 */
const getRAGStartupSuggestions = async (profile, budget = '50-100 triệu') => {
  try {
    const result = await aiProvider.getRAGStartupSuggestions(profile, budget)
    return result
  } catch (error) {
    console.error('[AIService] getRAGStartupSuggestions error:', error)
    throw error
  }
}

/**
 * Get RAG-based skills gap analysis
 * @param {Object} profile - User profile data
 * @returns {Promise<Object>} - Skills gap analysis
 */
const getRAGSkillsGap = async (profile) => {
  try {
    const result = await aiProvider.getRAGSkillsGap(profile)
    return result
  } catch (error) {
    console.error('[AIService] getRAGSkillsGap error:', error)
    throw error
  }
}

// ============================================================================
// ESCO SKILL GAP SERVICE
// ============================================================================

/**
 * Analyze ESCO skill gaps
 * @param {Object} params - { user_skills, target_occupation, age, max_gaps }
 * @returns {Promise<Object>} - Skill gap analysis
 */
const analyzeEscoSkillGaps = async (params) => {
  try {
    const { user_skills, target_occupation, age, max_gaps, career_context } = params

    const response = await axios.post(
      `${env.AI_SERVICE_URL}/api/v1/skill-gap/esco`,
      {
        user_skills,
        target_occupation,
        age: age || 30,
        max_gaps: max_gaps || 15,
        career_context: career_context || null
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      }
    )

    return response.data
  } catch (error) {
    console.error('[AIService] analyzeEscoSkillGaps error:', error.message)
    throw error
  }
}

/**
 * Get ESCO skill gap service health
 * @returns {Promise<Object>} - Health status
 */
const getSkillGapHealth = async () => {
  try {
    console.log('[AIService] getSkillGapHealth - AI_SERVICE_URL:', env.AI_SERVICE_URL)
    const response = await axios.get(
      `${env.AI_SERVICE_URL}/api/v1/skill-gap/health`,
      { timeout: 30000 }
    )
    console.log('[AIService] getSkillGapHealth - response:', response.data)
    return response.data
  } catch (error) {
    console.error('[AIService] getSkillGapHealth error:', error.message)
    console.error('[AIService] getSkillGapHealth error details:', error.code)
    return {
      status: 'unavailable',
      message: 'Không thể kết nối đến AI Service'
    }
  }
}

// ============================================================================
// COURSE RECOMMENDATION SERVICE
// ============================================================================

/**
 * Get course recommendations based on skill gaps
 * @param {Object} params - { skill_gaps, constraints, limit }
 * @returns {Promise<Object>} - Course recommendations
 */
const getCourseRecommendations = async ({ skill_gaps, constraints = {}, limit = 10 }) => {
  try {
    if (!skill_gaps || skill_gaps.length === 0) {
      return { success: true, courses: [] }
    }

    const response = await axios.post(
      `${env.AI_SERVICE_URL}/api/v1/ai/course-recommendations`,
      { skill_gaps, constraints, limit },
      { headers: { 'Content-Type': 'application/json' }, timeout: 60000 }
    )

    return response.data
  } catch (error) {
    console.error('[AIService] getCourseRecommendations error:', error.message)
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể lấy gợi ý khóa học'
    )
  }
}

/**
 * Get learning path with LLM explanations
 * @param {Object} params - { skill_gaps, courses, job_title, max_steps }
 * @returns {Promise<Object>} - Learning path with steps + LLM explanations
 */
const getLearningPath = async ({ skill_gaps, courses = [], job_title = '', max_steps = 5 }) => {
  try {
    if (!skill_gaps || skill_gaps.length === 0) {
      return { success: true, learning_path: null, courses_with_explanations: [] }
    }

    const response = await axios.post(
      `${env.AI_SERVICE_URL}/api/v1/ai/learning-path`,
      { skill_gaps, courses, job_title, max_steps },
      { headers: { 'Content-Type': 'application/json' }, timeout: 90000 }
    )

    return response.data
  } catch (error) {
    console.error('[AIService] getLearningPath error:', error.message)
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể tạo lộ trình học'
    )
  }
}

// ============================================================================
// Cache Invalidation
// ============================================================================

/**
 * Xóa in-memory RAG cache trong AI Service.
 * @returns {Promise<Object>} { success: boolean }
 */
const invalidateAIRAGCache = async () => {
  try {
    const AI_SERVICE_URL = `http://${env.AI_SERVICE_HOST}:${env.AI_SERVICE_PORT}`
    await axios.delete(
      `${AI_SERVICE_URL}/api/v1/ai/rag/cache`,
      { timeout: 5000 }
    )
    return { success: true }
  } catch (error) {
    console.warn('[AIService] AI in-memory cache invalidation failed:', error.message)
    return { success: false }
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
  getTransitionsSkills,
  // RAG Services
  triggerRAGCareerRecommendation,
  getCachedRAGRecommendation,
  refreshRAGRecommendation,
  getRAGSources,
  getRAGHealth,
  // RAG Startup & Skills Gap
  getRAGStartupSuggestions,
  getRAGSkillsGap,
  // ESCO Skill Gap
  analyzeEscoSkillGaps,
  getSkillGapHealth,
  // Course Recommendations
  getCourseRecommendations,
  // Learning Path
  getLearningPath,
  // Cache Invalidation
  invalidateAIRAGCache
}