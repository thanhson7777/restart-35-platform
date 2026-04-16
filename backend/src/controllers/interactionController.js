/**
 * Interaction Controller - Xử lý request cho User Interaction Tracking
 * Phục vụ ML system - theo dõi hành vi người dùng
 */

import { interactionService } from '~/services/interactionService'
import { StatusCodes } from 'http-status-codes'

/**
 * Ghi nhận một interaction từ user
 * POST /v1/interactions
 *
 * @param {string} req.body.userId - User ID
 * @param {string} req.body.jobId - Job ID
 * @param {string} req.body.action - Action type (click, view, apply, bookmark, skip)
 * @param {Object} [req.body.context] - Context data (page, position, sessionId)
 * @param {Object} [req.body.metadata] - Job metadata
 */
const createInteraction = async (req, res, next) => {
  try {
    const {
      userId,
      jobId,
      jobTitle,
      companyName,
      action,
      context,
      viewDuration,
      metadata,
      device
    } = req.body

    const interaction = await interactionService.createInteraction({
      userId,
      jobId,
      jobTitle,
      companyName,
      action,
      context,
      viewDuration,
      metadata,
      device
    })

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Interaction recorded successfully',
      data: interaction
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Ghi nhận nhiều interactions cùng lúc
 * POST /v1/interactions/batch
 *
 * @param {Array} req.body.interactions - Array of interaction objects
 */
const createBatchInteractions = async (req, res, next) => {
  try {
    const { interactions } = req.body

    if (!Array.isArray(interactions) || interactions.length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'interactions must be a non-empty array'
      })
    }

    const result = await interactionService.createBatchInteractions(interactions)

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: `${result.insertedCount} interactions recorded`,
      data: result
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy lịch sử interaction của một user
 * GET /v1/interactions/user/:userId
 *
 * @param {string} req.params.userId - User ID
 * @param {string} [req.query.action] - Filter by action type
 * @param {number} [req.query.limit] - Number of results (default: 50)
 * @param {number} [req.query.skip] - Skip results (default: 0)
 */
const getUserInteractions = async (req, res, next) => {
  try {
    const { userId } = req.params
    const { action, limit, skip } = req.query

    const interactions = await interactionService.getUserInteractions(userId, {
      action,
      limit: parseInt(limit) || 50,
      skip: parseInt(skip) || 0
    })

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'User interactions retrieved',
      data: {
        interactions,
        count: interactions.length
      }
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy engagement score của user (tổng điểm tương tác)
 * GET /v1/interactions/user/:userId/engagement
 */
const getUserEngagement = async (req, res, next) => {
  try {
    const { userId } = req.params
    const engagement = await interactionService.getUserEngagementScore(userId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'User engagement score retrieved',
      data: engagement
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy danh sách similar users cho collaborative filtering
 * GET /v1/interactions/user/:userId/similar
 *
 * @param {string} req.params.userId - User ID
 * @param {number} [req.query.limit] - Number of similar users (default: 10)
 */
const getSimilarUsers = async (req, res, next) => {
  try {
    const { userId } = req.params
    const { limit } = req.query

    const similarUsers = await interactionService.getSimilarUsers(userId, parseInt(limit) || 10)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Similar users retrieved',
      data: {
        similarUsers,
        count: similarUsers.length
      }
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy job recommendations dựa trên collaborative filtering
 * GET /v1/interactions/user/:userId/cf-recommendations
 *
 * @param {string} req.params.userId - User ID
 * @param {number} [req.query.limit] - Number of recommendations (default: 10)
 */
const getCFRecommendations = async (req, res, next) => {
  try {
    const { userId } = req.params
    const { limit } = req.query

    const recommendations = await interactionService.getCFRecommendations(userId, parseInt(limit) || 10)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Collaborative filtering recommendations retrieved',
      data: recommendations
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy popularity score của một job
 * GET /v1/interactions/jobs/:jobId/popularity
 */
const getJobPopularity = async (req, res, next) => {
  try {
    const { jobId } = req.params
    const popularity = await interactionService.getJobPopularityScore(jobId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Job popularity retrieved',
      data: popularity
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy thống kê tổng quan (admin)
 * GET /v1/interactions/stats
 *
 * @param {string} [req.query.startDate] - Start date filter
 * @param {string} [req.query.endDate] - End date filter
 */
const getStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query

    const [stats, actionCounts, topJobs, activeUsers] = await Promise.all([
      interactionService.getStats({ startDate, endDate }),
      interactionService.countByAction(),
      interactionService.getTopJobs('click', 20),
      interactionService.getActiveUsersCount(7)
    ])

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Statistics retrieved',
      data: {
        dailyStats: stats,
        actionCounts,
        topJobs,
        activeUsersLast7Days: activeUsers
      }
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy độ tương đồng giữa 2 users
 * GET /v1/interactions/users/:userId1/similarity/:userId2
 */
const getUserSimilarity = async (req, res, next) => {
  try {
    const { userId1, userId2 } = req.params
    const similarity = await interactionService.getUserUserSimilarity(userId1, userId2)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'User similarity retrieved',
      data: similarity
    })
  } catch (error) {
    next(error)
  }
}

export const interactionController = {
  createInteraction,
  createBatchInteractions,
  getUserInteractions,
  getUserEngagement,
  getSimilarUsers,
  getCFRecommendations,
  getJobPopularity,
  getStats,
  getUserSimilarity
}