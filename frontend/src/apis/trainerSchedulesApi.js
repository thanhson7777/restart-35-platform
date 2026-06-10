import { authorizeAxiosInstance } from '~/utils/authorizeAxios';
import { API_ROOT } from '~/utils/constants';

// ─── Trainer Schedules ────────────────────────────────────────────────────────

export const getTrainerSchedules = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/schedules/trainer/list`, { params });

export const getTrainerScheduleStats = () =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/schedules/trainer/stats`);

// ─── Schedule Builder (shared admin/trainer) ───────────────────────────────────

export const getAdminCourseSchedule = (courseId) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/schedules/course/${courseId}`);

export const createSchedule = (data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/schedules`, data);

export const updateSchedule = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/schedules/${id}`, data);

export const publishSchedule = (id) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/schedules/${id}/publish`);

export const deleteSchedule = (id) =>
  authorizeAxiosInstance.delete(`${API_ROOT}/v1/schedules/${id}`);

// ─── Session Management ────────────────────────────────────────────────────────

export const addScheduleSession = (id, data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/schedules/${id}/sessions`, data);

export const updateScheduleSession = (id, sessionNumber, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/schedules/${id}/sessions/${sessionNumber}`, data);

export const cancelScheduleSession = (id, sessionNumber, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/schedules/${id}/sessions/${sessionNumber}/cancel`, data);

export const rescheduleSession = (scheduleId, sessionNumber, data) =>
  authorizeAxiosInstance.put(
    `${API_ROOT}/v1/schedules/${scheduleId}/sessions/${sessionNumber}/reschedule`,
    data
  );

export const markSessionComplete = (scheduleId, sessionNumber, data = {}) =>
  authorizeAxiosInstance.put(
    `${API_ROOT}/v1/schedules/${scheduleId}/sessions/${sessionNumber}/complete`,
    data
  );

export const getScheduleById = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/schedules/${id}`);
