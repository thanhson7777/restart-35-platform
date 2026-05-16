import { authorizeAxiosInstance, publicAxiosInstance } from '~/utils/authorizeAxios';
import { API_ROOT } from '~/utils/constants';

// ─── Courses (Public) ─────────────────────────────────────────────────────────

export const getCourses = (params) =>
  publicAxiosInstance.get(`${API_ROOT}/v1/courses`, { params });

export const getPopularCourses = (params) =>
  publicAxiosInstance.get(`${API_ROOT}/v1/courses/popular`, { params });

export const getNewCourses = (params) =>
  publicAxiosInstance.get(`${API_ROOT}/v1/courses/new`, { params });

export const getCoursesByCategory = (categoryId, params) =>
  publicAxiosInstance.get(`${API_ROOT}/v1/courses/category/${categoryId}`, { params });

export const getCourseById = (id, params) =>
  publicAxiosInstance.get(`${API_ROOT}/v1/courses/${id}`, { params });

export const getRelatedCourses = (id) =>
  publicAxiosInstance.get(`${API_ROOT}/v1/courses/${id}/related`);

// ─── Courses (Authenticated - Worker) ─────────────────────────────────────────

export const getRecommendedCourses = () =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/courses/me/recommended`);

// ─── Enrollments (Authenticated - Worker) ─────────────────────────────────────

export const getMyEnrollments = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enrollments`, { params });

export const enrollCourse = (data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/enrollments`, data);

export const getEnrollmentById = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enrollments/${id}`);

export const cancelEnrollment = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/enrollments/${id}/cancel`, data);

// ─── Trainer ─────────────────────────────────────────────────────────────────

export const getCourseEnrollments = (courseId, params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enrollments/course/${courseId}`, { params });

export const updateEnrollmentProgress = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/enrollments/${id}/progress`, data);

export const updateEnrollmentStatus = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/enrollments/${id}/status`, data);

export const getEnrollmentStats = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enrollments/stats`, { params });

// ─── Admin ───────────────────────────────────────────────────────────────────

export const getAllEnrollments = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enrollments/admin/all`, { params });

export const getPendingCourses = () =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/courses/admin/pending`);

export const approveCourse = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/courses/${id}/approve`, data);
