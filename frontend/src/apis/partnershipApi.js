import { authorizeAxiosInstance } from '~/utils/authorizeAxios';
import { API_ROOT } from '~/utils/constants';

// ─── Enterprise Partnerships ──────────────────────────────────────────────────────

export const getEnterprisePartnerships = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/partnerships/enterprise/my`, { params });

export const createPartnership = (data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/partnerships`, data);

// ─── Partnership Detail (shared enterprise/trainer) ─────────────────────────────

export const getPartnershipDetail = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/partnerships/${id}`);

export const getPartnershipGraduates = (id, params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/partnerships/${id}/graduates`, { params });
