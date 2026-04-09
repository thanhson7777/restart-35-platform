import axios from 'axios'
import { toast } from 'react-toastify'
import { interceptorLoadingElement } from './formatter'
import { logoutUserAPI } from '~/redux/user/userSlice'
import { refreshTokenAPI } from '~/apis'

let axiosReduxStore

export const injectStore = mainStore => { axiosReduxStore = mainStore }

const authorizeAxiosInstance = axios.create()

authorizeAxiosInstance.defaults.timeout = 1000 * 60 * 10
authorizeAxiosInstance.defaults.withCredentials = true

authorizeAxiosInstance.interceptors.request.use((config) => {
  interceptorLoadingElement(true)

  let token = localStorage.getItem('accessToken')

  if (token && token.startsWith('"') && token.endsWith('"')) {
    token = token.slice(1, -1)
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, function (error) {
  return Promise.reject(error)
})

let refreshTokenPromise = null

authorizeAxiosInstance.interceptors.response.use((response) => {
  interceptorLoadingElement(false)
  return response
}, (error) => {
  interceptorLoadingElement(false)

  if (error.response?.status === 401) {
    axiosReduxStore.dispatch(logoutUserAPI(false))
  }

  const originalRequest = error.config

  if (error.response?.status === 410 && !originalRequest._retry) {
    originalRequest._retry = true

    if (!refreshTokenPromise) {
      refreshTokenPromise = refreshTokenAPI()
        .then(data => {
          const newAccessToken = data?.accessToken || data?.data?.accessToken

          if (newAccessToken) {
            localStorage.setItem('accessToken', newAccessToken)
          }

          return newAccessToken
        })
        .catch((_error) => {
          axiosReduxStore.dispatch(logoutUserAPI(false))
          return Promise.reject(_error)
        })
        .finally(() => {
          refreshTokenPromise = null
        })
    }

    return refreshTokenPromise.then(accessToken => {
      originalRequest.headers.Authorization = `Bearer ${accessToken}`
      return authorizeAxiosInstance(originalRequest)
    })
  }

  let errorMessage = error?.message
  if (error.response?.data?.message) {
    errorMessage = error.response?.data?.message
  }

  if (error.response?.status !== 410) {
    toast.error(errorMessage)
  }

  return Promise.reject(error)
})

// Axios instance cho các API không cần authorization (login, register, etc.)
const publicAxiosInstance = axios.create()

publicAxiosInstance.defaults.timeout = 1000 * 60 * 10
publicAxiosInstance.defaults.withCredentials = true

publicAxiosInstance.interceptors.request.use((config) => {
  interceptorLoadingElement(true)
  return config
}, function (error) {
  return Promise.reject(error)
})

publicAxiosInstance.interceptors.response.use((response) => {
  interceptorLoadingElement(false)
  return response
}, (error) => {
  interceptorLoadingElement(false)
  let errorMessage = error?.message
  if (error.response?.data?.message) {
    errorMessage = error.response?.data?.message
  }
  toast.error(errorMessage)
  return Promise.reject(error)
})

export default authorizeAxiosInstance
export { authorizeAxiosInstance, publicAxiosInstance }