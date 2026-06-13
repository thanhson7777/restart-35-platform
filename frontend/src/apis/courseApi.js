import { authorizeAxiosInstance, publicAxiosInstance } from '~/utils/authorizeAxios';
import { API_ROOT, ENROLLMENT_SOURCE } from '~/utils/constants';

// ─── Courses (Public) ─────────────────────────────────────────────────────────

export const getCourses = (params) =>
  publicAxiosInstance.get(`${API_ROOT}/v1/courses`, { params });

export const getPopularCourses = (params) =>
  publicAxiosInstance.get(`${API_ROOT}/v1/courses/popular`, { params });

export const getNewCourses = (params) =>
  publicAxiosInstance.get(`${API_ROOT}/v1/courses/new`, { params });

export const getFreeCourses = (params) =>
  publicAxiosInstance.get(`${API_ROOT}/v1/courses/free`, { params });

export const getPaidCourses = (params) =>
  publicAxiosInstance.get(`${API_ROOT}/v1/courses/paid`, { params });

export const getCoursesByCategory = (categoryId, params) =>
  publicAxiosInstance.get(`${API_ROOT}/v1/courses/category/${categoryId}`, { params });

export const getCourseById = (id, params) =>
  publicAxiosInstance.get(`${API_ROOT}/v1/courses/${id}`, { params });

export const getRelatedCourses = (id) =>
  publicAxiosInstance.get(`${API_ROOT}/v1/courses/${id}/related`);

export const getPartnershipCourses = (params) =>
  publicAxiosInstance.get(`${API_ROOT}/v1/courses`, {
    params: {
      ...params,
      linkedPartnershipId: params?.linkedPartnershipId,
      linkedEnterpriseId: params?.linkedEnterpriseId
    }
  });

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

export const dropEnrollment = (enrollmentId, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/enrollments/${enrollmentId}/drop`, data);

export const reopenWorkerProfile = () =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/worker-profiles/reopen`);

export const getEnrollmentRisk = (enrollmentId) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enrollments/${enrollmentId}/risk`);

// ─── Admin ───────────────────────────────────────────────────────────────────

export const getAllEnrollments = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enrollments/admin/all`, { params });

// ─── Admin Courses ─────────────────────────────────────────────────────────────

export const getAdminCourses = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/courses/admin/all`, { params });

export const getAdminPendingCourses = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/courses/admin/pending`, { params });

export const getAdminCourseStats = () =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/courses/admin/stats`);

export const getPendingCourses = () =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/courses/admin/pending`);

export const approveCourse = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/courses/${id}/approve`, data);

export const getCourseByIdAdmin = (id, params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/courses/${id}`, { params });

// ─── Admin Enrollments ─────────────────────────────────────────────────────────

export const getCourseEnrollments = (courseId, params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enrollments/course/${courseId}`, { params });

export const getAdminEnrollmentStats = () =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enrollments/admin/stats`);

export const exportEnrollments = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enrollments/admin/export`, {
    params,
    responseType: 'blob'
  });

// ─── Preview Lessons ───────────────────────────────────────────────────
export const getPreviewLessons = (courseId) =>
  publicAxiosInstance.get(`${API_ROOT}/v1/courses/${courseId}/preview-lessons`);

// ─── Course Sessions (Schedule) ───────────────────────────────────────
export const getCourseSchedule = (courseId) =>
  publicAxiosInstance.get(`${API_ROOT}/v1/schedules/public/course/${courseId}`);

// ─── Course Lessons ───────────────────────────────────────────────────
export const getCourseLessons = (courseId) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/courses/${courseId}/lessons`);

// ─── Enrollment Progress ───────────────────────────────────────────────
export const recordVideoProgress = (enrollmentId, lessonId, data) =>
  authorizeAxiosInstance.post(
    `${API_ROOT}/v1/lesson-progress/lessons/${lessonId}/progress`,
    { enrollmentId, ...data }
  );

