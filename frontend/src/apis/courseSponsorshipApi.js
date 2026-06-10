import { authorizeAxiosInstance } from '~/utils/authorizeAxios';
import { API_ROOT } from '~/utils/constants';

export const getSponsorships = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/course-sponsorships`, { params });

export const getSponsorshipById = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/course-sponsorships/${id}`);

export const createSponsorship = (data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/course-sponsorships`, data);

export const updateSponsorship = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/course-sponsorships/${id}`, data);

export const deleteSponsorship = (id) =>
  authorizeAxiosInstance.delete(`${API_ROOT}/v1/course-sponsorships/${id}`);

export const getSponsorshipLearners = (id, params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/course-sponsorships/${id}/learners`, { params });

export const getMySponsorships = () =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/worker-sponsorships/my`);
