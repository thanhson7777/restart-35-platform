import { publicAxiosInstance } from '~/utils/authorizeAxios'
import { API_ROOT } from '~/utils/constants'

/**
 * Đăng nhập người dùng
 * @param {Object} data - { email, password }
 */
export const loginAPI = async (data) => {
  const response = await publicAxiosInstance.post(`${API_ROOT}/v1/users/login`, data)
  return response.data
}

/**
 * Đăng ký người dùng mới
 * @param {Object} data - { email, password, phone }
 */
export const registerAPI = async (data) => {
  const response = await publicAxiosInstance.post(`${API_ROOT}/v1/users/register`, data)
  return response.data
}

/**
 * Xác thực tài khoản qua email
 * @param {Object} data - { email, token }
 */
export const verifyAccountAPI = async (data) => {
  const response = await publicAxiosInstance.put(`${API_ROOT}/v1/users/verify`, data)
  return response.data
}
