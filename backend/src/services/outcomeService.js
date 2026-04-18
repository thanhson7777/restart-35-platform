/**
 * Outcome Service - Business Logic cho Job Outcome Tracking
 * Phục vụ ML system - theo dõi kết quả ứng tuyển và thu thập feedback
 */

import { jobOutcomeModel, OUTCOME_STATUS, FEEDBACK_TYPES, OUTCOME_WEIGHTS } from '~/models/jobOutcomeModel'
import { interactionModel } from '~/models/interactionModel'
import { workerProfileModel } from '~/models/workerProfileModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'

/**
 * Tạo outcome mới từ interaction
 * Gọi khi user apply job
 */
const createFromInteraction = async (userId, jobId, jobTitle, companyName, metadata = {}) => {
  try {
    // Kiểm tra xem đã có outcome chưa
    const existing = await jobOutcomeModel.findByUserAndJob(userId, jobId)
    if (existing) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        'Bạn đã ứng tuyển công việc này rồi!'
      )
    }

    // Lấy interaction gần nhất (để tính engagement metrics)
    const interactions = await interactionModel.getUserJobInteractions(userId, jobId)

    let engagementMetrics = {
      viewCount: 0,
      clickCount: 0,
      timeToApply: 0
    }

    if (interactions.length > 0) {
      const firstView = interactions.find(i => i.action === 'view')
      const lastInteraction = interactions[0]

      engagementMetrics.viewCount = interactions.filter(i => i.action === 'view').length
      engagementMetrics.clickCount = interactions.filter(i => i.action === 'click').length

      if (firstView && lastInteraction) {
        const firstViewTime = new Date(firstView.createdAt).getTime()
        const lastTime = new Date(lastInteraction.createdAt).getTime()
        engagementMetrics.timeToApply = lastTime - firstViewTime
      }
    }

    // Tạo outcome
    const outcomeData = {
      userId,
      jobId,
      jobTitle: jobTitle || '',
      companyName: companyName || '',
      jobCategory: metadata.jobCategory || metadata.jobType || '',
      status: OUTCOME_STATUS.APPLIED,
      appliedAt: new Date(),
      engagementMetrics
    }

    const outcome = await jobOutcomeModel.createNew(outcomeData)

    // Update interaction với outcome reference (nếu cần)
    if (interactions.length > 0) {
      interactions.forEach(async (interaction) => {
        // Log interaction đã được convert thành outcome
        console.log(`[OutcomeService] Interaction ${interaction._id} → Outcome ${outcome._id}`)
      })
    }

    return outcome
  } catch (error) {
    if (error.isApiError) throw error
    console.error('[OutcomeService] createFromInteraction error:', error)
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể tạo outcome'
    )
  }
}

/**
 * Update status của outcome
 */
