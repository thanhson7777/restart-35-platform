import { authorizeAxiosInstance } from '~/utils/authorizeAxios'
import { API_ROOT } from '~/utils/constants'

const BASE_URL = `${API_ROOT}/v1/service-packages`

export const servicePackageApi = {
  // Public/Enterprise
  getActivePackages: async () => {
    const res = await authorizeAxiosInstance.get(`${BASE_URL}/active`)
    return res.data
  },
  buyPackage: async (id, method, returnUrl) => {
    const res = await authorizeAxiosInstance.post(`${BASE_URL}/${id}/buy`, { method, returnUrl })
    return res.data
  },

  // Admin
  getAllPackages: async () => {
    const res = await authorizeAxiosInstance.get(`${BASE_URL}`)
    return res.data
  },
  createPackage: async (data) => {
    const res = await authorizeAxiosInstance.post(`${BASE_URL}`, data)
    return res.data
  },
  updatePackage: async (id, data) => {
    const res = await authorizeAxiosInstance.put(`${BASE_URL}/${id}`, data)
    return res.data
  },
  deletePackage: async (id) => {
    const res = await authorizeAxiosInstance.delete(`${BASE_URL}/${id}`)
    return res.data
  }
}
