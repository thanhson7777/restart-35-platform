/**
 * Recommendation Feedback API Client
 * Gửi feedback (thumbs up/down/dismiss) lên backend
 */

import { authorizeAxiosInstance } from '~/utils/authorizeAxios'
import { API_ROOT } from '~/utils/constants'

const BASE_URL = `${API_ROOT}/v1/recommendation-feedback`

/**
 * Track a feedback action
 * @param {Object} params - { courseId, courseTitle, jobId, jobTitle, skillGaps, action, recommendationScore }
 */
export const trackFeedbackAPI = async ({
  courseId,
  courseTitle = '',
  jobId = null,
  jobTitle = '',
  skillGaps = [],
  action,
  recommendationScore = null
}) => {
  const response = await authorizeAxiosInstance.post(BASE_URL, {
    courseId,
    courseTitle,
    jobId,
    jobTitle,
    skillGaps,
    action,
    recommendationScore
  })
  return response.data
}

/**
 * Get aggregated recommendation metrics
 * @param {number} days - Number of days to look back
 */
export const getRecommendationMetricsAPI = async (days = 30) => {
  const response = await authorizeAxiosInstance.get(`${BASE_URL}/metrics`, {
    params: { days }
  })
  return response.data
}

/**
 * Get daily timeline for charts
 * @param {number} days
 */
export const getTimelineAPI = async (days = 30) => {
  const response = await authorizeAxiosInstance.get(`${BASE_URL}/timeline`, {
    params: { days }
  })
  return response.data
}

/**
 * Get top courses by impressions/enrollment
 * @param {number} days
 * @param {number} limit
 */
export const getTopCoursesAPI = async (days = 30, limit = 10) => {
  const response = await authorizeAxiosInstance.get(`${BASE_URL}/top-courses`, {
    params: { days, limit }
  })
  return response.data
}

/**
 * Get current user's feedback history
 */
export const getMyFeedbackAPI = async (page = 1, limit = 50) => {
  const response = await authorizeAxiosInstance.get(`${BASE_URL}/me`, {
    params: { page, limit }
  })
  return response.data
}
