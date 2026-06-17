import { authorizeAxiosInstance, publicAxiosInstance } from '~/utils/authorizeAxios'
import { API_ROOT } from '~/utils/constants'

export const getMasterDataAPI = async (type) => {
  const response = await publicAxiosInstance.get(`${API_ROOT}/v1/master-data?type=${type}`)
  return response.data
}

export const getMasterDataAdminAPI = async () => {
  const response = await authorizeAxiosInstance.get(`${API_ROOT}/v1/master-data/admin/all`)
  return response.data
}

export const createMasterDataAPI = async (data) => {
  const response = await authorizeAxiosInstance.post(`${API_ROOT}/v1/master-data`, data)
  return response.data
}

export const updateMasterDataAPI = async (id, data) => {
  const response = await authorizeAxiosInstance.put(`${API_ROOT}/v1/master-data/${id}`, data)
  return response.data
}

export const deleteMasterDataAPI = async (id) => {
  const response = await authorizeAxiosInstance.delete(`${API_ROOT}/v1/master-data/${id}`)
  return response.data
}
