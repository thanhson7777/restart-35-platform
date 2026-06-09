import { authorizeAxiosInstance } from '~/utils/authorizeAxios';
import { API_ROOT } from '~/utils/constants';

// ─── Organizations Admin ───────────────────────────────────────────────────────

export const getOrganizations = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/organizations`, { params });

export const createOrganization = (data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/organizations`, data);

export const getOrganizationById = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/organizations/${id}`);

export const updateOrganization = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/organizations/${id}`, data);

export const deleteOrganization = (id) =>
  authorizeAxiosInstance.delete(`${API_ROOT}/v1/organizations/${id}`);

export const getOrganizationMembers = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/organizations/${id}/members`);

export const getOrganizationQuota = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/organizations/${id}/quota`);

export const updateOrganizationQuota = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/organizations/${id}/quota`, data);
