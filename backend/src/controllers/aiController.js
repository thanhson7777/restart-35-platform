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
 * @param {Object} req.query.limit - Số lượng jobs tối đa (default: 50)
 */
const getAllJobs = async (req, res, next) => {
  try {
    const { limit } = req.query
    const result = await aiService.getAllJobs(parseInt(limit) || 50)

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

// Export controller functions
export const aiController = {
  recommendJobs,
  getAllJobs,
  getJobById,
  predictRisk,
  analyzeWorker,
  healthCheck,
  getFeatureImportance,
  getModelInfo
}