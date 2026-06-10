import { authorizeAxiosInstance } from '~/utils/authorizeAxios'
import { API_ROOT } from '~/utils/constants'

const MENTOR_SESSION_URL = `${API_ROOT}/v1/mentor-sessions`

export const getMyMentorSessions = (params) =>
  authorizeAxiosInstance.get(MENTOR_SESSION_URL, { params })

export const getUpcomingMentorSessions = (limit) =>
  authorizeAxiosInstance.get(`${MENTOR_SESSION_URL}/upcoming`, { params: { limit } })

export const getMentorSessionById = (id) =>
  authorizeAxiosInstance.get(`${MENTOR_SESSION_URL}/${id}`)

export const bookMentorSession = (data) =>
  authorizeAxiosInstance.post(MENTOR_SESSION_URL, data)

export const cancelMentorSession = (id, reason) =>
  authorizeAxiosInstance.put(`${MENTOR_SESSION_URL}/${id}`, { status: 'cancelled', cancelReason: reason })

export const completeMentorSession = (id, rating, feedback) =>
  authorizeAxiosInstance.put(`${MENTOR_SESSION_URL}/${id}/complete`, { rating, feedback })
