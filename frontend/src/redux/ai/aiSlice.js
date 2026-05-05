/**
 * AI Slice - Redux state cho AI recommendations và Risk Prediction
 * Quản lý state cho job recommendations và unemployment risk assessment
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import {
  getRecommendedJobsAPI,
  getAllJobsAPI,
  getJobByIdAPI,
  predictRiskAPI,
  analyzeWorkerAPI,
  healthCheckAIAPI,
  getModelInfoAPI,
  discoverCareerPathAPI,
  getCareerPathUrgencyAPI,
  getCareerPathIndustriesAPI,
  getCareerTransitionsAPI,
  getTransitionsUrgencyAPI,
  getTransitionsIndustriesAPI,
  getTransitionsSkillsAPI
} from '~/apis/aiAPI'

/**
 * Async Thunks - Các async actions để gọi API
 */

/**
 * Lấy gợi ý việc làm dựa trên kỹ năng
 * POST /v1/ai/recommend-jobs
 */
export const fetchJobRecommendations = createAsyncThunk(
  'ai/fetchJobRecommendations',
  async (
    { skills, experience, location, targetJob, targetSalary, preferredJobType, limit },
    { rejectWithValue }
  ) => {
    try {
      const response = await getRecommendedJobsAPI({
        skills,
        experience,
        location,
        targetJob,
        targetSalary,
        preferredJobType,
        limit: limit || 10
      })
      // Backend response: { success, message, data: { jobs[], total, filters_applied } }
      return response?.data ?? response
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Không thể lấy gợi ý việc làm'
      )
    }
  }
)

/**
 * Lấy danh sách tất cả jobs
 * GET /v1/ai/jobs
 */
export const fetchAllJobs = createAsyncThunk(
  'ai/fetchAllJobs',
  async (limit = 50, { rejectWithValue }) => {
    try {
      const response = await getAllJobsAPI(limit)
      return response?.data ?? response
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Không thể lấy danh sách việc làm'
      )
    }
  }
)

/**
 * Lấy thông tin chi tiết một job
 * GET /v1/ai/jobs/:id
 */
export const fetchJobById = createAsyncThunk(
  'ai/fetchJobById',
  async (jobId, { rejectWithValue }) => {
    try {
      const response = await getJobByIdAPI(jobId)
      return response?.data ?? response
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Không thể lấy thông tin việc làm'
      )
    }
  }
)

/**
 * Dự đoán rủi ro thất nghiệp
 * POST /v1/ai/predict-risk
 */
export const predictRisk = createAsyncThunk(
  'ai/predictRisk',
  async (workerData, { rejectWithValue }) => {
    try {
      const response = await predictRiskAPI(workerData)
      // Backend response: { success, message, data: { risk_level, risk_score, probability, confidence, recommendation, model_info } }
      return response?.data ?? response
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Không thể dự đoán rủi ro'
      )
    }
  }
)

/**
 * Phân tích tổng hợp người lao động (risk + recommendations)
 * POST /v1/ai/analyze-worker
 */
export const analyzeWorker = createAsyncThunk(
  'ai/analyzeWorker',
  async (workerData, { rejectWithValue }) => {
    try {
      const response = await analyzeWorkerAPI(workerData)
      // Backend response: { success, message, data: { worker_analysis: { risk_data, jobs, metadata } } }
      return response?.data ?? response
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Không thể phân tích người lao động'
      )
    }
  }
)

/**
 * Health check AI Service
 * GET /v1/ai/health
 */
export const checkAIServiceHealth = createAsyncThunk(
  'ai/checkHealth',
  async (_, { rejectWithValue }) => {
    try {
      const response = await healthCheckAIAPI()
      return response?.data ?? response
    } catch (error) {
      return rejectWithValue('AI Service không khả dụng')
    }
  }
)

/**
 * Lấy thông tin model
 * GET /v1/ai/model-info
 */
export const fetchModelInfo = createAsyncThunk(
  'ai/fetchModelInfo',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getModelInfoAPI()
      return response?.data ?? response
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Không thể lấy thông tin model'
      )
    }
  }
)

