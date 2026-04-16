/**
 * Interaction Service - Business Logic cho User Interaction Tracking
 * Phục vụ ML system - theo dõi và phân tích hành vi người dùng
 */

import { interactionModel, INTERACTION_TYPES, INTERACTION_WEIGHTS } from '~/models/interactionModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'

/**
 * Ghi nhận một interaction
 *
 * @param {Object} data - Interaction data
 * @returns {Promise<Object>} Created interaction
 */
const createInteraction = async (data) => {
  try {
    const { userId, jobId, action } = data

    // Validate required fields
    if (!userId || !jobId || !action) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'userId, jobId, và action là bắt buộc'
      )
    }

    // Validate action type
    if (!Object.values(INTERACTION_TYPES).includes(action)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Action không hợp lệ. Các giá trị hợp lệ: ${Object.values(INTERACTION_TYPES).join(', ')}`
      )
    }

    const interaction = await interactionModel.createNew(data)
    return interaction
  } catch (error) {
    if (error.isApiError) {
      throw error
    }
    console.error('[InteractionService] createInteraction error:', error)
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể ghi nhận interaction'
    )
  }
}

/**
 * Ghi nhận nhiều interactions cùng lúc (batch)
 *
 * @param {Array} interactions - Array of interaction objects
 * @returns {Promise<Object>} Insert result
 */
const createBatchInteractions = async (interactions) => {
  try {
    if (!Array.isArray(interactions) || interactions.length === 0) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'interactions phải là một mảng không rỗng'
      )
    }

    const result = await interactionModel.createMany(interactions)
    return result
  } catch (error) {
    if (error.isApiError) {
      throw error
    }
    console.error('[InteractionService] createBatchInteractions error:', error)
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể ghi nhận batch interactions'
    )
  }
}

/**
 * Lấy lịch sử interaction của một user
 *
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} List of interactions
 */
const getUserInteractions = async (userId, options = {}) => {
  try {
    if (!userId) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'userId là bắt buộc'
      )
    }

    const interactions = await interactionModel.findByUserId(userId, options)
    return interactions
  } catch (error) {
    if (error.isApiError) {
      throw error
    }
    console.error('[InteractionService] getUserInteractions error:', error)
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể lấy user interactions'
    )
  }
}

/**
 * Lấy engagement score của user (tổng điểm tương tác)
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Engagement score data
 */
const getUserEngagementScore = async (userId) => {
  try {
    if (!userId) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'userId là bắt buộc'
      )
    }

    const engagement = await interactionModel.getUserEngagementScore(userId)
    return engagement
  } catch (error) {
    if (error.isApiError) {
      throw error
    }
    console.error('[InteractionService] getUserEngagementScore error:', error)
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể lấy engagement score'
    )
  }
}

/**
 * Lấy danh sách similar users (cho collaborative filtering)
 *
 * @param {string} userId - User ID
 * @param {number} limit - Số lượng similar users
 * @returns {Promise<Array>} List of similar users with similarity scores
 */
const getSimilarUsers = async (userId, limit = 10) => {
  try {
    if (!userId) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'userId là bắt buộc'
      )
    }

    const similarUsers = await interactionModel.getSimilarUsers(userId, limit)
    return similarUsers
  } catch (error) {
    if (error.isApiError) {
      throw error
    }
    console.error('[InteractionService] getSimilarUsers error:', error)
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể tìm similar users'
    )
  }
}

/**
 * Lấy job recommendations dựa trên collaborative filtering
 *
 * @param {string} userId - User ID
 * @param {number} limit - Số lượng recommendations
 * @returns {Promise<Object>} CF recommendations
 */
const getCFRecommendations = async (userId, limit = 10) => {
  try {
    if (!userId) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'userId là bắt buộc'
      )
    }

    const recommendations = await interactionModel.getRecommendedJobsFromCF(userId, limit)
    return recommendations
  } catch (error) {
    if (error.isApiError) {
      throw error
    }
    console.error('[InteractionService] getCFRecommendations error:', error)
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể lấy CF recommendations'
    )
  }
}

/**
 * Lấy popularity score của một job
 *
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} Popularity score data
 */
const getJobPopularityScore = async (jobId) => {
  try {
    if (!jobId) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'jobId là bắt buộc'
      )
    }

    const popularity = await interactionModel.getJobPopularityScore(jobId)
    return popularity
  } catch (error) {
    if (error.isApiError) {
      throw error
    }
    console.error('[InteractionService] getJobPopularityScore error:', error)
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể lấy job popularity'
    )
  }
}

/**
 * Lấy thống kê tổng quan
 *
 * @param {Object} options - Filter options
 * @returns {Promise<Object>} Statistics data
 */
const getStats = async (options = {}) => {
  try {
    const stats = await interactionModel.getStats(options)
    return stats
  } catch (error) {
    console.error('[InteractionService] getStats error:', error)
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể lấy statistics'
    )
  }
}

/**
 * Lấy số lượng interactions theo action type
 *
 * @returns {Promise<Array>} Action counts
 */
const countByAction = async () => {
  try {
    const counts = await interactionModel.countByAction()
    return counts
  } catch (error) {
    console.error('[InteractionService] countByAction error:', error)
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể đếm interactions'
    )
  }
}

/**
 * Lấy top jobs (theo clicks, applies, bookmarks)
 *
 * @param {string} action - Action type
 * @param {number} limit - Số lượng jobs
 * @returns {Promise<Array>} Top jobs
 */
const getTopJobs = async (action, limit = 10) => {
  try {
    const topJobs = await interactionModel.getTopJobs(action, limit)
    return topJobs
  } catch (error) {
    console.error('[InteractionService] getTopJobs error:', error)
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể lấy top jobs'
    )
  }
}

/**
 * Lấy số lượng active users trong N ngày gần đây
 *
 * @param {number} days - Số ngày
 * @returns {Promise<number>} Active users count
 */
const getActiveUsersCount = async (days = 7) => {
  try {
    const count = await interactionModel.getActiveUsersCount(days)
    return count
  } catch (error) {
    console.error('[InteractionService] getActiveUsersCount error:', error)
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể đếm active users'
    )
  }
}

/**
 * Lấy độ tương đồng giữa 2 users
 *
 * @param {string} userId1 - User ID 1
 * @param {string} userId2 - User ID 2
 * @returns {Promise<Object>} Similarity data
 */
const getUserUserSimilarity = async (userId1, userId2) => {
  try {
    if (!userId1 || !userId2) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'userId1 và userId2 là bắt buộc'
      )
    }

    const similarity = await interactionModel.getUserUserSimilarity(userId1, userId2)
    return similarity
  } catch (error) {
    if (error.isApiError) {
      throw error
    }
    console.error('[InteractionService] getUserUserSimilarity error:', error)
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể tính similarity'
    )
  }
}

export const interactionService = {
  createInteraction,
  createBatchInteractions,
  getUserInteractions,
  getUserEngagementScore,
  getSimilarUsers,
  getCFRecommendations,
  getJobPopularityScore,
  getStats,
  countByAction,
  getTopJobs,
  getActiveUsersCount,
  getUserUserSimilarity
}