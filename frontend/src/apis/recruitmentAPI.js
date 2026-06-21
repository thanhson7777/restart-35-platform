import { authorizeAxiosInstance } from '~/utils/authorizeAxios';
import { API_ROOT } from '~/utils/constants';

// ============================================
// ENTERPRISE - RECRUITMENT JOB APIs
// ============================================

export const getEnterpriseJobs = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enterprise/jobs`, { params });

export const getEnterpriseJobById = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enterprise/jobs/${id}`);

export const createJob = (data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/enterprise/jobs`, data);

export const updateJob = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/enterprise/jobs/${id}`, data);

export const deleteJob = (id) =>
  authorizeAxiosInstance.delete(`${API_ROOT}/v1/enterprise/jobs/${id}`);

export const submitJobForApproval = (id) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/enterprise/jobs/${id}/submit`);

export const cancelJobApproval = (id) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/enterprise/jobs/${id}/cancel-approval`);

export const closeJob = (id) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/enterprise/jobs/${id}/close`);

export const getJobApplications = (jobId, params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enterprise/jobs/${jobId}/applications`, { params });

export const getJobStats = (jobId) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enterprise/jobs/${jobId}/stats`);

// Admin APIs
export const getPendingJobs = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/admin/jobs/pending`, { params });

export const getJobForReview = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/admin/jobs/${id}/review`);

export const approveJob = (id) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/admin/jobs/${id}/approve`);

export const rejectJob = (id, reason) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/admin/jobs/${id}/reject`, { reason });

export const getRejectedJobs = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/admin/jobs/rejected`, { params });

// ============================================
// APPLICATION APIs
// ============================================

// Worker - Apply
export const applyToJob = (jobId, data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/recruitments/${jobId}/apply`, data);

export const getMyApplications = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/recruitments/my/applications`, { params });

export const getMyApplicationById = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/recruitments/my/applications/${id}`);

export const withdrawApplication = (id) =>
  authorizeAxiosInstance.delete(`${API_ROOT}/v1/recruitments/my/applications/${id}`);

// Enterprise - Manage Applications
export const getEnterpriseApplications = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enterprise/applications`, { params });

export const getEnterpriseApplicationById = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enterprise/applications/${id}`);

export const getWorkerProfileForEnterprise = (applicationId) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enterprise/applications/${applicationId}/profile`);

export const updateApplicationStatus = (id, status, note) =>
  authorizeAxiosInstance.patch(`${API_ROOT}/v1/enterprise/applications/${id}/status`, { status, note });

export const shortlistApplication = (id, data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/enterprise/applications/${id}/shortlist`, data);

export const rejectApplication = (id, data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/enterprise/applications/${id}/reject`, data);

export const getApplicationInterview = (applicationId) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enterprise/applications/${applicationId}/interview`);

// ============================================
// INTERVIEW APIs
// ============================================

// Enterprise
export const getEnterpriseInterviews = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enterprise/interviews`, { params });

export const getEnterpriseInterviewById = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enterprise/interviews/${id}`);

export const createInterview = (data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/enterprise/interviews`, data);

export const updateInterviewEnterprise = (id, data) =>
  authorizeAxiosInstance.patch(`${API_ROOT}/v1/enterprise/interviews/${id}`, data);

export const rescheduleInterviewEnterprise = (id, data) =>
  authorizeAxiosInstance.patch(`${API_ROOT}/v1/enterprise/interviews/${id}/reschedule`, data);

export const cancelInterviewEnterprise = (id) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/enterprise/interviews/${id}/cancel`);

export const completeInterview = (id, data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/enterprise/interviews/${id}/complete`, data);

// Worker
export const getMyInterviews = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/my/interviews`, { params });

export const getMyInterviewById = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/my/interviews/${id}`);

export const confirmMyInterview = (id) =>
  authorizeAxiosInstance.patch(`${API_ROOT}/v1/my/interviews/${id}/confirm`);

// Alias for convenience
export const confirmInterview = confirmMyInterview;

export const requestRescheduleMyInterview = (id, data) =>
  authorizeAxiosInstance.patch(`${API_ROOT}/v1/my/interviews/${id}/reschedule`, data);

// ============================================
// OFFER APIs
// ============================================

// Enterprise
export const getEnterpriseOffers = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enterprise/offers`, { params });

export const getEnterpriseOfferById = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enterprise/offers/${id}`);

export const createOffer = (data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/enterprise/offers`, data);

export const withdrawOffer = (id) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/enterprise/offers/${id}/withdraw`);

// Worker
export const getMyOffers = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/my/offers`, { params });

export const getMyOfferById = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/my/offers/${id}`);

export const acceptOffer = (id, data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/my/offers/${id}/accept`, data);

export const rejectOffer = (id, data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/my/offers/${id}/reject`, data);

// ============================================
// PUBLIC APIs
// ============================================

export const getPublishedJobs = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/jobs`, { params });

export const getPublicJobById = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/jobs/${id}`);

export const getSimilarJobs = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/jobs/similar/${id}`);

export const getJobsMapData = () =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/jobs/map-data`);

export const getRecommendedJobs = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/jobs/recommended`, { params });