/**
 * Khám phá lộ trình sự nghiệp
 * POST /v1/ai/career-path
 */
export const fetchCareerPath = createAsyncThunk(
  'ai/fetchCareerPath',
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await discoverCareerPathAPI(profileData)
      // Backend response: { success, data: { user_profile, management_track, age_transition, skill_upgrades, ... } }
      return response?.data ?? response
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Không thể khám phá lộ trình sự nghiệp'
      )
    }
  }
)

/**
 * Lấy mức độ khẩn cấp chuyển đổi nghề theo tuổi
 * GET /v1/ai/career-path/urgency
 */
export const fetchCareerPathUrgency = createAsyncThunk(
  'ai/fetchCareerPathUrgency',
  async (age, { rejectWithValue }) => {
    try {
      const response = await getCareerPathUrgencyAPI(age)
      return response?.data ?? response
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Không thể lấy mức độ khẩn cấp'
      )
    }
  }
)

/**
 * Lấy danh sách ngành nghề được hỗ trợ
 * GET /v1/ai/career-path/industries
 */
export const fetchCareerPathIndustries = createAsyncThunk(
  'ai/fetchCareerPathIndustries',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getCareerPathIndustriesAPI()
      return response?.data ?? response
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Không thể lấy danh sách ngành nghề'
      )
    }
  }
)

/**
 * =============================================================================
 * CAREER TRANSITION APIs (35+) Thunks
 * =============================================================================
 */

/**
 * Lấy gợi ý chuyển đổi nghề cho lao động 35+
 * POST /v1/ai/career-transitions
 */
export const fetchCareerTransitions = createAsyncThunk(
  'ai/fetchCareerTransitions',
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await getCareerTransitionsAPI(profileData)
      return response?.data ?? response
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Không thể lấy gợi ý chuyển đổi nghề'
      )
    }
  }
)

/**
 * Lấy mức độ khẩn cấp chuyển đổi nghề
 * GET /v1/ai/career-transitions/urgency
 */
export const fetchTransitionsUrgency = createAsyncThunk(
  'ai/fetchTransitionsUrgency',
  async (age, { rejectWithValue }) => {
    try {
      const response = await getTransitionsUrgencyAPI(age)
      return response?.data ?? response
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Không thể lấy mức độ khẩn cấp'
      )
    }
  }
)

/**
 * Lấy danh sách ngành cho chuyển đổi
 * GET /v1/ai/career-transitions/industries
 */
export const fetchTransitionsIndustries = createAsyncThunk(
  'ai/fetchTransitionsIndustries',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getTransitionsIndustriesAPI()
      return response?.data ?? response
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Không thể lấy ngành nghề'
      )
    }
  }
)

/**
 * Risk Level Constants
 */
export const RISK_LEVELS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
}

/**
 * Risk Display Configuration - Cấu hình hiển thị cho từng mức rủi ro
 */
export const RISK_CONFIG = {
  [RISK_LEVELS.LOW]: {
    label: 'Ổn định',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-200',
    icon: '✓',
    description: 'Người lao động có nguy cơ thất nghiệp thấp, có thể phát triển'
  },
  [RISK_LEVELS.MEDIUM]: {
    label: 'Cần chú ý',
    color: 'amber',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-800',
    borderColor: 'border-amber-200',
    icon: '!',
    description: 'Người lao động có nguy cơ thất nghiệp trung bình, cần hỗ trợ'
  },
  [RISK_LEVELS.HIGH]: {
    label: 'Cần chuyển đổi',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    borderColor: 'border-red-200',
    icon: '⚠',
    description: 'Người lao động có nguy cơ thất nghiệp cao, cần hỗ trợ ngay'
  }
}

/**
 * Initial State - Trạng thái ban đầu của AI slice
 */
