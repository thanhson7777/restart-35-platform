import { authorizeAxiosInstance } from '~/utils/authorizeAxios';
import { API_ROOT } from '~/utils/constants';

export const getTrainerPartnerships = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/trainer/dashboard/partnerships`, { params });

export const getTrainerDashboardPartnershipById = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/trainer/dashboard/partnerships/${id}`);

export const getPartnershipStats = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/trainer/dashboard/partnerships/${id}/stats`);

export const getPartnershipDetail = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/partnerships/${id}`);

export const getEnterprisePartnerships = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/partnerships/enterprise/my`, { params });

export const createPartnership = (data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/partnerships`, data);

export const respondPartnership = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/partnerships/${id}/respond`, data);

export const negotiatePartnership = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/partnerships/${id}/negotiate`, data);

export const confirmPartnership = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/partnerships/${id}/confirm`, data);

export const cancelPartnership = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/partnerships/${id}/cancel`, data);

export const getPartnershipLearners = (id, params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/partnerships/${id}/learners`, { params });

export const getPartnershipGraduates = (id, params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/partnerships/${id}/graduates`, { params });
