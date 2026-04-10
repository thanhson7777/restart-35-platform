/**
 * AI Slice - Redux state cho AI recommendations
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import {
  getRecommendedJobsAPI,
  getAllJobsAPI,
  getJobByIdAPI,
  healthCheckAIAPI
} from '~/apis/aiAPI'

// Async thunks
export const fetchJobRecommendations = createAsyncThunk(
  'ai/fetchJobRecommendations',
  async (
    { skills, experience, location, targetJob, limit },
    { rejectWithValue }
  ) => {
    try {
      const body = await getRecommendedJobsAPI({
        skills,
        experience,
        location,
        targetJob,
        limit: limit || 10
      })
      // FastAPI: { success, data: { jobs, total, ... } }
      return body?.data ?? body
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Không thể lấy gợi ý việc làm'
      )
    }
  }
)

export const fetchAllJobs = createAsyncThunk(
  'ai/fetchAllJobs',
  async (limit = 50, { rejectWithValue }) => {
    try {
      const body = await getAllJobsAPI(limit)
      return body?.data ?? body
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Không thể lấy danh sách việc làm'
      )
    }
  }
)

export const fetchJobById = createAsyncThunk(
  'ai/fetchJobById',
  async (jobId, { rejectWithValue }) => {
    try {
      const response = await getJobByIdAPI(jobId)
      return response.data
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Không thể lấy thông tin việc làm'
      )
    }
  }
)

export const checkAIServiceHealth = createAsyncThunk(
  'ai/checkHealth',
  async (_, { rejectWithValue }) => {
    try {
      const response = await healthCheckAIAPI()
      return response.data
    } catch (error) {
      return rejectWithValue('AI Service không khả dụng')
    }
  }
)

// Risk level mapping
export const RISK_LEVELS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
}

// Risk display configuration
export const RISK_CONFIG = {
  [RISK_LEVELS.LOW]: {
    label: 'Ổn định',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-200',
    icon: '✓'
  },
  [RISK_LEVELS.MEDIUM]: {
    label: 'Cần chú ý',
    color: 'amber',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-800',
    borderColor: 'border-amber-200',
    icon: '!'
  },
  [RISK_LEVELS.HIGH]: {
    label: 'Cần chuyển đổi',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    borderColor: 'border-red-200',
    icon: '⚠'
  }
}

// Initial state
const initialState = {
  // Job recommendations
  recommendations: [],
  recommendationsLoading: false,
  recommendationsError: null,
  recommendationsTotal: 0,

  // All jobs
  jobs: [],
  jobsLoading: false,
  jobsError: null,

  // Selected job detail
  selectedJob: null,
  selectedJobLoading: false,

  // AI Service health
  aiServiceStatus: 'unknown', // 'healthy' | 'unhealthy' | 'unknown'
  aiServiceDataLoaded: null,

  // User risk assessment (calculated from profile)
  userRiskLevel: null,
  userRiskScore: null,
  userRiskMessage: null
}

// Slice
const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    // Set user risk level from profile data
    setUserRiskLevel: (state, action) => {
      const { riskLevel, riskScore, message } = action.payload
      state.userRiskLevel = riskLevel
      state.userRiskScore = riskScore
      state.userRiskMessage = message
    },

    // Clear recommendations
    clearRecommendations: (state) => {
      state.recommendations = []
      state.recommendationsTotal = 0
      state.recommendationsError = null
    },

    // Clear selected job
    clearSelectedJob: (state) => {
      state.selectedJob = null
    },

    // Clear all AI state
    resetAIState: () => initialState
  },

  extraReducers: (builder) => {
    // fetchJobRecommendations
    builder
      .addCase(fetchJobRecommendations.pending, (state) => {
        state.recommendationsLoading = true
        state.recommendationsError = null
      })
      .addCase(fetchJobRecommendations.fulfilled, (state, action) => {
        state.recommendationsLoading = false
        const p = action.payload
        const jobs = p?.jobs ?? p?.data?.jobs ?? []
        state.recommendations = Array.isArray(jobs) ? jobs : []
        state.recommendationsTotal =
          p?.total ?? p?.data?.total ?? state.recommendations.length
      })
      .addCase(fetchJobRecommendations.rejected, (state, action) => {
        state.recommendationsLoading = false
        state.recommendationsError = action.payload
      })

    // fetchAllJobs
    builder
      .addCase(fetchAllJobs.pending, (state) => {
        state.jobsLoading = true
        state.jobsError = null
      })
      .addCase(fetchAllJobs.fulfilled, (state, action) => {
        state.jobsLoading = false
        const p = action.payload
        const jobs = p?.jobs ?? p?.data?.jobs ?? []
        state.jobs = Array.isArray(jobs) ? jobs : []
      })
      .addCase(fetchAllJobs.rejected, (state, action) => {
        state.jobsLoading = false
        state.jobsError = action.payload
      })

    // fetchJobById
    builder
      .addCase(fetchJobById.pending, (state) => {
        state.selectedJobLoading = true
      })
      .addCase(fetchJobById.fulfilled, (state, action) => {
        state.selectedJobLoading = false
        state.selectedJob = action.payload
      })
      .addCase(fetchJobById.rejected, (state) => {
        state.selectedJobLoading = false
      })

    // checkAIServiceHealth
    builder
      .addCase(checkAIServiceHealth.fulfilled, (state, action) => {
        state.aiServiceStatus = action.payload.status === 'healthy' ? 'healthy' : 'unhealthy'
        state.aiServiceDataLoaded = action.payload.data_loaded || null
      })
      .addCase(checkAIServiceHealth.rejected, (state) => {
        state.aiServiceStatus = 'unhealthy'
      })
  }
})

// Actions
export const {
  setUserRiskLevel,
  clearRecommendations,
  clearSelectedJob,
  resetAIState
} = aiSlice.actions

// Selectors
export const selectRecommendations = (state) => state.ai.recommendations
export const selectRecommendationsLoading = (state) => state.ai.recommendationsLoading
export const selectRecommendationsError = (state) => state.ai.recommendationsError
export const selectRecommendationsTotal = (state) => state.ai.recommendationsTotal

export const selectJobs = (state) => state.ai.jobs
export const selectJobsLoading = (state) => state.ai.jobsLoading
export const selectJobsError = (state) => state.ai.jobsError

export const selectSelectedJob = (state) => state.ai.selectedJob
export const selectSelectedJobLoading = (state) => state.ai.selectedJobLoading

export const selectAIServiceStatus = (state) => state.ai.aiServiceStatus
export const selectAIServiceDataLoaded = (state) => state.ai.aiServiceDataLoaded

export const selectUserRiskLevel = (state) => state.ai.userRiskLevel
export const selectUserRiskScore = (state) => state.ai.userRiskScore
export const selectUserRiskMessage = (state) => state.ai.userRiskMessage

export default aiSlice.reducer