const initialState = {
  // Job recommendations
  recommendations: [],
  recommendationsLoading: false,
  recommendationsError: null,
  recommendationsTotal: 0,
  recommendationsFilters: null,

  // All jobs (job listing page)
  jobs: [],
  jobsLoading: false,
  jobsError: null,

  // Selected job detail
  selectedJob: null,
  selectedJobLoading: false,
  selectedJobError: null,

  // Risk prediction
  riskPrediction: null,         // { risk_level, risk_score, probability, confidence, recommendation, model_info }
  riskPredictionLoading: false,
  riskPredictionError: null,

  // Worker analysis (combined risk + recommendations)
  workerAnalysis: null,         // { risk_data, jobs, metadata }
  workerAnalysisLoading: false,
  workerAnalysisError: null,

  // AI Service health
  aiServiceStatus: 'unknown',   // 'healthy' | 'unhealthy' | 'unknown'
  aiServiceDataLoaded: null,
  modelInfo: null,

  // User risk assessment (calculated from profile)
  userRiskLevel: null,
  userRiskScore: null,
  userRiskMessage: null,

  // Career Path Discovery
  careerPath: null,              // { user_profile, management_track, age_transition, skill_upgrades, ... }
  careerPathLoading: false,
  careerPathError: null,
  careerPathUrgency: null,       // { age, urgency, description, recommendations }
  careerPathIndustries: [],       // [{id, name, levels_count, ...}]

  // Career Transitions (35+)
  careerTransitions: [],          // Array of transition recommendations
  careerTransitionsLoading: false,
  careerTransitionsError: null,
  careerTransitionsUrgency: null,  // Urgency info for current age
  careerTransitionsIndustries: []   // Supported industries
}

/**
 * AI Slice
 */
