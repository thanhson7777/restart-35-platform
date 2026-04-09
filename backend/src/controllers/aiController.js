/**
 * AI Controller - Xử lý request cho AI features
 */

import { aiService } from '~/services/aiService'
import { StatusCodes } from 'http-status-codes'

/**
 * Gợi ý công việc cho user
 * POST /v1/ai/recommend-jobs
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

export const aiController = {
  recommendJobs,
  getAllJobs,
  getJobById,
  healthCheck
}

export default aiController
