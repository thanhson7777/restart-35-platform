import { authorizeAxiosInstance, publicAxiosInstance } from '~/utils/authorizeAxios';
import { API_ROOT } from '~/utils/constants';

// ─── Public ──────────────────────────────────────────────────────────────────

export const getScholarships = (params) =>
  publicAxiosInstance.get(`${API_ROOT}/v1/scholarships`, { params });

export const getScholarshipById = (id) =>
  publicAxiosInstance.get(`${API_ROOT}/v1/scholarships/${id}`);

// ─── Worker (Authenticated) ──────────────────────────────────────────────────

export const getEligibleScholarships = () =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/scholarships/worker/eligible`);

export const checkScholarshipEligibility = (scholarshipId) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/scholarships/worker/check-eligibility/${scholarshipId}`);

// ─── NGO (Authenticated) ──────────────────────────────────────────────────────

export const createScholarship = (data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/scholarships`, data);

export const getMyScholarships = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/scholarships/my/list`, { params });

export const updateScholarship = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/scholarships/${id}`, data);

export const publishScholarship = (id) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/scholarships/${id}/publish`);

export const pauseScholarship = (id) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/scholarships/${id}/pause`);

export const resumeScholarship = (id) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/scholarships/${id}/resume`);

export const deleteScholarship = (id) =>
  authorizeAxiosInstance.delete(`${API_ROOT}/v1/scholarships/${id}`);

export const getScholarshipStats = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/scholarships/${id}/stats`);

export const addLinkedCourse = (scholarshipId, data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/scholarships/${scholarshipId}/courses`, data);

export const removeLinkedCourse = (scholarshipId, courseId) =>
  authorizeAxiosInstance.delete(`${API_ROOT}/v1/scholarships/${scholarshipId}/courses/${courseId}`);

// ─── Admin (Authenticated) ─────────────────────────────────────────────────────

export const getAdminScholarships = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/scholarships/admin/all`, { params });

export const getAdminScholarshipStats = () =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/scholarships/admin/stats`);

export const getAdminScholarshipApplications = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/scholarships/admin/applications`, { params });
