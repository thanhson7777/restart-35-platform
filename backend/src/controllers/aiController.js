/**
 * AI Controller - Xử lý request cho AI features
 * Cầu nối giữa routes và service layer
 */

import { aiService } from '~/services/aiService'
import { StatusCodes } from 'http-status-codes'

/**
 * Gợi ý công việc cho user
 * POST /v1/ai/recommend-jobs
 *
 * @param {Object} req.body - Worker profile data
 * @param {string[]} req.body.skills - Danh sách skills
 * @param {number} req.body.experience - Số năm kinh nghiệm
 * @param {string} [req.body.location] - Địa điểm mong muốn
 * @param {string} [req.body.targetJob] - Công việc mong muốn
 * @param {number} [req.body.targetSalary] - Mức lương mong muốn
 * @param {string} [req.body.preferredJobType] - Loại công việc ưa thích
 * @param {number} [req.body.limit] - Số lượng kết quả (default: 10)
 * @param {boolean} [req.body.allowRemote] - Cho phép remote
 */
const recommendJobs = async (req, res, next) => {
  try {
    const {
      skills,
      experience,
      location,
      targetJob,
      targetSalary,
      preferredJobType,
      limit,
      allowRemote
    } = req.body

    const result = await aiService.getRecommendedJobs({
      skills,
      experience,
      location,
      targetJob,
      targetSalary,
      preferredJobType,
      limit,
      allowRemote
    })

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Gợi ý việc làm thành công',
      data: result.data
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy danh sách tất cả jobs
 * GET /v1/ai/jobs
 *
 * @param {Object} req.query - Query parameters
 * @param {number} req.query.limit - Số lượng jobs tối đa (default: 50)
 * @param {string} req.query.location - Tỉnh/TP mong muốn
 * @param {string} req.query.jobType - Loại công việc
 * @param {number} req.query.salaryMin - Mức lương tối thiểu
 * @param {number} req.query.salaryMax - Mức lương tối đa
 * @param {number} req.query.postedWithin - Jobs đăng trong N ngày
 * @param {string} req.query.skills - Lọc theo kỹ năng (comma-separated)
 * @param {number} req.query.matchMin - Match score tối thiểu
 */
const getAllJobs = async (req, res, next) => {
  try {
    const {
      limit,
      location,
      jobType,
      salaryMin,
      salaryMax,
      postedWithin,
      skills,
      matchMin
    } = req.query

    const result = await aiService.getAllJobs({
      limit: parseInt(limit) || 50,
      location,
      jobType,
      salaryMin: salaryMin ? parseInt(salaryMin) : undefined,
      salaryMax: salaryMax ? parseInt(salaryMax) : undefined,
      postedWithin: postedWithin ? parseInt(postedWithin) : undefined,
      skills: skills ? skills.split(',') : undefined,
      matchMin: matchMin ? parseInt(matchMin) : undefined
    })

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách việc làm thành công',
      data: result.data
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy thông tin chi tiết một job
 * GET /v1/ai/jobs/:id
 *
 * @param {string} req.params.id - Job ID
 */
const getJobById = async (req, res, next) => {
  try {
    const { id } = req.params
    const result = await aiService.getJobById(id)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thông tin việc làm thành công',
      data: result.data
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Dự đoán rủi ro thất nghiệp của người lao động
 * POST /v1/ai/predict-risk
 *
 * @param {Object} req.body - Worker data for risk prediction
 * @param {number} req.body.age - Tuổi (35-65)
 * @param {string} req.body.gender - Giới tính (male/female)
 * @param {string} [req.body.education] - Trình độ học vấn
 * @param {number} [req.body.experience_years] - Số năm kinh nghiệm
 * @param {string} [req.body.employment_status] - Tình trạng việc làm
 * @param {string} [req.body.marital_status] - Tình trạng hôn nhân
 * @param {number} [req.body.target_salary] - Mức lương mong muốn
 * @param {string} [req.body.region] - Khu vực
 * @param {string[]} req.body.skills - Danh sách kỹ năng
 * @param {string} [req.body.target_job] - Công việc mong muốn
 * @param {string} [req.body.preferred_job_type] - Loại công việc ưa thích
 */
const predictRisk = async (req, res, next) => {
  try {
    const workerData = req.body

    const result = await aiService.predictRisk(workerData)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Dự đoán rủi ro thành công',
      data: result.data
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Phân tích tổng hợp người lao động (risk + recommendations)
 * POST /v1/ai/analyze-worker
 *
 * @param {Object} req.body - Worker data for comprehensive analysis
 * @param {number} req.body.age - Tuổi
 * @param {string[]} req.body.skills - Danh sách kỹ năng
 * @param {number} [req.body.limit] - Số lượng job recommendations
 */
const analyzeWorker = async (req, res, next) => {
  try {
    const workerData = req.body

    const result = await aiService.analyzeWorker(workerData)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Phân tích người lao động thành công',
      data: result.data
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Health check AI Service
 * GET /v1/ai/health
 */
const healthCheck = async (req, res, next) => {
  try {
    const result = await aiService.healthCheck()

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'AI Service status',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy feature importance từ model
 * GET /v1/ai/feature-importance
 */
const getFeatureImportance = async (req, res, next) => {
  try {
    const result = await aiService.getFeatureImportance()

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy feature importance thành công',
      data: result.data
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy thông tin model đang sử dụng
 * GET /v1/ai/model-info
 */
const getModelInfo = async (req, res, next) => {
  try {
    const result = await aiService.getModelInfo()

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thông tin model thành công',
      data: result.data
    })
  } catch (error) {
    next(error)
  }
}

// ============================================================================
// CAREER PATH CONTROLLERS
// ============================================================================

/**
 * Khám phá lộ trình sự nghiệp
 * POST /v1/ai/career-path
 */
const discoverCareerPath = async (req, res, next) => {
  try {
    const {
      age,
      currentRole,
      currentIndustry,
      experiences,
      targetSalary,
      workPreference,
      includeAgeTransition,
      includeManagementTrack
    } = req.body

    const result = await aiService.discoverCareerPath({
      age,
      currentRole,
      currentIndustry,
      experiences,
      targetSalary,
      workPreference,
      includeAgeTransition,
      includeManagementTrack
    })

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Khám phá lộ trình sự nghiệp thành công',
      data: result.data
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy mức độ khẩn cấp chuyển đổi nghề theo tuổi
 * GET /v1/ai/career-path/urgency
 */
const getAgeUrgency = async (req, res, next) => {
  try {
    const { age } = req.query

    if (!age) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Tham số age là bắt buộc'
      })
    }

    const result = await aiService.getAgeUrgency(parseInt(age))

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy mức độ khẩn cấp thành công',
      data: result.data
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy danh sách các ngành nghề được hỗ trợ
 * GET /v1/ai/career-path/industries
 */
const getCareerIndustries = async (req, res, next) => {
  try {
    const result = await aiService.getCareerIndustries()

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách ngành nghề thành công',
      data: result.data
    })
  } catch (error) {
    next(error)
  }
}

// ============================================================================
// SEMANTIC SEARCH CONTROLLERS
// ============================================================================

/**
 * Kiểm tra trạng thái semantic search
 * GET /v1/ai/semantic-status
 */
const getSemanticStatus = async (req, res, next) => {
  try {
    const result = await aiService.getSemanticStatus()

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy trạng thái semantic search thành công',
      data: result.data
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Tìm jobs tương tự dựa trên semantic search
 * GET /v1/ai/jobs/:id/similar
 */
const getSimilarJobs = async (req, res, next) => {
  try {
    const { id } = req.params
    const { limit } = req.query

    const result = await aiService.getSimilarJobs(id, parseInt(limit) || 5)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Tìm jobs tương tự thành công',
      data: result.data
    })
  } catch (error) {
    next(error)
  }
}

// Export controller functions
export const aiController = {
  recommendJobs,
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
  getSimilarJobs
}