const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    /**
     * Set user risk level từ profile data
     */
    setUserRiskLevel: (state, action) => {
      const { riskLevel, riskScore, message } = action.payload
      state.userRiskLevel = riskLevel
      state.userRiskScore = riskScore
      state.userRiskMessage = message
    },

    /**
     * Clear recommendations
     */
    clearRecommendations: (state) => {
      state.recommendations = []
      state.recommendationsTotal = 0
      state.recommendationsError = null
      state.recommendationsFilters = null
    },

    /**
     * Clear selected job
     */
    clearSelectedJob: (state) => {
      state.selectedJob = null
      state.selectedJobError = null
    },

    /**
     * Clear risk prediction
     */
    clearRiskPrediction: (state) => {
      state.riskPrediction = null
      state.riskPredictionError = null
      state.userRiskLevel = null
      state.userRiskScore = null
      state.userRiskMessage = null
    },

    /**
     * Clear worker analysis
     */
    clearWorkerAnalysis: (state) => {
      state.workerAnalysis = null
      state.workerAnalysisError = null
    },

    /**
     * Clear career path
     */
    clearCareerPath: (state) => {
      state.careerPath = null
      state.careerPathError = null
    },

    /**
     * Reset all AI state
     */
    resetAIState: () => initialState
  },

  extraReducers: (builder) => {
    /**
     * fetchJobRecommendations
     */
    builder
      .addCase(fetchJobRecommendations.pending, (state) => {
        state.recommendationsLoading = true
        state.recommendationsError = null
      })
      .addCase(fetchJobRecommendations.fulfilled, (state, action) => {
        state.recommendationsLoading = false
        const p = action.payload
        // Extract jobs array from various response formats
        const jobs = p?.jobs ?? p?.data?.jobs ?? []
        state.recommendations = Array.isArray(jobs) ? jobs : []
        state.recommendationsTotal = p?.total ?? p?.data?.total ?? state.recommendations.length
        state.recommendationsFilters = p?.filters_applied ?? null
      })
      .addCase(fetchJobRecommendations.rejected, (state, action) => {
        state.recommendationsLoading = false
        state.recommendationsError = action.payload
      })

    /**
     * fetchAllJobs
     */
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

    /**
     * fetchJobById
     */
    builder
      .addCase(fetchJobById.pending, (state) => {
        state.selectedJobLoading = true
        state.selectedJobError = null
      })
      .addCase(fetchJobById.fulfilled, (state, action) => {
        state.selectedJobLoading = false
        state.selectedJob = action.payload
      })
      .addCase(fetchJobById.rejected, (state, action) => {
        state.selectedJobLoading = false
        state.selectedJobError = action.payload
      })

    /**
     * predictRisk
     */
    builder
      .addCase(predictRisk.pending, (state) => {
        state.riskPredictionLoading = true
        state.riskPredictionError = null
      })
      .addCase(predictRisk.fulfilled, (state, action) => {
        state.riskPredictionLoading = false
        state.riskPrediction = action.payload
        // Backend trả về { success, data: { risk_level, risk_score, ... } }
        // Cần truy cập đúng cấu trúc
        const resultData = action.payload?.data || action.payload
        if (resultData?.risk_level) {
          state.userRiskLevel = resultData.risk_level
          state.userRiskScore = resultData.risk_score
          state.userRiskMessage = resultData.recommendation?.message || null
        }
      })
      .addCase(predictRisk.rejected, (state, action) => {
        state.riskPredictionLoading = false
        state.riskPredictionError = action.payload
      })

    /**
     * analyzeWorker
     */
    builder
      .addCase(analyzeWorker.pending, (state) => {
        state.workerAnalysisLoading = true
        state.workerAnalysisError = null
      })
      .addCase(analyzeWorker.fulfilled, (state, action) => {
        state.workerAnalysisLoading = false
        state.workerAnalysis = action.payload
        // Extract risk data for convenience
        if (action.payload?.worker_analysis?.risk_data) {
          const riskData = action.payload.worker_analysis.risk_data
          state.riskPrediction = riskData
          state.userRiskLevel = riskData.risk_level
          state.userRiskScore = riskData.risk_score
          state.userRiskMessage = riskData.recommendation?.message || null
        }
      })
      .addCase(analyzeWorker.rejected, (state, action) => {
        state.workerAnalysisLoading = false
        state.workerAnalysisError = action.payload
      })

    /**
     * checkAIServiceHealth
     */
    builder
      .addCase(checkAIServiceHealth.fulfilled, (state, action) => {
        const payload = action.payload
        state.aiServiceStatus = payload?.status === 'ok' ? 'healthy' : 'unhealthy'
        state.aiServiceDataLoaded = payload?.data_loaded || null
      })
      .addCase(checkAIServiceHealth.rejected, (state) => {
        state.aiServiceStatus = 'unhealthy'
      })

    /**
     * fetchModelInfo
     */
    builder
      .addCase(fetchModelInfo.fulfilled, (state, action) => {
        state.modelInfo = action.payload
      })

    /**
     * fetchCareerPath
     */
    builder
      .addCase(fetchCareerPath.pending, (state) => {
        state.careerPathLoading = true
        state.careerPathError = null
      })
      .addCase(fetchCareerPath.fulfilled, (state, action) => {
        state.careerPathLoading = false
        state.careerPath = action.payload
      })
      .addCase(fetchCareerPath.rejected, (state, action) => {
        state.careerPathLoading = false
        state.careerPathError = action.payload
      })

    /**
     * fetchCareerPathUrgency
     */
    builder
      .addCase(fetchCareerPathUrgency.fulfilled, (state, action) => {
        state.careerPathUrgency = action.payload
      })

    /**
     * fetchCareerPathIndustries
     */
    builder
      .addCase(fetchCareerPathIndustries.fulfilled, (state, action) => {
        const data = action.payload
        state.careerPathIndustries = data?.industries ?? data ?? []
      })

    /**
     * =============================================================================
     * CAREER TRANSITIONS (35+) Reducers
     * =============================================================================
     */

    /**
     * fetchCareerTransitions
     */
    builder
      .addCase(fetchCareerTransitions.pending, (state) => {
        state.careerTransitionsLoading = true
        state.careerTransitionsError = null
      })
      .addCase(fetchCareerTransitions.fulfilled, (state, action) => {
        state.careerTransitionsLoading = false
        const data = action.payload
        if (data?.transitions) {
          state.careerTransitions = data.transitions
        }
        if (data?.urgency) {
          state.careerTransitionsUrgency = data.urgency
        }
        if (data?.industry_coverage) {
          state.careerTransitionsIndustries = data.industry_coverage
        }
      })
      .addCase(fetchCareerTransitions.rejected, (state, action) => {
        state.careerTransitionsLoading = false
        state.careerTransitionsError = action.payload
      })

    /**
     * fetchTransitionsUrgency
     */
    builder
      .addCase(fetchTransitionsUrgency.fulfilled, (state, action) => {
        state.careerTransitionsUrgency = action.payload
      })

    /**
     * fetchTransitionsIndustries
     */
    builder
      .addCase(fetchTransitionsIndustries.fulfilled, (state, action) => {
        const data = action.payload
        if (data?.industries) {
          state.careerTransitionsIndustries = Object.entries(data.industries).map(([key, name]) => ({
            key,
            name
          }))
        }
      })
}
})

