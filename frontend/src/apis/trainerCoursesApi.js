import { authorizeAxiosInstance } from '~/utils/authorizeAxios';
import { API_ROOT } from '~/utils/constants';

// ─── Trainer Courses ─────────────────────────────────────────────────────────

export const getMyCourses = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/courses/me/my-courses`, { params });

export const getMyCourseStats = () =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/courses/me/my-courses/stats`);

export const createCourse = (data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/courses`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

export const updateCourse = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/courses/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

export const deleteCourse = (id) =>
  authorizeAxiosInstance.delete(`${API_ROOT}/v1/courses/${id}`);

export const submitCourse = (id) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/courses/${id}/submit`);

export const uploadCourseResource = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return authorizeAxiosInstance.post(`${API_ROOT}/v1/courses/upload-resource`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

// ─── Trainer Reviews ──────────────────────────────────────────────────────────

export const respondToReview = (id, data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/reviews/${id}/response`, {
    content: data.responseText || data.content,
    courseId: data.courseId
  });

export const getReviewsByCourse = (courseId, params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/reviews/course/${courseId}`, { params });

export const getReviewById = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/reviews/${id}`);

// ─── Trainer Placements ────────────────────────────────────────────────────────

export const getPlacements = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/placements`, { params });

export const createPlacement = (data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/placements`, data);

export const updatePlacement = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/placements/${id}`, data);

export const updatePlacementStatus = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/placements/${id}/status`, data);

export const getPlacementById = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/placements/${id}`);

export const resignPlacement = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/placements/${id}/resign`, data);