const updateOutcomeStatus = async (outcomeId, newStatus, additionalData = {}) => {
  try {
    const outcome = await jobOutcomeModel.findById(outcomeId)
    if (!outcome) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Outcome không tồn tại!'
      )
    }

    // Validate status transition
    const validTransitions = {
      [OUTCOME_STATUS.APPLIED]: [OUTCOME_STATUS.REVIEWING, OUTCOME_STATUS.REJECTED, OUTCOME_STATUS.WITHDRAWN],
      [OUTCOME_STATUS.REVIEWING]: [OUTCOME_STATUS.INTERVIEWED, OUTCOME_STATUS.REJECTED, OUTCOME_STATUS.WITHDRAWN],
      [OUTCOME_STATUS.INTERVIEWED]: [OUTCOME_STATUS.OFFERED, OUTCOME_STATUS.REJECTED, OUTCOME_STATUS.WITHDRAWN],
      [OUTCOME_STATUS.OFFERED]: [OUTCOME_STATUS.HIRED, OUTCOME_STATUS.REJECTED, OUTCOME_STATUS.WITHDRAWN],
      [OUTCOME_STATUS.HIRED]: [],
      [OUTCOME_STATUS.REJECTED]: [],
      [OUTCOME_STATUS.WITHDRAWN]: [],
      [OUTCOME_STATUS.EXPIRED]: []
    }

    const allowedTransitions = validTransitions[outcome.status] || []
    if (!allowedTransitions.includes(newStatus) && outcome.status !== newStatus) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Không thể chuyển từ '${outcome.status}' sang '${newStatus}'`
      )
    }

    const updated = await jobOutcomeModel.updateStatus(outcomeId, newStatus, additionalData)

    // Nếu hired → cập nhật worker profile (tùy chọn)
    if (newStatus === OUTCOME_STATUS.HIRED) {
      console.log(`[OutcomeService] User ${outcome.userId} hired for job ${outcome.jobId}`)
      // Có thể trigger notification, update stats, etc.
    }

    return updated
  } catch (error) {
    if (error.isApiError) throw error
    console.error('[OutcomeService] updateOutcomeStatus error:', error)
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể cập nhật status'
    )
  }
}

/**
 * Thêm feedback và rating
 */
const submitFeedback = async (outcomeId, feedbackData) => {
  try {
    const outcome = await jobOutcomeModel.findById(outcomeId)
    if (!outcome) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Outcome không tồn tại!'
      )
    }

    // Validate rating
    if (feedbackData.rating !== undefined) {
      if (feedbackData.rating < 1 || feedbackData.rating > 5) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Rating phải từ 1 đến 5'
        )
      }
    }

    // Determine feedback type based on rating
    let feedbackType = feedbackData.type
    if (!feedbackType && feedbackData.rating) {
      if (feedbackData.rating >= 4) feedbackType = FEEDBACK_TYPES.POSITIVE
      else if (feedbackData.rating >= 3) feedbackType = FEEDBACK_TYPES.NEUTRAL
      else feedbackType = FEEDBACK_TYPES.NEGATIVE
    }

    const updated = await jobOutcomeModel.updateFeedback(outcomeId, {
      ...feedbackData,
      type: feedbackType
    })

    return updated
  } catch (error) {
    if (error.isApiError) throw error
    console.error('[OutcomeService] submitFeedback error:', error)
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể gửi feedback'
    )
  }
}

/**
 * Lấy tất cả outcomes của user
 */
const getUserOutcomes = async (userId, options = {}) => {
  try {
    const outcomes = await jobOutcomeModel.findByUserId(userId, options)

    // Enrich với interaction data
    const enrichedOutcomes = await Promise.all(
      outcomes.map(async (outcome) => {
        const interactions = await interactionModel.getUserJobInteractions(userId, outcome.jobId)
        return {
          ...outcome,
          interactions: interactions.slice(0, 5) // Chỉ lấy 5 interaction gần nhất
        }
      })
    )

    return enrichedOutcomes
  } catch (error) {
    console.error('[OutcomeService] getUserOutcomes error:', error)
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể lấy danh sách outcomes'
    )
  }
}

/**
 * Lấy chi tiết một outcome
 */
const getOutcomeById = async (outcomeId) => {
  try {
    const outcome = await jobOutcomeModel.findById(outcomeId)
    if (!outcome) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Outcome không tồn tại!'
      )
    }

    // Lấy interactions liên quan
    const interactions = await interactionModel.getUserJobInteractions(outcome.userId, outcome.jobId)

    return {
      ...outcome,
      interactions
    }
  } catch (error) {
    if (error.isApiError) throw error
    console.error('[OutcomeService] getOutcomeById error:', error)
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể lấy chi tiết outcome'
    )
  }
}

/**
 * Lấy thống kê thành công của user
 */
const getUserSuccessStats = async (userId) => {
  try {
    const stats = await jobOutcomeModel.getUserSuccessRate(userId)

    // Thêm top categories
    const preferences = await jobOutcomeModel.getUserPreferences(userId)
    const topCategories = Object.entries(preferences.preferredLocations)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }))

    return {
      ...stats,
      topCategories,
      totalApplications: stats.total,
      hireRate: stats.successRate,
      interviewRate: stats.total > 0 ? (stats.interviewed / stats.total) * 100 : 0
    }
  } catch (error) {
    console.error('[OutcomeService] getUserSuccessStats error:', error)
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể lấy thống kê'
    )
  }
}

/**
 * Lấy preferences của user từ outcomes
 * Dùng cho ML recommendation
 */
const getUserPreferencesFromOutcomes = async (userId) => {
  try {
    const preferences = await jobOutcomeModel.getUserPreferences(userId)

    // Chuyển đổi thành format dễ sử dụng cho ML
    const topJobTypes = Object.entries(preferences.preferredJobTypes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => type)

    const topCategories = Object.entries(preferences.preferredLocations)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category]) => category)

    // Tính success rate theo category
    const categorySuccessRates = {}
    Object.entries(preferences.successByCategory).forEach(([category, data]) => {
      categorySuccessRates[category] = data.total > 0
        ? (data.hired / data.total) * 100
        : 0
    })

    return {
      topJobTypes,
      topCategories,
      categorySuccessRates,
      preferences,
      hasEnoughData: Object.keys(preferences.preferredLocations).length >= 3
    }
  } catch (error) {
    console.error('[OutcomeService] getUserPreferencesFromOutcomes error:', error)
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể lấy preferences'
    )
  }
}

/**
 * Lấy thống kê job (dùng cho admin dashboard)
 */
const getJobStats = async (jobId) => {
  try {
    const metrics = await jobOutcomeModel.getJobSuccessMetrics(jobId)
    return metrics
  } catch (error) {
    console.error('[OutcomeService] getJobStats error:', error)
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể lấy thống kê job'
    )
  }
}

/**
 * Get aggregated stats for ML training
 */
const getAggregatedStats = async (options = {}) => {
  try {
    const stats = await jobOutcomeModel.getAggregatedStats(options)

    // Calculate summary
    const summary = {
      totalOutcomes: 0,
      byStatus: {},
      avgRating: 0,
      avgSuccessScore: 0
    }

    let totalRating = 0
    let ratingCount = 0
    let totalScore = 0

    stats.forEach(item => {
      summary.totalOutcomes += item.count
      summary.byStatus[item._id] = item.count
      if (item.avgRating) {
        totalRating += item.avgRating * item.count
        ratingCount += item.count
      }
      if (item.avgSuccessScore) {
        totalScore += item.avgSuccessScore * item.count
      }
    })

    summary.avgRating = ratingCount > 0 ? totalRating / ratingCount : 0
    summary.avgSuccessScore = summary.totalOutcomes > 0 ? totalScore / summary.totalOutcomes : 0

    return {
      ...summary,
      details: stats
    }
  } catch (error) {
    console.error('[OutcomeService] getAggregatedStats error:', error)
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể lấy thống kê tổng hợp'
    )
  }
}

/**
 * Cancel/Withdraw outcome
 */
const withdrawOutcome = async (outcomeId, reason = '') => {
  try {
    const outcome = await jobOutcomeModel.findById(outcomeId)
    if (!outcome) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Outcome không tồn tại!'
      )
    }

    // Chỉ cho phép withdraw các trạng thái chưa kết thúc
    if ([OUTCOME_STATUS.HIRED, OUTCOME_STATUS.REJECTED, OUTCOME_STATUS.WITHDRAWN, OUTCOME_STATUS.EXPIRED].includes(outcome.status)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Không thể rút đơn ở trạng thái này!'
      )
    }

    const updated = await jobOutcomeModel.updateStatus(outcomeId, OUTCOME_STATUS.WITHDRAWN, {
      feedback: {
        comment: reason,
        type: FEEDBACK_TYPES.NEUTRAL
      }
    })

    return updated
  } catch (error) {
    if (error.isApiError) throw error
    console.error('[OutcomeService] withdrawOutcome error:', error)
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Không thể rút đơn'
    )
  }
}

export const outcomeService = {
  createFromInteraction,
  updateOutcomeStatus,
  submitFeedback,
  getUserOutcomes,
  getOutcomeById,
  getUserSuccessStats,
  getUserPreferencesFromOutcomes,
  getJobStats,
  getAggregatedStats,
  withdrawOutcome
}
