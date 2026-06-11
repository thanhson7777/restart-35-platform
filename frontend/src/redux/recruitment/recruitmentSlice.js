import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getPublishedJobs,
  getPublicJobById,
  getMyApplications,
  getMyApplicationById,
  getMyInterviews,
  getMyInterviewById,
  getMyOffers,
  getMyOfferById,
  applyToJob,
  withdrawApplication,
  confirmMyInterview,
  requestRescheduleMyInterview,
  acceptOffer,
  rejectOffer,
  getEnterpriseJobs,
  getEnterpriseJobById,
  getJobApplications,
  getJobStats,
  getEnterpriseApplications,
  getEnterpriseApplicationById,
  getEnterpriseInterviews,
  getEnterpriseInterviewById,
  getEnterpriseOffers,
  getEnterpriseOfferById,
  getWorkerProfileForEnterprise,
  getApplicationInterview,
} from '~/apis/recruitmentAPI';

// ============================================
// WORKER THUNKS
// ============================================

// Get published jobs for Community Hub
export const fetchPublishedJobs = createAsyncThunk(
  'recruitment/fetchPublishedJobs',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await getPublishedJobs(params);
      const data = response?.data?.data || response?.data;
      return {
        jobs: data?.jobs || data || [],
        total: data?.total || 0,
        page: data?.page || 1,
        pages: data?.pages || 1,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch jobs');
    }
  }
);

// Get job details
export const fetchJobDetails = createAsyncThunk(
  'recruitment/fetchJobDetails',
  async (jobId, { rejectWithValue }) => {
    try {
      const response = await getPublicJobById(jobId);
      return response?.data?.data || response?.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch job');
    }
  }
);

// Apply to job
export const submitApplication = createAsyncThunk(
  'recruitment/submitApplication',
  async ({ jobId, data }, { rejectWithValue }) => {
    try {
      const response = await applyToJob(jobId, data);
      return response?.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to apply');
    }
  }
);

// Get similar jobs
export const fetchSimilarJobs = createAsyncThunk(
  'recruitment/fetchSimilarJobs',
  async ({ jobId, limit = 5 } = {}, { rejectWithValue }) => {
    try {
      const response = await getSimilarJobs(jobId);
      const data = response?.data?.data || response?.data;
      return data || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch similar jobs');
    }
  }
);

// Get recommended jobs based on worker skills
export const fetchRecommendedRecruitmentJobs = createAsyncThunk(
  'recruitment/fetchRecommendedJobs',
  async ({ skills = [], page = 1, limit = 10 } = {}, { rejectWithValue }) => {
    try {
      const response = await getRecommendedJobs({ skills, page, limit });
      const data = response?.data?.data || response?.data;
      return {
        jobs: data || [],
        pagination: response?.data?.pagination || {},
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch recommended jobs');
    }
  }
);

// Get my applications
export const fetchMyApplications = createAsyncThunk(
  'recruitment/fetchMyApplications',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await getMyApplications(params);
      const data = response?.data?.data || response?.data;
      return {
        applications: data?.applications || data || [],
        total: data?.total || 0,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch applications');
    }
  }
);

// Get my application details
export const fetchMyApplicationDetails = createAsyncThunk(
  'recruitment/fetchMyApplicationDetails',
  async (applicationId, { rejectWithValue }) => {
    try {
      const response = await getMyApplicationById(applicationId);
      return response?.data?.data || response?.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch application');
    }
  }
);

// Withdraw application
export const withdrawMyApplication = createAsyncThunk(
  'recruitment/withdrawApplication',
  async (applicationId, { rejectWithValue }) => {
    try {
      await withdrawApplication(applicationId);
      return applicationId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to withdraw application');
    }
  }
);

// Get my interviews
export const fetchMyInterviews = createAsyncThunk(
  'recruitment/fetchMyInterviews',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await getMyInterviews(params);
      const data = response?.data?.data || response?.data;
      return {
        interviews: data?.interviews || data || [],
        total: data?.total || 0,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch interviews');
    }
  }
);