export const getLessonProgress = (enrollmentId) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/lesson-progress/enrollments/${enrollmentId}/progress`);

export const markLessonComplete = (enrollmentId, lessonId) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/enrollments/${enrollmentId}/complete-item`, { itemId: lessonId });

// ─── Video Notes ──────────────────────────────────────────────────────
export const createVideoNote = (data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/video-notes`, data);

export const getVideoNotes = (enrollmentId) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enrollments/${enrollmentId}/notes`);

export const getVideoNotesByLesson = (lessonId) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/video-notes/lesson/${lessonId}`);

export const updateVideoNote = (noteId, data) =>
  authorizeAxiosInstance.patch(`${API_ROOT}/v1/video-notes/${noteId}`, data);

export const deleteVideoNote = (noteId) =>
  authorizeAxiosInstance.delete(`${API_ROOT}/v1/video-notes/${noteId}`);

// ─── Video Bookmarks ──────────────────────────────────────────────────
export const toggleVideoBookmark = (lessonId, data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/lesson-progress/lessons/${lessonId}/bookmark`, data);

export const getVideoBookmarks = (lessonId) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/lesson-progress/lessons/${lessonId}/bookmarks`);

// ─── Admin Dropout Risk & Interventions ──────────────────────────────────
export const getRiskList = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enrollments/admin/risk-list`, { params });

// ─── Admin Schedule Builder ───────────────────────────────────────────
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

export const addScheduleSession = (id, data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/schedules/${id}/sessions`, data);

export const updateScheduleSession = (id, sessionNumber, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/schedules/${id}/sessions/${sessionNumber}`, data);

export const cancelScheduleSession = (id, sessionNumber, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/schedules/${id}/sessions/${sessionNumber}/cancel`, data);

// ─── Certificates ─────────────────────────────────────────────────────
export const getMyCertificates = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/certificates/my`, { params });

export const getCertificateByEnrollment = (enrollmentId) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/certificates/enrollment/${enrollmentId}`);

export const verifyCertificate = (code) =>
  publicAxiosInstance.get(`${API_ROOT}/v1/certificates/verify/${code}`);

// ─── Payments & Transactions ───────────────────────────────────────────
export const createPayment = (data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/payments`, data);

export const getMyPayments = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/payments/my`, { params });

export const getAllPayments = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/payments`, { params });

export const getPaymentById = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/payments/${id}`);

export const updatePaymentStatus = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/payments/${id}/status`, data);

export const refundPayment = (id, data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/payments/${id}/refund`, data);

export const getInvoice = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/payments/${id}/invoice`);

// ─── ISA Repayments ───────────────────────────────────────────────────
export const getMyIsaRepayments = () =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/isa-repayments/my`);

export const submitIncome = (id, data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/isa-repayments/${id}/submit-income`, data);

export const createIsaRepayment = (data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/isa-repayments`, data);

export const getAllIsaRepayments = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/isa-repayments`, { params });

export const activateIsaRepayment = (id) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/isa-repayments/${id}/activate`);

export const getIsaRepaymentById = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/isa-repayments/${id}`);

export const calculateMonthlyPayment = (id, month) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/isa-repayments/${id}/calculate/${month}`);

export const updateMonthlyRecord = (id, month, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/isa-repayments/${id}/monthly-record/${month}`, data);

export const getIsaStatus = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/isa-repayments/${id}/status`);

// ─── Attendance ───────────────────────────────────────────────────────
export const getSessionAttendance = (scheduleId, sessionNumber) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/schedules/${scheduleId}/sessions/${sessionNumber}/attendance`);

export const recordAttendance = (scheduleId, sessionNumber, data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/schedules/${scheduleId}/sessions/${sessionNumber}/attendance`, data);

export const studentCheckin = (scheduleId, sessionNumber, data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/schedules/${scheduleId}/sessions/${sessionNumber}/checkin`, data);

export const getScheduleById = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/schedules/${id}`);

export const getWorkerUpcomingSchedule = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/schedules/upcoming`, { params });

// ─── Trainer Courses (NEW) ──────────────────────────────────────────
export const getMyCourses = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/courses/me/my-courses`, { params });

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

