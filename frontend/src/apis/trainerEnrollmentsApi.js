import { authorizeAxiosInstance } from '~/utils/authorizeAxios';
import { API_ROOT } from '~/utils/constants';

// ─── Trainer Enrollments ───────────────────────────────────────────────────────

export const getCourseEnrollments = (courseId, params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enrollments/course/${courseId}`, { params });

export const getEnrollmentById = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enrollments/${id}`);

export const getTrainerEnrollments = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enrollments/trainer/list`, { params });

export const updateEnrollmentProgress = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/enrollments/${id}/progress`, data);

export const updateEnrollmentStatus = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/enrollments/${id}/status`, data);

export const suspendEnrollment = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/enrollments/${id}/suspend`, data);

export const completeEnrollmentTrainer = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/enrollments/${id}/complete`, data);

export const failEnrollment = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/enrollments/${id}/fail`, data);

export const getEnrollmentStats = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enrollments/stats`, { params });

export const getEnrollmentRiskDetail = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enrollments/${id}/risk`);

export const triggerManualIntervention = (id, data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/enrollments/${id}/intervention`, data);

// ─── Attendance ────────────────────────────────────────────────────────────────

export const getSessionAttendance = (scheduleId, sessionNumber) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/schedules/${scheduleId}/sessions/${sessionNumber}/attendance`);

export const recordAttendance = (scheduleId, sessionNumber, data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/schedules/${scheduleId}/sessions/${sessionNumber}/attendance`, data);