// Get my interview details
export const fetchMyInterviewDetails = createAsyncThunk(
  'recruitment/fetchMyInterviewDetails',
  async (interviewId, { rejectWithValue }) => {
    try {
      const response = await getMyInterviewById(interviewId);
      return response?.data?.data || response?.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch interview');
    }
  }
);

// Confirm interview
export const confirmInterview = createAsyncThunk(
  'recruitment/confirmInterview',
  async (interviewId, { rejectWithValue }) => {
    try {
      await confirmMyInterview(interviewId);
      return interviewId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to confirm interview');
    }
  }
);

// Request reschedule
export const rescheduleMyInterview = createAsyncThunk(
  'recruitment/rescheduleInterview',
  async ({ interviewId, reason, newPreferredTime }, { rejectWithValue }) => {
    try {
      await requestRescheduleMyInterview(interviewId, { reason, newPreferredTime });
      return { interviewId, reason, newPreferredTime };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to request reschedule');
    }
  }
);

// Get my offers
export const fetchMyOffers = createAsyncThunk(
  'recruitment/fetchMyOffers',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await getMyOffers(params);
      const data = response?.data?.data || response?.data;
      return {
        offers: data?.offers || data || [],
        total: data?.total || 0,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch offers');
    }
  }
);

// Get my offer details
export const fetchMyOfferDetails = createAsyncThunk(
  'recruitment/fetchMyOfferDetails',
  async (offerId, { rejectWithValue }) => {
    try {
      const response = await getMyOfferById(offerId);
      return response?.data?.data || response?.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch offer');
    }
  }
);

// Accept offer
export const acceptMyOffer = createAsyncThunk(
  'recruitment/acceptOffer',
  async ({ offerId, responseNote }, { rejectWithValue }) => {
    try {
      await acceptOffer(offerId, { responseNote });
      return offerId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to accept offer');
    }
  }
);

// Reject offer
export const rejectMyOffer = createAsyncThunk(
  'recruitment/rejectOffer',
  async ({ offerId, reason }, { rejectWithValue }) => {
    try {
      await rejectOffer(offerId, { reason });
      return offerId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reject offer');
    }
  }
);

// ============================================
// ENTERPRISE THUNKS
// ============================================

// Get enterprise jobs
export const fetchEnterpriseJobs = createAsyncThunk(
  'recruitment/fetchEnterpriseJobs',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await getEnterpriseJobs(params);
      const data = response?.data?.data || response?.data;
      return {
        jobs: data?.jobs || data || [],
        total: data?.total || 0,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch jobs');
    }
  }
);

// Get enterprise job details
export const fetchEnterpriseJobDetails = createAsyncThunk(
  'recruitment/fetchEnterpriseJobDetails',
  async (jobId, { rejectWithValue }) => {
    try {
      const response = await getEnterpriseJobById(jobId);
      return response?.data?.data || response?.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch job');
    }
  }
);