/**
 * Actions - Export actions cho components sử dụng
 */
export const {
  setUserRiskLevel,
  clearRecommendations,
  clearSelectedJob,
  clearRiskPrediction,
  clearWorkerAnalysis,
  clearCareerPath,
  resetAIState
} = aiSlice.actions

/**
 * Selectors - Export selectors cho components sử dụng
 */

// Recommendations selectors
export const selectRecommendations = (state) => state.ai.recommendations
export const selectRecommendationsLoading = (state) => state.ai.recommendationsLoading
export const selectRecommendationsError = (state) => state.ai.recommendationsError
export const selectRecommendationsTotal = (state) => state.ai.recommendationsTotal
export const selectRecommendationsFilters = (state) => state.ai.recommendationsFilters

// Jobs selectors
export const selectJobs = (state) => state.ai.jobs
export const selectJobsLoading = (state) => state.ai.jobsLoading
export const selectJobsError = (state) => state.ai.jobsError

// Selected job selectors
export const selectSelectedJob = (state) => state.ai.selectedJob
export const selectSelectedJobLoading = (state) => state.ai.selectedJobLoading
export const selectSelectedJobError = (state) => state.ai.selectedJobError

// Risk prediction selectors
export const selectRiskPrediction = (state) => state.ai.riskPrediction
export const selectRiskPredictionLoading = (state) => state.ai.riskPredictionLoading
export const selectRiskPredictionError = (state) => state.ai.riskPredictionError

// Worker analysis selectors
export const selectWorkerAnalysis = (state) => state.ai.workerAnalysis
export const selectWorkerAnalysisLoading = (state) => state.ai.workerAnalysisLoading
export const selectWorkerAnalysisError = (state) => state.ai.workerAnalysisError

// AI Service selectors
export const selectAIServiceStatus = (state) => state.ai.aiServiceStatus
export const selectAIServiceDataLoaded = (state) => state.ai.aiServiceDataLoaded
export const selectModelInfo = (state) => state.ai.modelInfo

// User risk selectors
export const selectUserRiskLevel = (state) => state.ai.userRiskLevel
export const selectUserRiskScore = (state) => state.ai.userRiskScore
export const selectUserRiskMessage = (state) => state.ai.userRiskMessage

// Career Path selectors
export const selectCareerPath = (state) => state.ai.careerPath
export const selectCareerPathLoading = (state) => state.ai.careerPathLoading
export const selectCareerPathError = (state) => state.ai.careerPathError
export const selectCareerPathUrgency = (state) => state.ai.careerPathUrgency
export const selectCareerPathIndustries = (state) => state.ai.careerPathIndustries

// Career Path convenience selectors
export const selectManagementTrack = (state) => state.ai.careerPath?.management_track ?? []
export const selectAgeTransition = (state) => state.ai.careerPath?.age_transition ?? []
export const selectSkillUpgrades = (state) => state.ai.careerPath?.skill_upgrades ?? []

// Career Transitions selectors (35+)
export const selectCareerTransitions = (state) => state.ai.careerTransitions
export const selectCareerTransitionsLoading = (state) => state.ai.careerTransitionsLoading
export const selectCareerTransitionsError = (state) => state.ai.careerTransitionsError
export const selectCareerTransitionsUrgency = (state) => state.ai.careerTransitionsUrgency
export const selectCareerTransitionsIndustries = (state) => state.ai.careerTransitionsIndustries

export default aiSlice.reducer