import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authorizeAxiosInstance } from '~/utils/authorizeAxios'
import { API_ROOT } from '~/utils/constants'

const API_URL = `${API_ROOT}/v1/ai`

// Fetch all jobs with optional filters
export const fetchAllJobs = createAsyncThunk(
  'jobs/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await authorizeAxiosInstance.get(`${API_URL}/jobs`, {
        params: {
          limit: params.limit || 50,
          ...params
        }
      })
      const data = response?.data?.data || response?.data
      return {
        jobs: data?.jobs || data || [],
        total: data?.total || (data?.jobs?.length || data?.length || 0),
        filters_applied: data?.filters_applied || {}
      }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch jobs')
    }
  }
)

// Fetch AI-recommended jobs based on worker profile
export const fetchRecommendedJobs = createAsyncThunk(
  'jobs/fetchRecommended',
  async ({ skills, experience, location, targetJob, targetSalary, preferredJobType, limit = 10 } = {}, { rejectWithValue }) => {
    try {
      const payload = {
        skills,
        experience: Math.floor(experience || 0),
        limit
      }
      if (location) payload.location = location
      if (targetJob) payload.target_job = targetJob
      if (targetSalary) payload.target_salary = targetSalary
      if (preferredJobType) payload.preferred_job_type = preferredJobType

      const response = await authorizeAxiosInstance.post(
        `${API_URL}/recommend-jobs`,
        payload
      )
      const data = response?.data?.data || response?.data
      return {
        jobs: data?.jobs || data || [],
        total: data?.total || (data?.jobs?.length || data?.length || 0),
        filters_applied: data?.filters_applied || {}
      }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch recommended jobs')
    }
  }
)

// Fetch similar jobs for a specific job
export const fetchSimilarJobs = createAsyncThunk(
  'jobs/fetchSimilar',
  async ({ jobId, limit = 5 } = {}, { rejectWithValue }) => {
    try {
      const response = await authorizeAxiosInstance.get(`${API_URL}/jobs/${jobId}/similar`, {
        params: { limit }
      })
      const data = response?.data?.data || response?.data
      return {
        jobId,
        jobs: data?.jobs || data?.similar_jobs || data || []
      }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch similar jobs')
    }
  }
)

// Get job details by ID
export const fetchJobById = createAsyncThunk(
  'jobs/fetchById',
  async (jobId, { rejectWithValue }) => {
    try {
      const response = await authorizeAxiosInstance.get(`${API_URL}/jobs/${jobId}`)
      const data = response?.data?.data || response?.data
      return data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch job details')
    }
  }
)

// Report dead link
export const reportDeadLinkAsync = createAsyncThunk(
  'jobs/reportDeadLink',
  async (jobId, { rejectWithValue }) => {
    try {
      const response = await authorizeAxiosInstance.post('/v1/jobs/report-dead', {
        jobId
      })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to report dead link')
    }
  }
)

const initialState = {
  // All jobs (for browsing)
  jobs: [],
  totalJobs: 0,
  // AI-recommended jobs
  recommendedJobs: [],
  totalRecommended: 0,
  // Similar jobs (for a selected job)
  similarJobs: [],
  // Currently selected job
  currentJob: null,
  // Filters state
  filters: {
    location: null,
    jobType: null,
    salaryMin: null,
    salaryMax: null,
    postedWithin: null,
    matchMin: null
  },
  filters_applied: {},
  // Saved/bookmarked jobs
  savedJobs: JSON.parse(localStorage.getItem('savedJobs') || '[]'),
  // Loading states
  loading: false,
  recommendedLoading: false,
  similarLoading: false,
  // Error
  error: null
}

