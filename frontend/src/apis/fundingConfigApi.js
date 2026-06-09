/**
 * Funding Config APIs - Gọi Backend Funding Config endpoints
 * Cấu hình ISA/income-based funding theo khóa học
 */

import { authorizeAxiosInstance } from '~/utils/authorizeAxios'
import { API_ROOT } from '~/utils/constants'

export const getFundingConfigs = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/funding-configs`, { params })

export const createFundingConfig = (data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/funding-configs`, data)

export const getFundingConfigByCourse = (courseId) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/funding-configs/${courseId}`)

export const updateFundingConfig = (courseId, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/funding-configs/${courseId}`, data)

export const deleteFundingConfig = (courseId) =>
  authorizeAxiosInstance.delete(`${API_ROOT}/v1/funding-configs/${courseId}`)

export const calculateFunding = (courseId, params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/funding-configs/${courseId}/calculate`, { params })