// Get job applications
export const fetchJobApplications = createAsyncThunk(
  'recruitment/fetchJobApplications',
  async ({ jobId, params = {} }, { rejectWithValue }) => {
    try {
      const response = await getJobApplications(jobId, params);
      const data = response?.data?.data || response?.data;
      return {
        jobId,
        applications: data?.applications || data || [],
        total: data?.total || 0,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch applications');
    }
  }
);

// Get job stats
export const fetchJobStats = createAsyncThunk(
  'recruitment/fetchJobStats',
  async (jobId, { rejectWithValue }) => {
    try {
      const response = await getJobStats(jobId);
      return {
        jobId,
        stats: response?.data?.data || response?.data,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch stats');
    }
  }
);

// Get enterprise applications
export const fetchEnterpriseApplications = createAsyncThunk(
  'recruitment/fetchEnterpriseApplications',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await getEnterpriseApplications(params);
      const data = response?.data?.data || response?.data;
      return {
        applications: data?.applications || data || [],
        total: data?.total || 0,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch applications');
    }
  }
);

// Get enterprise application details
export const fetchEnterpriseApplicationDetails = createAsyncThunk(
  'recruitment/fetchEnterpriseApplicationDetails',
  async (applicationId, { rejectWithValue }) => {
    try {
      const response = await getEnterpriseApplicationById(applicationId);
      return response?.data?.data || response?.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch application');
    }
  }
);

// Get worker profile for enterprise
export const fetchWorkerProfileForEnterprise = createAsyncThunk(
  'recruitment/fetchWorkerProfileForEnterprise',
  async (applicationId, { rejectWithValue }) => {
    try {
      const response = await getWorkerProfileForEnterprise(applicationId);
      return response?.data?.data || response?.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch worker profile');
    }
  }
);

// Get interview for an application
export const fetchApplicationInterview = createAsyncThunk(
  'recruitment/fetchApplicationInterview',
  async (applicationId, { rejectWithValue }) => {
    try {
      const response = await getApplicationInterview(applicationId);
      return response?.data?.data || null;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch interview');
    }
  }
);

// Get enterprise interviews
export const fetchEnterpriseInterviews = createAsyncThunk(
  'recruitment/fetchEnterpriseInterviews',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await getEnterpriseInterviews(params);
      const data = response?.data?.data || response?.data;
      return {
        interviews: data?.interviews || data || [],
        total: data?.total || 0,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch interviews');
    }
  }
);

// Get enterprise interview details
export const fetchEnterpriseInterviewDetails = createAsyncThunk(
  'recruitment/fetchEnterpriseInterviewDetails',
  async (interviewId, { rejectWithValue }) => {
    try {
      const response = await getEnterpriseInterviewById(interviewId);
      return response?.data?.data || response?.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch interview');
    }
  }
);

// Get enterprise offers
export const fetchEnterpriseOffers = createAsyncThunk(
  'recruitment/fetchEnterpriseOffers',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await getEnterpriseOffers(params);
      const data = response?.data?.data || response?.data;
      return {
        offers: data?.offers || data || [],
        total: data?.total || 0,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch offers');
    }
  }
);

// Get enterprise offer details
export const fetchEnterpriseOfferDetails = createAsyncThunk(
  'recruitment/fetchEnterpriseOfferDetails',
  async (offerId, { rejectWithValue }) => {
    try {
      const response = await getEnterpriseOfferById(offerId);
      return response?.data?.data || response?.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch offer');
    }
  }
);

// ============================================
// SLICE
// ============================================

const initialState = {
  // Worker state
  jobs: [],
  jobsTotal: 0,
  jobsPage: 1,
  jobsPages: 1,
  jobsLoading: false,
  jobsError: null,

  selectedJob: null,
  jobDetailsLoading: false,
  jobDetailsError: null,

  myApplications: [],
  myApplicationsTotal: 0,
  myApplicationsLoading: false,

  myApplicationDetails: null,
  myApplicationDetailsLoading: false,

  myInterviews: [],
  myInterviewsTotal: 0,
  myInterviewsLoading: false,

  myInterviewDetails: null,
  myInterviewDetailsLoading: false,

  myOffers: [],
  myOffersTotal: 0,
  myOffersLoading: false,

  myOfferDetails: null,
  myOfferDetailsLoading: false,

  // Enterprise state
  enterpriseJobs: [],
  enterpriseJobsTotal: 0,
  enterpriseJobsLoading: false,

  enterpriseJobDetails: null,
  enterpriseJobDetailsLoading: false,

  jobApplications: [],
  jobApplicationsTotal: 0,
  jobApplicationsLoading: false,

  jobStats: null,

  enterpriseApplications: [],
  enterpriseApplicationsTotal: 0,
  enterpriseApplicationsLoading: false,

  enterpriseApplicationDetails: null,
  enterpriseApplicationDetailsLoading: false,

  currentApplicationInterview: null,
  currentApplicationInterviewLoading: false,

  workerProfileForEnterprise: null,

  enterpriseInterviews: [],
  enterpriseInterviewsTotal: 0,
  enterpriseInterviewsLoading: false,

  enterpriseInterviewDetails: null,
  enterpriseInterviewDetailsLoading: false,

  enterpriseOffers: [],
  enterpriseOffersTotal: 0,
  enterpriseOffersLoading: false,

  enterpriseOfferDetails: null,
  enterpriseOfferDetailsLoading: false,

  // Filters
  filters: {
    search: '',
    province: '',
    jobType: '',
    locationType: '',
    salaryMin: null,
    salaryMax: null,
  },

  // Similar & Recommended
  similarJobs: [],
  similarJobsLoading: false,
  recommendedJobs: [],
  recommendedJobsLoading: false,
};

