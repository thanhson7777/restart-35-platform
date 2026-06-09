/**
 * ESCO API - Gọi Backend ESCO endpoints
 * Đồng bộ ESCO skills framework
 */

import { authorizeAxiosInstance } from '~/utils/authorizeAxios'
import { API_ROOT } from '~/utils/constants'

export const syncEscoData = () =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/esco/sync`)

export const getEscoSyncStatus = () =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/esco/status`)
