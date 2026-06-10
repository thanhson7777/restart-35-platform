import { authorizeAxiosInstance } from '~/utils/authorizeAxios';
import { API_ROOT } from '~/utils/constants';

export const getPlacements = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/placements`, { params });

export const getMyPlacements = () =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/placements/my`);

export const getPlacementById = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/placements/${id}`);

export const createPlacement = (data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/placements`, data);

export const updatePlacement = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/placements/${id}`, data);

export const updatePlacementStatus = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/placements/${id}/status`, data);

export const resignPlacement = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/placements/${id}/resign`, data);

export const givePlacementFeedback = (id, data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/placements/${id}/feedback`, data);

export const getPlacementStats = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/placements/analytics/success-rate`, { params });
