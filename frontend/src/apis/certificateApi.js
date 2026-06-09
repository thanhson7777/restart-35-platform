/**
 * Certificate APIs - Gọi Backend Certificate endpoints
 * Quản lý certificates trong hệ thống
 */

import { authorizeAxiosInstance } from '~/utils/authorizeAxios'
import { API_ROOT } from '~/utils/constants'

export const getCertificates = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/certificates`, { params })

export const createCertificate = (data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/certificates`, data)

export const getCertificateById = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/certificates/${id}`)

export const updateCertificate = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/certificates/${id}`, data)

export const revokeCertificate = (id, reason) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/certificates/${id}/revoke`, { reason })
