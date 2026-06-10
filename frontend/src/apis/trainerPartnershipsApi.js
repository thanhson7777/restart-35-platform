import { authorizeAxiosInstance } from '~/utils/authorizeAxios';
import { API_ROOT } from '~/utils/constants';

// ─── Trainer Dashboard Partnerships ─────────────────────────────────────────────

export const getTrainerPartnerships = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/trainer/dashboard/partnerships`, { params });

export const getTrainerDashboardPartnershipById = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/trainer/dashboard/partnerships/${id}`);

export const getPartnershipStats = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/trainer/dashboard/partnerships/${id}/stats`);

// ─── Partnership CRUD ──────────────────────────────────────────────────────────

export const getPartnershipDetail = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/partnerships/${id}`);

export const getPartnershipLearners = (id, params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/partnerships/${id}/learners`, { params });

export const getPartnershipGraduates = (id, params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/partnerships/${id}/graduates`, { params });

export const respondPartnership = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/partnerships/${id}/respond`, data);

export const negotiatePartnership = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/partnerships/${id}/negotiate`, data);

export const confirmPartnership = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/partnerships/${id}/confirm`, data);

export const cancelPartnership = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/partnerships/${id}/cancel`, data);

// ─── Enterprise Students ────────────────────────────────────────────────────────

export const getEnterpriseStudents = () =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/trainer/dashboard/enterprise-students`);
