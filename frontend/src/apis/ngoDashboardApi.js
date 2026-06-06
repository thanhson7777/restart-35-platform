import { authorizeAxiosInstance } from '~/utils/authorizeAxios';
import { API_ROOT } from '~/utils/constants';

export const getNgoImpactDashboard = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/ngo/dashboard/impact`, { params });

export const getNgoImpactLearners = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/ngo/dashboard/impact/learners`, { params });

export const getNgoImpactGraduates = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/ngo/dashboard/impact/graduates`, { params });
