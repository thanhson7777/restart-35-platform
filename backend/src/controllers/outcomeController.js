/**
 * Outcome Controller - Xử lý request cho Job Outcome Tracking
 * Phục vụ ML system - theo dõi kết quả ứng tuyển và thu thập feedback
 */

import { outcomeService } from '~/services/outcomeService'
import { StatusCodes } from 'http-status-codes'

/**
 * Tạo outcome từ apply
 * POST /v1/outcomes
 *
 * @param {string} req.body.userId - User ID
 * @param {string} req.body.jobId - Job ID
 * @param {string} [req.body.jobTitle] - Job title
 * @param {string} [req.body.companyName] - Company name
 * @param {Object} [req.body.metadata] - Additional metadata
 */
const createOutcome = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const { jobId, jobTitle, companyName, metadata } = req.body

    const outcome = await outcomeService.createFromInteraction(
      userId,
      jobId,
      jobTitle,
      companyName,
      metadata || {}
    )

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Ứng tuyển thành công!',
      data: outcome
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy tất cả outcomes của user hiện tại
 * GET /v1/outcomes/me
 *
 * @query {string} [status] - Filter by status
 * @query {number} [limit] - Number of results (default: 50)
 * @query {number} [skip] - Skip results (default: 0)
 */
const getMyOutcomes = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const { status, limit, skip } = req.query

    const outcomes = await outcomeService.getUserOutcomes(userId, {
      status,
      limit: parseInt(limit) || 50,
      skip: parseInt(skip) || 0
    })

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách thành công!',
      data: {
        outcomes,
        count: outcomes.length
      }
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy chi tiết một outcome
 * GET /v1/outcomes/:outcomeId
 */
const getOutcomeById = async (req, res, next) => {
  try {
    const { outcomeId } = req.params

    const outcome = await outcomeService.getOutcomeById(outcomeId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy chi tiết thành công!',
      data: outcome
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Update status của outcome
 * PUT /v1/outcomes/:outcomeId/status
 *
 * @param {string} req.params.outcomeId - Outcome ID
 * @param {string} req.body.status - New status
 * @param {Object} [req.body.additionalData] - Additional data
 */
const updateStatus = async (req, res, next) => {
  try {
    const { outcomeId } = req.params
    const { status, additionalData } = req.body

    const updated = await outcomeService.updateOutcomeStatus(outcomeId, status, additionalData || {})

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cập nhật trạng thái thành công!',
      data: updated
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Submit feedback cho outcome
 * POST /v1/outcomes/:outcomeId/feedback
 *
 * @param {string} req.params.outcomeId - Outcome ID
 * @param {number} [req.body.rating] - Rating (1-5)
 * @param {string} [req.body.comment] - Comment
 * @param {boolean} [req.body.wouldApplyAgain] - Would apply again?
 * @param {boolean} [req.body.recommendToOthers] - Recommend to others?
 */
const submitFeedback = async (req, res, next) => {
  try {
    const { outcomeId } = req.params
    const { rating, comment, wouldApplyAgain, recommendToOthers, pros, cons } = req.body

    const feedbackData = {
      rating,
      comment,
      wouldApplyAgain,
      recommendToOthers,
      pros: pros || [],
      cons: cons || []
    }

    const updated = await outcomeService.submitFeedback(outcomeId, feedbackData)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Gửi feedback thành công!',
      data: updated
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy thống kê thành công của user
 * GET /v1/outcomes/me/stats
 */
const getMyStats = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()

    const stats = await outcomeService.getUserSuccessStats(userId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thống kê thành công!',
      data: stats
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy preferences của user (dùng cho ML)
 * GET /v1/outcomes/me/preferences
 */
const getMyPreferences = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()

    const preferences = await outcomeService.getUserPreferencesFromOutcomes(userId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy preferences thành công!',
      data: preferences
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Withdraw/Rút đơn ứng tuyển
 * DELETE /v1/outcomes/:outcomeId
 */
const withdrawOutcome = async (req, res, next) => {
  try {
    const { outcomeId } = req.params
    const { reason } = req.body

    const updated = await outcomeService.withdrawOutcome(outcomeId, reason || '')

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Đã rút đơn ứng tuyển!',
      data: updated
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy thống kê job (admin)
 * GET /v1/outcomes/jobs/:jobId/stats
 */
const getJobStats = async (req, res, next) => {
  try {
    const { jobId } = req.params

    const stats = await outcomeService.getJobStats(jobId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thống kê thành công!',
      data: stats
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy thống kê tổng hợp (admin)
 * GET /v1/outcomes/stats
 */
const getAggregatedStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query

    const stats = await outcomeService.getAggregatedStats({
      startDate,
      endDate
    })

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thống kê thành công!',
      data: stats
    })
  } catch (error) {
    next(error)
  }
}

export const outcomeController = {
  createOutcome,
  getMyOutcomes,
  getOutcomeById,
  updateStatus,
  submitFeedback,
  getMyStats,
  getMyPreferences,
  withdrawOutcome,
  getJobStats,
  getAggregatedStats
}
