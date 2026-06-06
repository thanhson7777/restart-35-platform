import ApiError from '~/utils/ApiError'
import StatusCodes from 'http-status-codes'
import {
  trackFeedback,
  getRecommendationMetrics,
  getTimelineMetrics,
  getTopCourses,
  getUserFeedbackHistory
} from '~/services/recommendationFeedbackService'

/**
 * POST /v1/recommendation-feedback
 * Track a feedback action from a user.
 */
export const trackFeedbackController = async (req, res, next) => {
  try {
    const userId = req.user?._id?.toString()
    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Yêu cầu đăng nhập')
    }

    const {
      courseId,
      courseTitle,
      jobId,
      jobTitle,
      skillGaps,
      action,
      recommendationScore,
      sessionId
    } = req.body

    const feedback = await trackFeedback({
      userId,
      courseId,
      courseTitle,
      jobId,
      jobTitle,
      skillGaps,
      action,
      recommendationScore,
      sessionId
    })

    res.status(StatusCodes.CREATED).json({
      success: true,
      data: feedback
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /v1/recommendation-feedback/metrics
 * Get aggregated recommendation metrics.
 * Admin only.
 */
export const getMetricsController = async (req, res, next) => {
  try {
    const { days = '30' } = req.query
    const metrics = await getRecommendationMetrics(parseInt(days))

    res.status(StatusCodes.OK).json({
      success: true,
      data: metrics
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /v1/recommendation-feedback/timeline
 * Get daily timeline metrics.
 * Admin only.
 */
export const getTimelineController = async (req, res, next) => {
  try {
    const { days = '30' } = req.query
    const timeline = await getTimelineMetrics(parseInt(days))

    res.status(StatusCodes.OK).json({
      success: true,
      data: timeline
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /v1/recommendation-feedback/top-courses
 * Get top courses by impressions / enrollment.
 * Admin only.
 */
export const getTopCoursesController = async (req, res, next) => {
  try {
    const { days = '30', limit = '10' } = req.query
    const courses = await getTopCourses(parseInt(days), parseInt(limit))

    res.status(StatusCodes.OK).json({
      success: true,
      data: courses
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /v1/recommendation-feedback/me
 * Get current user's feedback history.
 */
export const getMyFeedbackController = async (req, res, next) => {
  try {
    const userId = req.user?._id?.toString()
    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Yêu cầu đăng nhập')
    }

    const { page = '1', limit = '50' } = req.query
    const result = await getUserFeedbackHistory(userId, {
      page: parseInt(page),
      limit: parseInt(limit)
    })

    res.status(StatusCodes.OK).json({
      success: true,
      ...result
    })
  } catch (error) {
    next(error)
  }
}