const recruitmentSlice = createSlice({
  name: 'recruitment',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
    },
    clearSelectedJob: (state) => {
      state.selectedJob = null;
    },
    clearMyApplicationDetails: (state) => {
      state.myApplicationDetails = null;
    },
    clearEnterpriseApplicationDetails: (state) => {
      state.enterpriseApplicationDetails = null;
    },
  },
  extraReducers: (builder) => {
    // Worker reducers
    builder
      // Published Jobs
      .addCase(fetchPublishedJobs.pending, (state) => {
        state.jobsLoading = true;
        state.jobsError = null;
      })
      .addCase(fetchPublishedJobs.fulfilled, (state, action) => {
        state.jobsLoading = false;
        state.jobs = action.payload.jobs;
        state.jobsTotal = action.payload.total;
        state.jobsPage = action.payload.page;
        state.jobsPages = action.payload.pages;
      })
      .addCase(fetchPublishedJobs.rejected, (state, action) => {
        state.jobsLoading = false;
        state.jobsError = action.payload;
      })
      // Job Details
      .addCase(fetchJobDetails.pending, (state) => {
        state.jobDetailsLoading = true;
        state.jobDetailsError = null;
      })
      .addCase(fetchJobDetails.fulfilled, (state, action) => {
        state.jobDetailsLoading = false;
        state.selectedJob = action.payload;
      })
      .addCase(fetchJobDetails.rejected, (state, action) => {
        state.jobDetailsLoading = false;
        state.jobDetailsError = action.payload;
      })
      // Similar Jobs
      .addCase(fetchSimilarJobs.pending, (state) => {
        state.similarJobsLoading = true;
      })
      .addCase(fetchSimilarJobs.fulfilled, (state, action) => {
        state.similarJobsLoading = false;
        state.similarJobs = action.payload;
      })
      .addCase(fetchSimilarJobs.rejected, (state) => {
        state.similarJobsLoading = false;
      })
      // Recommended Jobs
      .addCase(fetchRecommendedRecruitmentJobs.pending, (state) => {
        state.recommendedJobsLoading = true;
      })
      .addCase(fetchRecommendedRecruitmentJobs.fulfilled, (state, action) => {
        state.recommendedJobsLoading = false;
        state.recommendedJobs = action.payload.jobs;
      })
      .addCase(fetchRecommendedRecruitmentJobs.rejected, (state) => {
        state.recommendedJobsLoading = false;
      })
      // My Applications
      .addCase(fetchMyApplications.pending, (state) => {
        state.myApplicationsLoading = true;
      })
      .addCase(fetchMyApplications.fulfilled, (state, action) => {
        state.myApplicationsLoading = false;
        state.myApplications = action.payload.applications;
        state.myApplicationsTotal = action.payload.total;
      })
      .addCase(fetchMyApplications.rejected, (state) => {
        state.myApplicationsLoading = false;
      })
      // My Application Details
      .addCase(fetchMyApplicationDetails.pending, (state) => {
        state.myApplicationDetailsLoading = true;
      })
      .addCase(fetchMyApplicationDetails.fulfilled, (state, action) => {
        state.myApplicationDetailsLoading = false;
        state.myApplicationDetails = action.payload;
      })
      .addCase(fetchMyApplicationDetails.rejected, (state) => {
        state.myApplicationDetailsLoading = false;
      })
      // My Interviews
      .addCase(fetchMyInterviews.pending, (state) => {
        state.myInterviewsLoading = true;
      })
      .addCase(fetchMyInterviews.fulfilled, (state, action) => {
        state.myInterviewsLoading = false;
        state.myInterviews = action.payload.interviews;
        state.myInterviewsTotal = action.payload.total;
      })
      .addCase(fetchMyInterviews.rejected, (state) => {
        state.myInterviewsLoading = false;
      })
      // My Interview Details
      .addCase(fetchMyInterviewDetails.pending, (state) => {
        state.myInterviewDetailsLoading = true;
      })
      .addCase(fetchMyInterviewDetails.fulfilled, (state, action) => {
        state.myInterviewDetailsLoading = false;
        state.myInterviewDetails = action.payload;
      })
      .addCase(fetchMyInterviewDetails.rejected, (state) => {
        state.myInterviewDetailsLoading = false;
      })
      // My Offers
      .addCase(fetchMyOffers.pending, (state) => {
        state.myOffersLoading = true;
      })
      .addCase(fetchMyOffers.fulfilled, (state, action) => {
        state.myOffersLoading = false;
        state.myOffers = action.payload.offers;
        state.myOffersTotal = action.payload.total;
      })
      .addCase(fetchMyOffers.rejected, (state) => {
        state.myOffersLoading = false;
      })
      // My Offer Details
      .addCase(fetchMyOfferDetails.pending, (state) => {
        state.myOfferDetailsLoading = true;
      })
      .addCase(fetchMyOfferDetails.fulfilled, (state, action) => {
        state.myOfferDetailsLoading = false;
        state.myOfferDetails = action.payload;
      })
      .addCase(fetchMyOfferDetails.rejected, (state) => {
        state.myOfferDetailsLoading = false;
      });

    // Enterprise reducers
    builder
      // Enterprise Jobs
      .addCase(fetchEnterpriseJobs.pending, (state) => {
        state.enterpriseJobsLoading = true;
      })
      .addCase(fetchEnterpriseJobs.fulfilled, (state, action) => {
        state.enterpriseJobsLoading = false;
        state.enterpriseJobs = action.payload.jobs;
        state.enterpriseJobsTotal = action.payload.total;
      })
      .addCase(fetchEnterpriseJobs.rejected, (state) => {
        state.enterpriseJobsLoading = false;
      })
      // Enterprise Job Details
      .addCase(fetchEnterpriseJobDetails.pending, (state) => {
        state.enterpriseJobDetailsLoading = true;
      })
      .addCase(fetchEnterpriseJobDetails.fulfilled, (state, action) => {
        state.enterpriseJobDetailsLoading = false;
        state.enterpriseJobDetails = action.payload;
      })
      .addCase(fetchEnterpriseJobDetails.rejected, (state) => {
        state.enterpriseJobDetailsLoading = false;
      })
      // Job Applications
      .addCase(fetchJobApplications.pending, (state) => {
        state.jobApplicationsLoading = true;
      })
      .addCase(fetchJobApplications.fulfilled, (state, action) => {
        state.jobApplicationsLoading = false;
        state.jobApplications = action.payload.applications;
        state.jobApplicationsTotal = action.payload.total;
      })
      .addCase(fetchJobApplications.rejected, (state) => {
        state.jobApplicationsLoading = false;
      })
      // Job Stats
      .addCase(fetchJobStats.fulfilled, (state, action) => {
        state.jobStats = action.payload.stats;
      })
      // Enterprise Applications
      .addCase(fetchEnterpriseApplications.pending, (state) => {
        state.enterpriseApplicationsLoading = true;
      })
      .addCase(fetchEnterpriseApplications.fulfilled, (state, action) => {
        state.enterpriseApplicationsLoading = false;
        state.enterpriseApplications = action.payload.applications;
        state.enterpriseApplicationsTotal = action.payload.total;
      })
      .addCase(fetchEnterpriseApplications.rejected, (state) => {
        state.enterpriseApplicationsLoading = false;
      })
      // Enterprise Application Details
      .addCase(fetchEnterpriseApplicationDetails.pending, (state) => {
        state.enterpriseApplicationDetailsLoading = true;
      })
      .addCase(fetchEnterpriseApplicationDetails.fulfilled, (state, action) => {
        state.enterpriseApplicationDetailsLoading = false;
        state.enterpriseApplicationDetails = action.payload;
      })
      .addCase(fetchEnterpriseApplicationDetails.rejected, (state) => {
        state.enterpriseApplicationDetailsLoading = false;
      })
      // Worker Profile for Enterprise
      .addCase(fetchWorkerProfileForEnterprise.fulfilled, (state, action) => {
        state.workerProfileForEnterprise = action.payload;
      })
      // Current Application Interview
      .addCase(fetchApplicationInterview.pending, (state) => {
        state.currentApplicationInterviewLoading = true;
      })
      .addCase(fetchApplicationInterview.fulfilled, (state, action) => {
        state.currentApplicationInterviewLoading = false;
        state.currentApplicationInterview = action.payload;
      })
      .addCase(fetchApplicationInterview.rejected, (state) => {
        state.currentApplicationInterviewLoading = false;
      })
      // Enterprise Interviews
      .addCase(fetchEnterpriseInterviews.pending, (state) => {
        state.enterpriseInterviewsLoading = true;
      })
      .addCase(fetchEnterpriseInterviews.fulfilled, (state, action) => {
        state.enterpriseInterviewsLoading = false;
        state.enterpriseInterviews = action.payload.interviews;
        state.enterpriseInterviewsTotal = action.payload.total;
      })
      .addCase(fetchEnterpriseInterviews.rejected, (state) => {
        state.enterpriseInterviewsLoading = false;
      })
      // Enterprise Interview Details
      .addCase(fetchEnterpriseInterviewDetails.pending, (state) => {
        state.enterpriseInterviewDetailsLoading = true;
      })
      .addCase(fetchEnterpriseInterviewDetails.fulfilled, (state, action) => {
        state.enterpriseInterviewDetailsLoading = false;
        state.enterpriseInterviewDetails = action.payload;
      })
      .addCase(fetchEnterpriseInterviewDetails.rejected, (state) => {
        state.enterpriseInterviewDetailsLoading = false;
      })
      // Enterprise Offers
      .addCase(fetchEnterpriseOffers.pending, (state) => {
        state.enterpriseOffersLoading = true;
      })
      .addCase(fetchEnterpriseOffers.fulfilled, (state, action) => {
        state.enterpriseOffersLoading = false;
        state.enterpriseOffers = action.payload.offers;
        state.enterpriseOffersTotal = action.payload.total;
      })
      .addCase(fetchEnterpriseOffers.rejected, (state) => {
        state.enterpriseOffersLoading = false;
      })
      // Enterprise Offer Details
      .addCase(fetchEnterpriseOfferDetails.pending, (state) => {
        state.enterpriseOfferDetailsLoading = true;
      })
      .addCase(fetchEnterpriseOfferDetails.fulfilled, (state, action) => {
        state.enterpriseOfferDetailsLoading = false;
        state.enterpriseOfferDetails = action.payload;
      })
      .addCase(fetchEnterpriseOfferDetails.rejected, (state) => {
        state.enterpriseOfferDetailsLoading = false;
      });
  },
});

