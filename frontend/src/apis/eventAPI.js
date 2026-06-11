import { authorizeAxiosInstance, publicAxiosInstance } from '~/utils/authorizeAxios'
import { API_ROOT } from '~/utils/constants'

export const createEventAPI = async (data) => {
  const response = await authorizeAxiosInstance.post(`${API_ROOT}/v1/events`, data)
  return response.data
}

export const fetchEventsAPI = async (params) => {
  const response = await authorizeAxiosInstance.get(`${API_ROOT}/v1/events`, { params })
  return response.data
}

export const fetchEventByIdAPI = async (id) => {
  const response = await authorizeAxiosInstance.get(`${API_ROOT}/v1/events/${id}`)
  return response.data
}

export const joinEventAPI = async (id) => {
  const response = await authorizeAxiosInstance.post(`${API_ROOT}/v1/events/${id}/join`)
  return response.data
}

export const fetchEventParticipantsAPI = async (id, params) => {
  const response = await authorizeAxiosInstance.get(`${API_ROOT}/v1/events/${id}/participants`, { params })
  return response.data
}
