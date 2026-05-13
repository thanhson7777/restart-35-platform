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

// ─── Token refresh queue ─────────────────────────────────────────────────────
// Prevents race condition: multiple 401/410 responses trigger multiple concurrent
// refresh calls. All requests that get a 401 while a refresh is in-flight are
// queued and replayed after the single refresh succeeds (or rejected if it fails).

let isRefreshing = false
let failedQueue = [] /** @type {{resolve: Function, reject: Function}[]} */
let refreshedToken = null // Store the most recently refreshed token

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) {
    throw new Error('No refresh token')
  }

  const response = await publicAxiosInstance.put(
    `${API_ROOT}/v1/users/refresh_token`,
    {},
    { headers: { Authorization: `Bearer ${refreshToken}` } }
  )

  const { accessToken, refreshToken: newRefreshToken } =
    response.data?.data ?? response.data ?? {}

  if (!accessToken) {
    throw new Error('Token refresh failed - no accessToken in response')
  }

  // Update localStorage immediately when we get the new token
  localStorage.setItem('accessToken', accessToken)
  if (newRefreshToken) {
    localStorage.setItem('refreshToken', newRefreshToken)
  }

  // Also store in variable for immediate access
  refreshedToken = accessToken

  return accessToken
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
    // Use refreshed token if available, otherwise read from localStorage
    const token = refreshedToken || localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log('[Interceptor] Token added to request:', config.url, '- Token:', token.substring(0, 20) + '...')
    } else {
      console.log('[Interceptor] NO TOKEN for request:', config.url)
    }
    return config
  },
  (error) => Promise.reject(error)
)

authorizeAxiosInstance.interceptors.response.use(
  (response) => {
    // Clear refreshed token after successful response
    refreshedToken = null
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // Not a 401/410, or already retried → propagate normally
    if (![401, 410].includes(error.response?.status) || originalRequest._retry) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    if (!isRefreshing) {
      isRefreshing = true

      try {
        const newToken = await refreshAccessToken()

        processQueue(null, newToken)

        // Replay the failed request with the fresh token
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return authorizeAxiosInstance(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)

        // Clear tokens and force logout
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')

        if (injectedStore) {
          injectedStore.dispatch({ type: 'user/clearUser' })
        }

        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
        refreshedToken = null
      }
    }

    // Refresh already in-flight — queue this request
    return new Promise((resolve, reject) => {
      failedQueue.push({
        resolve: (token) => {
          // Update header with token from queue
          originalRequest.headers.Authorization = `Bearer ${token}`
          // Also update the refreshedToken variable
          refreshedToken = token
          resolve(authorizeAxiosInstance(originalRequest))
        },
        reject: (err) => {
          reject(err)
        }
      })
    })
  }
)

export { publicAxiosInstance, authorizeAxiosInstance }
