import { authorizeAxiosInstance } from '~/utils/authorizeAxios';
import { API_ROOT } from '~/utils/constants';

// ─── Worker ───────────────────────────────────────────────────────────────────

export const getMyApplications = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/applications`, { params });

export const createApplication = (data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/applications`, data);

export const getApplicationById = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/applications/${id}`);

export const updateApplication = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/applications/${id}`, data);

export const submitApplication = (id) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/applications/${id}/submit`);

export const deleteApplication = (id) =>
  authorizeAxiosInstance.delete(`${API_ROOT}/v1/applications/${id}`);

export const appealApplication = (id, data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/applications/${id}/appeal`, data);

// ─── NGO ─────────────────────────────────────────────────────────────────────

export const getPendingApplications = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/applications/ngo/pending`, { params });

export const getApplicationForReview = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/applications/ngo/review/${id}`);

export const approveApplication = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/applications/${id}/approve`, data);

export const rejectApplication = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/applications/${id}/reject`, data);

export const waitlistApplication = (id) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/applications/${id}/waitlist`);

// ─── Admin ───────────────────────────────────────────────────────────────────

export const getAllApplications = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/admin/jobs/applications`, { params });

export const getEnterpriseApplicationStats = () =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/admin/jobs/applications/enterprise-stats`);
