import { recommendationFeedbackModel } from '~/models/recommendationFeedbackModel'
import ApiError from '~/utils/ApiError'
import StatusCodes from 'http-status-codes'

/**
 * Track a single feedback action from the frontend.
 */
export const trackFeedback = async ({
  userId,
  courseId,
  courseTitle,
  jobId,
  jobTitle,
  skillGaps,
  action,
  recommendationScore,
  sessionId
}) => {
  if (!userId || !courseId || !action) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'userId, courseId và action là bắt buộc'
    )
  }

  const VALID_ACTIONS = ['view', 'click', 'enroll', 'complete', 'dismiss', 'thumbs_up', 'thumbs_down']
  if (!VALID_ACTIONS.includes(action)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `action phải là một trong: ${VALID_ACTIONS.join(', ')}`
    )
  }

  const result = await recommendationFeedbackModel.createNew({
    userId,
    courseId,
    courseTitle,
    jobId,
    jobTitle,
    skillGaps,
    action,
    recommendationScore,
    sessionId,
    userAgent: null
  })

  return result
}

/**
 * Get aggregated metrics for a given time window.
 */
export const getRecommendationMetrics = async (days = 30) => {
  const endDate = new Date()
  const startDate = new Date(Date.now() - days * 86400000)

  const aggregated = await recommendationFeedbackModel.getAggregatedMetrics(startDate, endDate)

  if (!aggregated) {
    return {
      impressions: 0,
      clicks: 0,
      enrolls: 0,
      completes: 0,
      thumbs_up: 0,
      thumbs_down: 0,
      ctr: 0,
      enrollment_rate: 0,
      completion_rate: 0,
      dismiss_rate: 0,
      period_days: days
    }
  }

  const impressions = aggregated.total_impressions || 1
  const clicks = aggregated.total_clicks || 0
  const enrolls = aggregated.total_enrolls || 0
  const completes = aggregated.total_completes || 0

  return {
    impressions,
    clicks,
    enrolls,
    completes,
    thumbs_up: aggregated.total_thumbs_up || 0,
    thumbs_down: aggregated.total_dismiss || 0,
    ctr: parseFloat((clicks / impressions).toFixed(4)),
    enrollment_rate: enrolls > 0 ? parseFloat((enrolls / clicks).toFixed(4)) : 0,
    completion_rate: enrolls > 0 ? parseFloat((completes / enrolls).toFixed(4)) : 0,
    dismiss_rate: parseFloat((aggregated.total_dismiss / impressions).toFixed(4)),
    period_days: days
  }
}

/**
 * Get daily timeline metrics for charts.
 */
export const getTimelineMetrics = async (days = 30) => {
  const endDate = new Date()
  const startDate = new Date(Date.now() - days * 86400000)

  return recommendationFeedbackModel.getTimelineMetrics(startDate, endDate)
}

/**
 * Get top courses by impressions / enrollment.
 */
export const getTopCourses = async (days = 30, limit = 10) => {
  const endDate = new Date()
  const startDate = new Date(Date.now() - days * 86400000)

  return recommendationFeedbackModel.getTopCourses(startDate, endDate, limit)
}

/**
 * Get feedback history for a specific user.
 */
export const getUserFeedbackHistory = async (userId, options = {}) => {
  return recommendationFeedbackModel.findByUser(userId, options)
}
