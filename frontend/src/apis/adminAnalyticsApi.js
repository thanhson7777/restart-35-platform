import { authorizeAxiosInstance } from '~/utils/authorizeAxios'
import { API_ROOT } from '~/utils/constants'

export const getAdminDashboardOverview = async (startDate, endDate) => {
  let query = ''
  if (startDate && endDate) {
    query = `?startDate=${startDate}&endDate=${endDate}`
  }
  const response = await authorizeAxiosInstance.get(`${API_ROOT}/v1/admin-analytics/dashboard-overview${query}`)
  return response.data
}

export const getAdminUsersAnalytics = async (startDate, endDate) => {
  let query = ''
  if (startDate && endDate) {
    query = `?startDate=${startDate}&endDate=${endDate}`
  }
  const response = await authorizeAxiosInstance.get(`${API_ROOT}/v1/admin-analytics/dashboard/users${query}`)
  return response.data
}
export const getAdminTrainingAnalytics = async (timeRange = '6M') => {
  const response = await authorizeAxiosInstance.get(`${API_ROOT}/v1/admin-analytics/dashboard/training?timeRange=${timeRange}`)
  return response.data
}

export const getAdminRecruitmentAnalytics = async (timeRange = '6M') => {
  const response = await authorizeAxiosInstance.get(`${API_ROOT}/v1/admin-analytics/dashboard/recruitment?timeRange=${timeRange}`)
  return response.data
}

export const getAdminFinancialAnalytics = async (timeRange = 'all') => {
  const response = await authorizeAxiosInstance.get(`${API_ROOT}/v1/admin-analytics/dashboard/finance?timeRange=${timeRange}`)
  return response.data
}

export const getAdminCommunityAnalytics = async (timeRange = 'all') => {
  const response = await authorizeAxiosInstance.get(`${API_ROOT}/v1/admin-analytics/dashboard/community?timeRange=${timeRange}`)
  return response.data
}
