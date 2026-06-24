import { authorizeAxiosInstance } from '~/utils/authorizeAxios';
import { API_ROOT } from '~/utils/constants';

// ─── Organizations Admin ───────────────────────────────────────────────────────

export const getOrganizations = async (params) => {
  const response = await authorizeAxiosInstance.get(`${API_ROOT}/v1/organizations`, { params });
  return response.data;
};
export const getOrganizationStats = async () => {
  const response = await authorizeAxiosInstance.get(`${API_ROOT}/v1/organizations/stats`);
  return response.data;
};

export const createOrganization = async (data) => {
  const response = await authorizeAxiosInstance.post(`${API_ROOT}/v1/organizations`, data);
  return response.data;
};

export const getOrganizationById = async (id) => {
  const response = await authorizeAxiosInstance.get(`${API_ROOT}/v1/organizations/${id}`);
  return response.data;
};

export const updateOrganization = async (id, data) => {
  const response = await authorizeAxiosInstance.put(`${API_ROOT}/v1/organizations/${id}`, data);
  return response.data;
};

export const deleteOrganization = async (id) => {
  const response = await authorizeAxiosInstance.delete(`${API_ROOT}/v1/organizations/${id}`);
  return response.data;
};

export const getOrganizationMembers = async (id) => {
  const response = await authorizeAxiosInstance.get(`${API_ROOT}/v1/organizations/${id}/members`);
  return response.data;
};

export const getOrganizationQuota = async (id) => {
  const response = await authorizeAxiosInstance.get(`${API_ROOT}/v1/organizations/${id}/quota`);
  return response.data;
};

export const updateOrganizationQuota = async (id, data) => {
  const response = await authorizeAxiosInstance.put(`${API_ROOT}/v1/organizations/${id}/quota`, data);
  return response.data;
};
