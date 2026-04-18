/**
 * Interaction APIs - Gọi Backend Interaction endpoints
 * Phục vụ ML system - theo dõi hành vi người dùng
 *
 * Frontend gọi Backend Node.js -> Backend ghi vào MongoDB (user_interactions collection)
 * Dữ liệu này sau đó được dùng cho Collaborative Filtering & ML Training
 */

import { authorizeAxiosInstance, publicAxiosInstance } from '~/utils/authorizeAxios'
import { API_ROOT } from '~/utils/constants'

// Base URL cho Interaction endpoints
const INTERACTION_BASE_URL = `${API_ROOT}/v1/interactions`

// ============================================================
// CONSTANTS
// ============================================================

/**
 * Action types cho interaction tracking
 * Đảm bảo consistency với backend
 */
export const INTERACTION_ACTIONS = {
  CLICK: 'click',
  VIEW: 'view',
  APPLY: 'apply',
  BOOKMARK: 'bookmark',
  SKIP: 'skip',
  SAVE: 'save'
}

/**
 * Recommendation methods (how job was recommended)
 */
export const RECOMMENDATION_METHODS = {
  CF: 'cf',             // Collaborative Filtering
  CONTENT: 'content',   // Content-based
  SEMANTIC: 'semantic', // Semantic search
  HYBRID: 'hybrid'     // Hybrid approach
}

/**
 * Time of day categories
 */
export const TIME_OF_DAY = {
  MORNING: 'morning',     // 5:00 - 11:59
  AFTERNOON: 'afternoon', // 12:00 - 17:59
  EVENING: 'evening',    // 18:00 - 21:59
  NIGHT: 'night'         // 22:00 - 4:59
}

// ============================================================
// CORE API FUNCTIONS
// ============================================================

/**
 * Ghi nhận một interaction từ user
 *
 * @param {Object} params - Interaction data
 * @param {string} params.userId - User ID (bắt buộc)
 * @param {string} params.jobId - Job ID (bắt buộc)
 * @param {string} params.action - Action type (click, view, apply, bookmark, skip)
 * @param {string} [params.jobTitle] - Job title để lưu trữ
 * @param {string} [params.companyName] - Company name để lưu trữ
 * @param {Object} [params.context] - Context data (page, position, sessionId)
 * @param {number} [params.viewDuration] - Thời gian view (seconds)
 * @param {number} [params.scrollDepth] - Scroll depth (0-1)
 * @param {boolean} [params.returnVisit] - User đã xem job này trước đó
 * @param {string} [params.timeOfDay] - morning/afternoon/evening/night
 * @param {string} [params.dayOfWeek] - monday-sunday
 * @param {number} [params.sessionDuration] - Thời gian trong session (seconds)
 * @param {number} [params.recommendationPosition] - Vị trí trong danh sách (1-50)
 * @param {string} [params.recommendationMethod] - cf/content/semantic/hybrid
 * @param {string} [params.experimentVariant] - A/B test variant
 * @param {Object} [params.device] - Device info (platform, browser, mobile)
 * @param {Object} [params.metadata] - Job metadata (category, location, salary)
 * @returns {Promise<Object>} - Created interaction
 */
export const trackInteractionAPI = async ({
  userId,
  jobId,
  jobTitle = '',
  companyName = '',
  action,
  context = {},
  viewDuration = 0,
  scrollDepth = 0,
  returnVisit = false,
  hoverDuration = 0,
  searchRefine = false,
  timeOfDay = 'morning',
  dayOfWeek = 'monday',
  sessionDuration = 0,
  previousInteractionsCount = 0,
  recommendationPosition = 1,
  recommendationMethod = 'content',
  experimentVariant = null,
  device = {},
  metadata = {}
}) => {
  if (!userId || !jobId || !action) {
    throw new Error('userId, jobId, và action là bắt buộc')
  }

  const payload = {
    userId,
    jobId,
    jobTitle,
    companyName,
    action,
    context,
    viewDuration,
    scrollDepth,
    returnVisit,
    hoverDuration,
    searchRefine,
    timeOfDay,
    dayOfWeek,
    sessionDuration,
    previousInteractionsCount,
    recommendationPosition,
    recommendationMethod,
    experimentVariant,
    device,
    metadata
  }

  const response = await authorizeAxiosInstance.post(
    INTERACTION_BASE_URL,
    payload
  )
  return response.data
}

/**
 * Ghi nhận nhiều interactions cùng lúc (batch)
 *
 * @param {Array} interactions - Array of interaction objects
 * @returns {Promise<Object>} - Insert result
 */
export const trackBatchInteractionsAPI = async (interactions) => {
  if (!Array.isArray(interactions) || interactions.length === 0) {
    throw new Error('interactions phải là một mảng không rỗng')
  }

  const response = await authorizeAxiosInstance.post(
    `${INTERACTION_BASE_URL}/batch`,
    { interactions }
  )
  return response.data
}

/**
 * Lấy lịch sử interaction của một user
 *
 * @param {string} userId - User ID
 * @param {Object} [options] - Query options
 * @param {string} [options.action] - Filter by action type
 * @param {number} [options.limit] - Number of results (default: 50)
 * @param {number} [options.skip] - Skip results (default: 0)
 * @returns {Promise<Object>} - { interactions[], count }
 */
