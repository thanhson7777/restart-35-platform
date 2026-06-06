import { authorizeAxiosInstance } from '~/utils/authorizeAxios';
import { API_ROOT } from '~/utils/constants';

export const getEnterpriseDashboard = () =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enterprise/dashboard`);

export const getEnterpriseDashboardGraduates = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enterprise/dashboard/graduates`, { params });

export const getEnterpriseDashboardLearners = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enterprise/dashboard/learners`, { params });
