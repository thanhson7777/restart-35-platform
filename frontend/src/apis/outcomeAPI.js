/**
 * Outcome APIs - Gọi Backend Outcome endpoints
 * Frontend -> Backend Node.js -> MongoDB
 */

import { authorizeAxiosInstance } from '~/utils/authorizeAxios'
import { API_ROOT } from '~/utils/constants'

// Base URL cho Outcome endpoints
const OUTCOME_BASE_URL = `${API_ROOT}/v1/outcomes`

/**
 * Tạo outcome mới (khi user apply)
 *
 * @param {Object} params - Parameters
 * @param {string} params.jobId - Job ID (bắt buộc)
 * @param {string} [params.jobTitle] - Job title
 * @param {string} [params.companyName] - Company name
 * @param {Object} [params.metadata] - Additional metadata
 * @returns {Promise<Object>} - Created outcome
 */
export const createOutcomeAPI = async ({ jobId, jobTitle, companyName, metadata = {} }) => {
  if (!jobId) {
    throw new Error('jobId là bắt buộc')
  }

  const response = await authorizeAxiosInstance.post(OUTCOME_BASE_URL, {
    jobId,
    jobTitle,
    companyName,
    metadata
  })

  return response.data
}

/**
 * Lấy danh sách outcomes của user hiện tại
 *
 * @param {Object} [options] - Query options
 * @param {string} [options.status] - Filter by status
 * @param {number} [options.limit] - Number of results (default: 50)
 * @param {number} [options.skip] - Skip results (default: 0)
 * @returns {Promise<Object>} - { outcomes[], count }
 */
export const getMyOutcomesAPI = async (options = {}) => {
  const params = new URLSearchParams()
  if (options.status) params.append('status', options.status)
  if (options.limit) params.append('limit', options.limit.toString())
  if (options.skip) params.append('skip', options.skip.toString())

  const queryString = params.toString()
  const url = `${OUTCOME_BASE_URL}/me${queryString ? `?${queryString}` : ''}`

  const response = await authorizeAxiosInstance.get(url)
  return response.data
}

/**
 * Lấy chi tiết một outcome
 *
 * @param {string} outcomeId - Outcome ID
 * @returns {Promise<Object>} - Outcome details
 */
export const getOutcomeByIdAPI = async (outcomeId) => {
  if (!outcomeId) {
    throw new Error('outcomeId là bắt buộc')
  }

  const response = await authorizeAxiosInstance.get(`${OUTCOME_BASE_URL}/${outcomeId}`)
  return response.data
}

/**
 * Update status của outcome
 *
 * @param {string} outcomeId - Outcome ID
 * @param {string} status - New status
 * @param {Object} [additionalData] - Additional data
 * @returns {Promise<Object>} - Updated outcome
 */
export const updateOutcomeStatusAPI = async (outcomeId, status, additionalData = {}) => {
  if (!outcomeId) {
    throw new Error('outcomeId là bắt buộc')
  }

  if (!status) {
    throw new Error('status là bắt buộc')
  }

  const response = await authorizeAxiosInstance.put(
    `${OUTCOME_BASE_URL}/${outcomeId}/status`,
    { status, additionalData }
  )
  return response.data
}

/**
 * Submit feedback cho outcome
 *
 * @param {string} outcomeId - Outcome ID
 * @param {Object} feedbackData - Feedback data
 * @param {number} [feedbackData.rating] - Rating (1-5)
 * @param {string} [feedbackData.comment] - Comment
 * @param {boolean} [feedbackData.wouldApplyAgain] - Would apply again?
 * @param {boolean} [feedbackData.recommendToOthers] - Recommend to others?
 * @param {string[]} [feedbackData.pros] - Pros tags
 * @param {string[]} [feedbackData.cons] - Cons tags
 * @returns {Promise<Object>} - Updated outcome
 */