export const {
  setFilters,
  resetFilters,
  clearSelectedJob,
  clearMyApplicationDetails,
  clearEnterpriseApplicationDetails,
} = recruitmentSlice.actions;

export const selectJobs = (state) => state.recruitment.jobs;
export const selectJobsTotal = (state) => state.recruitment.jobsTotal;
export const selectJobsLoading = (state) => state.recruitment.jobsLoading;
export const selectFilters = (state) => state.recruitment.filters;
export const selectSelectedJob = (state) => state.recruitment.selectedJob;
export const selectSimilarJobs = (state) => state.recruitment.similarJobs;
export const selectSimilarJobsLoading = (state) => state.recruitment.similarJobsLoading;
export const selectRecommendedJobs = (state) => state.recruitment.recommendedJobs;
export const selectRecommendedJobsLoading = (state) => state.recruitment.recommendedJobsLoading;

export const selectMyApplications = (state) => state.recruitment.myApplications;
export const selectMyApplicationsTotal = (state) => state.recruitment.myApplicationsTotal;
export const selectMyApplicationsLoading = (state) => state.recruitment.myApplicationsLoading;
export const selectMyApplicationDetails = (state) => state.recruitment.myApplicationDetails;

export const selectMyInterviews = (state) => state.recruitment.myInterviews;
export const selectMyInterviewsTotal = (state) => state.recruitment.myInterviewsTotal;
export const selectMyInterviewsLoading = (state) => state.recruitment.myInterviewsLoading;
export const selectMyInterviewDetails = (state) => state.recruitment.myInterviewDetails;

