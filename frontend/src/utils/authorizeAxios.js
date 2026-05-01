import axios from 'axios'
import { API_ROOT } from './constants'

const publicAxiosInstance = axios.create({
  baseURL: API_ROOT,
  headers: {
    'Content-Type': 'application/json'
  }
})

const authorizeAxiosInstance = axios.create({
  baseURL: API_ROOT,
  headers: {
    'Content-Type': 'application/json'
  }
})

let injectedStore = null

export const injectStore = (store) => {
  injectedStore = store
}

publicAxiosInstance.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
)

publicAxiosInstance.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
)

authorizeAxiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

authorizeAxiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (!refreshToken) {
          throw new Error('No refresh token')
        }

        const response = await publicAxiosInstance.put(
          `${API_ROOT}/v1/users/refresh_token`,
          {},
          { headers: { Authorization: `Bearer ${refreshToken}` } }
        )

        const { accessToken, refreshToken: newRefreshToken } = response.data.data || response.data

        if (accessToken) {
          localStorage.setItem('accessToken', accessToken)
          if (newRefreshToken) {
            localStorage.setItem('refreshToken', newRefreshToken)
          }
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return authorizeAxiosInstance(originalRequest)
        }

        throw new Error('Token refresh failed')
      } catch (refreshError) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')

        if (injectedStore) {
          injectedStore.dispatch({ type: 'user/clearUser' })
        }

        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export { publicAxiosInstance, authorizeAxiosInstance }
