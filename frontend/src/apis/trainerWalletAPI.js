import { authorizeAxiosInstance } from '~/utils/authorizeAxios'
import { API_ROOT } from '~/utils/constants'

export const walletAPI = {
  getMyWallet: async () => {
    const request = await authorizeAxiosInstance.get(`${API_ROOT}/v1/wallets/my-wallet`)
    return request.data
  },
  getMyTransactions: async () => {
    const request = await authorizeAxiosInstance.get(`${API_ROOT}/v1/wallets/my-transactions`)
    return request.data
  },
  createTopupUrl: async (data) => {
    const request = await authorizeAxiosInstance.post(`${API_ROOT}/v1/wallets/topup`, data)
    return request.data
  }
}
