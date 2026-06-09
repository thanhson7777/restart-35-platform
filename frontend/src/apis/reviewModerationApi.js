/**
 * Review Moderation APIs - Gọi Backend Review endpoints (admin moderation)
 * Duyệt/từ chối reviews trước khi hiển thị công khai
 */

import { authorizeAxiosInstance } from '~/utils/authorizeAxios'
import { API_ROOT } from '~/utils/constants'

export const getPendingReviews = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/reviews/admin/pending`, { params })

export const moderateReview = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/reviews/${id}/moderate`, data)

export const addReviewResponse = (id, data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/reviews/${id}/response`, data)