export const submitFeedbackAPI = async (outcomeId, feedbackData) => {
  if (!outcomeId) {
    throw new Error('outcomeId là bắt buộc')
  }

  const response = await authorizeAxiosInstance.post(
    `${OUTCOME_BASE_URL}/${outcomeId}/feedback`,
    feedbackData
  )
  return response.data
}

/**
 * Lấy thống kê thành công của user
 *
 * @returns {Promise<Object>} - User success stats
 */
export const getMyStatsAPI = async () => {
  const response = await authorizeAxiosInstance.get(`${OUTCOME_BASE_URL}/me/stats`)
  return response.data
}

/**
 * Lấy preferences của user (dùng cho ML)
 *
 * @returns {Promise<Object>} - User preferences
 */
export const getMyPreferencesAPI = async () => {
  const response = await authorizeAxiosInstance.get(`${OUTCOME_BASE_URL}/me/preferences`)
  return response.data
}

/**
 * Withdraw/Rút đơn ứng tuyển
 *
 * @param {string} outcomeId - Outcome ID
 * @param {string} [reason] - Reason for withdrawing
 * @returns {Promise<Object>} - Updated outcome
 */
export const withdrawOutcomeAPI = async (outcomeId, reason = '') => {
  if (!outcomeId) {
    throw new Error('outcomeId là bắt buộc')
  }

  const response = await authorizeAxiosInstance.delete(`${OUTCOME_BASE_URL}/${outcomeId}`, {
    data: { reason }
  })
  return response.data
}

/**
 * Lấy thống kê của một job (admin)
 *
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} - Job stats
 */
export const getJobStatsAPI = async (jobId) => {
  if (!jobId) {
    throw new Error('jobId là bắt buộc')
  }

  const response = await authorizeAxiosInstance.get(`${OUTCOME_BASE_URL}/jobs/${jobId}/stats`)
  return response.data
}

/**
 * Outcome status constants
 */
export const OUTCOME_STATUS = {
  APPLIED: 'applied',
  REVIEWING: 'reviewing',
  INTERVIEWED: 'interviewed',
  OFFERED: 'offered',
  HIRED: 'hired',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
  EXPIRED: 'expired'
}

/**
 * Status display configuration
 */
export const OUTCOME_STATUS_CONFIG = {
  [OUTCOME_STATUS.APPLIED]: {
    label: 'Đã ứng tuyển',
    color: 'blue',
    icon: '📤'
  },
  [OUTCOME_STATUS.REVIEWING]: {
    label: 'Đang xem xét',
    color: 'yellow',
    icon: '👀'
  },
  [OUTCOME_STATUS.INTERVIEWED]: {
    label: 'Đã phỏng vấn',
    color: 'purple',
    icon: '🤝'
  },
  [OUTCOME_STATUS.OFFERED]: {
    label: 'Được offer',
    color: 'green',
    icon: '🎉'
  },
  [OUTCOME_STATUS.HIRED]: {
    label: 'Được nhận',
    color: 'emerald',
    icon: '✅'
  },
  [OUTCOME_STATUS.REJECTED]: {
    label: 'Bị từ chối',
    color: 'red',
    icon: '❌'
  },
  [OUTCOME_STATUS.WITHDRAWN]: {
    label: 'Đã rút',
    color: 'gray',
    icon: '↩️'
  },
  [OUTCOME_STATUS.EXPIRED]: {
    label: 'Hết hạn',
    color: 'gray',
    icon: '⏰'
  }
}

/**
 * Check if status is terminal
 */
export const isTerminalStatus = (status) => {
  return [OUTCOME_STATUS.HIRED, OUTCOME_STATUS.REJECTED, OUTCOME_STATUS.WITHDRAWN, OUTCOME_STATUS.EXPIRED].includes(status)
}

/**
 * Check if user can give feedback
 */
export const canGiveFeedback = (status) => {
  return [OUTCOME_STATUS.APPLIED, OUTCOME_STATUS.REVIEWING, OUTCOME_STATUS.INTERVIEWED, OUTCOME_STATUS.OFFERED, OUTCOME_STATUS.HIRED].includes(status)
}
