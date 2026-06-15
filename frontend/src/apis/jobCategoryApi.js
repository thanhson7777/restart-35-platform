import { authorizeAxiosInstance, publicAxiosInstance } from '~/utils/authorizeAxios'
import { API_ROOT } from '~/utils/constants'

export const getJobCategoriesAPI = async (includeInactive = false) => {
  const response = await publicAxiosInstance.get(`${API_ROOT}/v1/job-categories${includeInactive ? '?includeInactive=true' : ''}`)
  return response.data
}

export const createJobCategoryAPI = async (data) => {
  const response = await authorizeAxiosInstance.post(`${API_ROOT}/v1/job-categories`, data)
  return response.data
}

export const updateJobCategoryAPI = async (id, data) => {
  const response = await authorizeAxiosInstance.put(`${API_ROOT}/v1/job-categories/${id}`, data)
  return response.data
}

export const deleteJobCategoryAPI = async (id) => {
  const response = await authorizeAxiosInstance.delete(`${API_ROOT}/v1/job-categories/${id}`)
  return response.data
}
