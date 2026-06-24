import { authorizeAxiosInstance } from '~/utils/authorizeAxios'
import { API_ROOT } from '~/utils/constants'

export const getMyWallet = async () => {
  const request = await authorizeAxiosInstance.get(`${API_ROOT}/v1/wallets/my-wallet`)
  return request.data
}

export const getMyTransactions = async (params) => {
  const request = await authorizeAxiosInstance.get(`${API_ROOT}/v1/wallets/my-transactions`, { params })
  return request.data
}

export const createTopupUrl = async (data) => {
  // data: { amount: Number, returnUrl: String }
  const request = await authorizeAxiosInstance.post(`${API_ROOT}/v1/wallets/topup`, data)
  return request.data
}
