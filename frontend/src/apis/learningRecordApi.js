/**
 * Learning Record APIs - Gọi Backend Learning Record endpoints
 * Analytics cho learning records và dropout risk detection
 */

import { authorizeAxiosInstance } from '~/utils/authorizeAxios'
import { API_ROOT } from '~/utils/constants'

export const getLearningRecords = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/learning-records`, { params })

export const getMyLearningRecords = () =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/learning-records/my`)

export const getDropoutRisk = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/learning-records/analytics/dropout-risk`, { params })
