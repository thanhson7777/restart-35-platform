import { authorizeAxiosInstance } from '~/utils/authorizeAxios'
import { API_ROOT } from '~/utils/constants'

// Worker Profile APIs

export const createWorkerProfileAPI = async () => {
  const response = await authorizeAxiosInstance.post(`${API_ROOT}/v1/worker-profiles`)
  return response.data
}

export const getMyWorkerProfileAPI = async () => {
  const response = await authorizeAxiosInstance.get(`${API_ROOT}/v1/worker-profiles/me`)
  return response.data
}

export const updateWorkerProfileStepAPI = async (step, stepData) => {
  const response = await authorizeAxiosInstance.put(
    `${API_ROOT}/v1/worker-profiles/step/${step}`,
    stepData
  )
  return response.data
}

export const autosaveWorkerProfileAPI = async (step, data) => {
  const response = await authorizeAxiosInstance.put(
    `${API_ROOT}/v1/worker-profiles/autosave`,
    { step, data }
  )
  return response.data
}

export const completeWorkerProfileAPI = async () => {
  const response = await authorizeAxiosInstance.put(
    `${API_ROOT}/v1/worker-profiles/complete`
  )
  return response.data
}

export const getWorkerProfilesAPI = async ({ page = 1, limit = 10, isCompleted } = {}) => {
  const params = new URLSearchParams()
  params.append('page', page)
  params.append('limit', limit)
  if (isCompleted && isCompleted !== 'ALL') {
    params.append('isCompleted', isCompleted)
  }
  const response = await authorizeAxiosInstance.get(
    `${API_ROOT}/v1/worker-profiles?${params.toString()}`
  )
  return response.data
}

export const getWorkerProfileByIdAPI = async (id) => {
  const response = await authorizeAxiosInstance.get(
    `${API_ROOT}/v1/worker-profiles/${id}`
  )
  return response.data
}