const jobSlice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {
    clearJobError: (state) => {
      state.error = null
    },
    setCurrentJob: (state, action) => {
      state.currentJob = action.payload
    },
    clearCurrentJob: (state) => {
      state.currentJob = null
      state.similarJobs = []
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload }
    },
    clearFilters: (state) => {
      state.filters = {
        location: null,
        jobType: null,
        salaryMin: null,
        salaryMax: null,
        postedWithin: null,
        matchMin: null
      }
    },
    toggleSaveJob: (state, action) => {
      const job = action.payload
      const index = state.savedJobs.findIndex(j => j.id === job.id || j._id === job._id)
      if (index >= 0) {
        state.savedJobs.splice(index, 1)
      } else {
        state.savedJobs.push(job)
      }
      localStorage.setItem('savedJobs', JSON.stringify(state.savedJobs))
    },
    clearSavedJobs: (state) => {
      state.savedJobs = []
      localStorage.removeItem('savedJobs')
    }
  },
  extraReducers: (builder) => {
    // fetchAllJobs
    builder
      .addCase(fetchAllJobs.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchAllJobs.fulfilled, (state, action) => {
        state.loading = false
        state.jobs = action.payload.jobs
        state.totalJobs = action.payload.total
        state.filters_applied = action.payload.filters_applied || {}
      })
      .addCase(fetchAllJobs.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

    // fetchRecommendedJobs
    builder
      .addCase(fetchRecommendedJobs.pending, (state) => {
        state.recommendedLoading = true
        state.error = null
      })
      .addCase(fetchRecommendedJobs.fulfilled, (state, action) => {
        state.recommendedLoading = false
        // console.log('=== DEBUG recommendedJobs ===', action.payload)
        state.recommendedJobs = action.payload.jobs
        state.totalRecommended = action.payload.total
        state.filters_applied = action.payload.filters_applied || {}
      })
      .addCase(fetchRecommendedJobs.rejected, (state, action) => {
        state.recommendedLoading = false
        state.error = action.payload
      })

    // fetchSimilarJobs
    builder
      .addCase(fetchSimilarJobs.pending, (state) => {
        state.similarLoading = true
      })
      .addCase(fetchSimilarJobs.fulfilled, (state, action) => {
        state.similarLoading = false
        state.similarJobs = action.payload.jobs
      })
      .addCase(fetchSimilarJobs.rejected, (state, action) => {
        state.similarLoading = false
        state.error = action.payload
      })

    // fetchJobById
    builder
      .addCase(fetchJobById.fulfilled, (state, action) => {
        state.currentJob = action.payload
      })

    // reportDeadLink
    builder
      .addCase(reportDeadLinkAsync.pending, (state) => {
        // Optional: set loading state
      })
      .addCase(reportDeadLinkAsync.fulfilled, (state, action) => {
        // Optional: track reported links
        console.log('Dead link reported:', action.payload)
      })
      .addCase(reportDeadLinkAsync.rejected, (state, action) => {
        console.error('Failed to report dead link:', action.payload)
      })
  }
})

export const {
  clearJobError,
  setCurrentJob,
  clearCurrentJob,
  setFilters,
  clearFilters,
  toggleSaveJob,
  clearSavedJobs,
  reportDeadLink
} = jobSlice.actions

// Selectors
export const selectAllJobs = (state) => state.job?.jobs || []
export const selectTotalJobs = (state) => state.job?.totalJobs || 0
export const selectRecommendedJobs = (state) => state.job?.recommendedJobs || []
export const selectTotalRecommended = (state) => state.job?.totalRecommended || 0
export const selectSimilarJobs = (state) => state.job?.similarJobs || []
export const selectCurrentJob = (state) => state.job?.currentJob || null
export const selectJobFilters = (state) => state.job?.filters || {}
export const selectFiltersApplied = (state) => state.job?.filters_applied || {}
export const selectSavedJobs = (state) => state.job?.savedJobs || []
export const selectJobsLoading = (state) => state.job?.loading || false
export const selectRecommendedLoading = (state) => state.job?.recommendedLoading || false
export const selectSimilarLoading = (state) => state.job?.similarLoading || false
export const selectJobsError = (state) => state.job?.error || null

// Helper selector: check if a job is saved
export const selectIsJobSaved = (jobId) => (state) =>
  state.job?.savedJobs?.some(j => j.id === jobId || j._id === jobId) || false

export default jobSlice.reducer