export const getUserInteractionsAPI = async (userId, options = {}) => {
  if (!userId) {
    throw new Error('userId là bắt buộc')
  }

  const params = new URLSearchParams()
  if (options.action) params.append('action', options.action)
  if (options.limit) params.append('limit', options.limit)
  if (options.skip) params.append('skip', options.skip)

  const queryString = params.toString()
  const url = `${INTERACTION_BASE_URL}/user/${userId}${queryString ? `?${queryString}` : ''}`

  const response = await authorizeAxiosInstance.get(url)
  return response.data
}

/**
 * Lấy engagement score của user
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Engagement score data
 */
export const getUserEngagementAPI = async (userId) => {
  if (!userId) {
    throw new Error('userId là bắt buộc')
  }

  const response = await authorizeAxiosInstance.get(
    `${INTERACTION_BASE_URL}/user/${userId}/engagement`
  )
  return response.data
}

/**
 * Lấy danh sách similar users (cho collaborative filtering)
 *
 * @param {string} userId - User ID
 * @param {number} [limit] - Số lượng similar users (default: 10)
 * @returns {Promise<Object>} - { similarUsers[], count }
 */
export const getSimilarUsersAPI = async (userId, limit = 10) => {
  if (!userId) {
    throw new Error('userId là bắt buộc')
  }

  const response = await authorizeAxiosInstance.get(
    `${INTERACTION_BASE_URL}/user/${userId}/similar?limit=${limit}`
  )
  return response.data
}

/**
 * Lấy job recommendations dựa trên collaborative filtering
 *
 * @param {string} userId - User ID
 * @param {number} [limit] - Số lượng recommendations (default: 10)
 * @returns {Promise<Object>} - CF recommendations { jobs[], reason, similarUsersCount }
 */
export const getCFRecommendationsAPI = async (userId, limit = 10) => {
  if (!userId) {
    throw new Error('userId là bắt buộc')
  }

  const response = await authorizeAxiosInstance.get(
    `${INTERACTION_BASE_URL}/user/${userId}/cf-recommendations?limit=${limit}`
  )
  return response.data
}

/**
 * Lấy popularity score của một job
 *
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} - Popularity data
 */
export const getJobPopularityAPI = async (jobId) => {
  if (!jobId) {
    throw new Error('jobId là bắt buộc')
  }

  const response = await publicAxiosInstance.get(
    `${INTERACTION_BASE_URL}/jobs/${jobId}/popularity`
  )
  return response.data
}

/**
 * Lấy thống kê tổng quan (admin only)
 *
 * @param {Object} [options] - Filter options
 * @param {string} [options.startDate] - Start date (ISO string)
 * @param {string} [options.endDate] - End date (ISO string)
 * @returns {Promise<Object>} - Statistics data
 */
export const getInteractionStatsAPI = async (options = {}) => {
  const params = new URLSearchParams()
  if (options.startDate) params.append('startDate', options.startDate)
  if (options.endDate) params.append('endDate', options.endDate)

  const queryString = params.toString()
  const url = `${INTERACTION_BASE_URL}/stats${queryString ? `?${queryString}` : ''}`

  const response = await authorizeAxiosInstance.get(url)
  return response.data
}

/**
 * Lấy độ tương đồng giữa 2 users
 *
 * @param {string} userId1 - User ID 1
 * @param {string} userId2 - User ID 2
 * @returns {Promise<Object>} - Similarity data
 */
export const getUserSimilarityAPI = async (userId1, userId2) => {
  if (!userId1 || !userId2) {
    throw new Error('userId1 và userId2 là bắt buộc')
  }

  const response = await authorizeAxiosInstance.get(
    `${INTERACTION_BASE_URL}/users/${userId1}/similarity/${userId2}`
  )
  return response.data
}

/**
 * === Utility Functions ===
 */

/**
 * Debounce helper để tránh gọi API quá nhiều
 * Dùng cho view tracking (hover)
 */
let debounceTimers = {}

export const debouncedTrackView = (userId, jobId, jobTitle, companyName, metadata = {}, delay = 2000) => {
  const key = `${userId}_${jobId}`

  // Clear existing timer
  if (debounceTimers[key]) {
    clearTimeout(debounceTimers[key])
  }

  // Set new timer
  debounceTimers[key] = setTimeout(() => {
    trackInteractionAPI({
      userId,
      jobId,
      jobTitle,
      companyName,
      action: INTERACTION_ACTIONS.VIEW,
      metadata,
      viewDuration: delay
    })
    delete debounceTimers[key]
  }, delay)
}

/**
 * Track click immediately (không debounce)
 */
export const trackClick = (userId, jobId, jobTitle, companyName, context = {}, metadata = {}) => {
  return trackInteractionAPI({
    userId,
    jobId,
    jobTitle,
    companyName,
    action: INTERACTION_ACTIONS.CLICK,
    context,
    metadata
  })
}

/**
 * Track apply action
 */
export const trackApply = (userId, jobId, jobTitle, companyName, metadata = {}) => {
  return trackInteractionAPI({
    userId,
    jobId,
    jobTitle,
    companyName,
    action: INTERACTION_ACTIONS.APPLY,
    metadata
  })
}

/**
 * Track bookmark action
 */
export const trackBookmark = (userId, jobId, jobTitle, companyName, metadata = {}) => {
  return trackInteractionAPI({
    userId,
    jobId,
    jobTitle,
    companyName,
    action: INTERACTION_ACTIONS.BOOKMARK,
    metadata
  })
}

/**
 * Track skip action (user bỏ qua job)
 */
export const trackSkip = (userId, jobId, jobTitle, companyName, context = {}) => {
  return trackInteractionAPI({
    userId,
    jobId,
    jobTitle,
    companyName,
    action: INTERACTION_ACTIONS.SKIP,
    context
  })
}