export const selectMyOffers = (state) => state.recruitment.myOffers;
export const selectMyOffersTotal = (state) => state.recruitment.myOffersTotal;
export const selectMyOffersLoading = (state) => state.recruitment.myOffersLoading;
export const selectMyOfferDetails = (state) => state.recruitment.myOfferDetails;

export const selectEnterpriseJobs = (state) => state.recruitment.enterpriseJobs;
export const selectEnterpriseJobsTotal = (state) => state.recruitment.enterpriseJobsTotal;
export const selectEnterpriseJobsLoading = (state) => state.recruitment.enterpriseJobsLoading;
export const selectEnterpriseJobDetails = (state) => state.recruitment.enterpriseJobDetails;

export const selectJobApplications = (state) => state.recruitment.jobApplications;
export const selectJobApplicationsTotal = (state) => state.recruitment.jobApplicationsTotal;
export const selectJobApplicationsLoading = (state) => state.recruitment.jobApplicationsLoading;
export const selectJobStats = (state) => state.recruitment.jobStats;

export const selectEnterpriseApplications = (state) => state.recruitment.enterpriseApplications;
export const selectEnterpriseApplicationsTotal = (state) => state.recruitment.enterpriseApplicationsTotal;
export const selectEnterpriseApplicationsLoading = (state) => state.recruitment.enterpriseApplicationsLoading;
export const selectEnterpriseApplicationDetails = (state) => state.recruitment.enterpriseApplicationDetails;
export const selectCurrentApplicationInterview = (state) => state.recruitment.currentApplicationInterview;
export const selectWorkerProfileForEnterprise = (state) => state.recruitment.workerProfileForEnterprise;

export const selectEnterpriseInterviews = (state) => state.recruitment.enterpriseInterviews;
export const selectEnterpriseInterviewsTotal = (state) => state.recruitment.enterpriseInterviewsTotal;
export const selectEnterpriseInterviewsLoading = (state) => state.recruitment.enterpriseInterviewsLoading;
export const selectEnterpriseInterviewDetails = (state) => state.recruitment.enterpriseInterviewDetails;

export const selectEnterpriseOffers = (state) => state.recruitment.enterpriseOffers;
export const selectEnterpriseOffersTotal = (state) => state.recruitment.enterpriseOffersTotal;
export const selectEnterpriseOffersLoading = (state) => state.recruitment.enterpriseOffersLoading;
export const selectEnterpriseOfferDetails = (state) => state.recruitment.enterpriseOfferDetails;

export default recruitmentSlice.reducer;
