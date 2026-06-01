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
  getTransitionsSkillsAPI,
  triggerRAGCareerRecommendationAPI,
  getCachedRAGRecommendationAPI,
  refreshRAGRecommendationAPI,
  getRAGSourcesAPI,
  getRAGHealthAPI,
  triggerStartupSuggestionAPI
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
      // Backend trả về: { success: true, data: { management_track: [...], age_transition: [...], ... } }
      // aiAPI trả về: response = { success: true, data: {...} } (axios unwrap)
      // Thunk unwrap 2 lần: response?.data?.data = { management_track: [...], ... }
      const result = response?.data?.data || response?.data || response
      return result
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

// =============================================================================
// RAG CAREER RECOMMENDATION THUNKS
// =============================================================================

/**
 * Trigger RAG-based career recommendation
 * POST /v1/ai/rag/career-recommendation
 */
export const triggerRAGRecommendation = createAsyncThunk(
  'ai/triggerRAGRecommendation',
  async ({ profile, includeSalary = true, includeTrends = true }, { rejectWithValue }) => {
    try {
      const response = await triggerRAGCareerRecommendationAPI(profile, includeSalary, includeTrends)
      return response?.data ?? response
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Không thể tạo RAG recommendation'
      )
    }
  }
)

/**
 * Get cached RAG career recommendation
 * GET /v1/ai/rag/career-recommendation
 */
export const fetchCachedRAGRecommendation = createAsyncThunk(
  'ai/fetchCachedRAGRecommendation',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getCachedRAGRecommendationAPI()
      // Response: { success, data: { best_fits, income_boost, progression }, meta: {...} }
      return response
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Không thể lấy RAG recommendation đã cache'
      )
    }
  }
)

/**
 * Refresh RAG career recommendation
 * POST /v1/ai/rag/career-recommendation/refresh
 *
 * Rate limit: Max 1 refresh per 24 hours
 */
export const refreshRAGRecommendation = createAsyncThunk(
  'ai/refreshRAGRecommendation',
  async ({ profile, includeSalary = true, includeTrends = true }, { rejectWithValue }) => {
    try {
      const response = await refreshRAGRecommendationAPI(profile, includeSalary, includeTrends)
      return response?.data ?? response
    } catch (error) {
      // Check for rate limit error (410 Gone)
      if (error.response?.status === 410) {
        return rejectWithValue(
          error.response?.data?.message || 'Đã refresh gần đây. Vui lòng chờ 24 giờ trước khi refresh tiếp.'
        )
      }
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Không thể refresh RAG recommendation'
      )
    }
  }
)

/**
 * Get RAG data sources
 * GET /v1/ai/rag/sources
 *
 * Public endpoint - No auth required
 */
export const fetchRAGSources = createAsyncThunk(
  'ai/fetchRAGSources',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getRAGSourcesAPI()
      return response?.data ?? response
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Không thể lấy RAG sources'
      )
    }
  }
)

/**
 * Get RAG system health status
 * GET /v1/ai/rag/health
 *
 * Public endpoint - No auth required
 */
export const fetchRAGHealth = createAsyncThunk(
  'ai/fetchRAGHealth',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getRAGHealthAPI()
      return response
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Không thể lấy RAG health status'
      )
    }
  }
)

/**
 * Get RAG-based startup suggestions
 * POST /v1/ai/rag/startup-suggestions
 */
export const triggerStartupSuggestion = createAsyncThunk(
  'ai/triggerStartupSuggestion',
  async ({ profile, budget = '50-100 triệu' }, { rejectWithValue }) => {
    try {
      const response = await triggerStartupSuggestionAPI(profile, budget)
      return response?.data ?? response
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Không thể lấy gợi ý lập nghiệp'
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
 * =============================================================================
 * FEDERATED CAREER ANALYSIS THUNKS (Phase 2+)
 * =============================================================================
 */

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
  careerTransitionsIndustries: [],   // Supported industries

  // RAG Career Recommendations
  ragRecommendation: null,         // { best_fits, income_boost, progression }
  ragLoading: false,
  ragError: null,
  ragSources: [],                  // ['salary_benchmarks.json', ...]
  ragHealth: null,                // { status, components: {...} }
  ragGeneratedAt: null,           // ISO timestamp
  ragRefreshCount: 0,
  ragExpiresAt: null,
  ragIsFresh: null,               // boolean - is data fresh or expired
  ragIsExpired: null,               // boolean - is data expired

  // Startup state
  startupIdeas: [],
  startupLoading: false,
  startupError: null
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
     * Set career path directly (for cache loading)
     */
    setCareerPath: (state, action) => {
      state.careerPath = action.payload
      state.careerPathError = null
    },

    /**
     * Reset all AI state
     */
    resetAIState: () => initialState,

    /**
     * Clear RAG recommendation
     */
    clearRAGRecommendation: (state) => {
      state.ragRecommendation = null
      state.ragError = null
    },

    /**
     * Clear startup ideas (khi profile thay đổi)
     */
    clearStartupIdeas: (state) => {
      state.startupIdeas = []
      state.startupError = null
    },

    /**
     * Set RAG recommendation directly (for cache loading)
     */
    setRAGRecommendation: (state, action) => {
      state.ragRecommendation = action.payload
      state.ragError = null
    }
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

    /**
     * =============================================================================
     * RAG CAREER RECOMMENDATION REDUCERS
     * =============================================================================
     */

    /**
     * triggerRAGRecommendation
     */
    builder
      .addCase(triggerRAGRecommendation.pending, (state) => {
        state.ragLoading = true
        state.ragError = null
      })
      .addCase(triggerRAGRecommendation.fulfilled, (state, action) => {
        state.ragLoading = false
        // Response: { success, data: { best_fits, income_boost, progression }, meta: {...} }
        const payload = action.payload
        if (payload?.success && payload?.data) {
          state.ragRecommendation = payload.data
        } else {
          // Fallback: use payload directly
          state.ragRecommendation = payload
        }
      })
      .addCase(triggerRAGRecommendation.rejected, (state, action) => {
        state.ragLoading = false
        state.ragError = action.payload
      })

    /**
     * fetchCachedRAGRecommendation
     */
    builder
      .addCase(fetchCachedRAGRecommendation.pending, (state) => {
        state.ragLoading = true
        state.ragError = null
      })
      .addCase(fetchCachedRAGRecommendation.fulfilled, (state, action) => {
        state.ragLoading = false
        const payload = action.payload
        if (payload?.success) {
          state.ragRecommendation = payload?.data ?? null
          // Update metadata from meta
          if (payload?.meta) {
            state.ragGeneratedAt = payload.meta.generatedAt
            state.ragRefreshCount = payload.meta.refreshCount
            state.ragExpiresAt = payload.meta.expiresAt
            state.ragIsFresh = payload.meta.isFresh
            state.ragIsExpired = payload.meta.isExpired
          }
        } else {
          // No cached data
          state.ragRecommendation = null
          if (payload?.meta) {
            state.ragGeneratedAt = payload.meta.generatedAt
            state.ragIsFresh = false
          }
        }
      })
      .addCase(fetchCachedRAGRecommendation.rejected, (state, action) => {
        state.ragLoading = false
        state.ragError = action.payload
      })

    /**
     * refreshRAGRecommendation
     */
    builder
      .addCase(refreshRAGRecommendation.pending, (state) => {
        state.ragLoading = true
        state.ragError = null
      })
      .addCase(refreshRAGRecommendation.fulfilled, (state, action) => {
        state.ragLoading = false
        const payload = action.payload
        if (payload?.success && payload?.data) {
          state.ragRecommendation = payload.data
        } else {
          state.ragRecommendation = payload
        }
      })
      .addCase(refreshRAGRecommendation.rejected, (state, action) => {
        state.ragLoading = false
        state.ragError = action.payload
      })

    /**
     * fetchRAGSources
     */
    builder
      .addCase(fetchRAGSources.pending, (state) => {
        state.ragLoading = true
      })
      .addCase(fetchRAGSources.fulfilled, (state, action) => {
        state.ragLoading = false
        const payload = action.payload
        if (payload?.data?.sources) {
          state.ragSources = payload.data.sources
        } else if (payload?.sources) {
          state.ragSources = payload.sources
        }
      })
      .addCase(fetchRAGSources.rejected, (state) => {
        state.ragLoading = false
      })

    /**
     * fetchRAGHealth
     */
    builder
      .addCase(fetchRAGHealth.fulfilled, (state, action) => {
        state.ragHealth = action.payload
      })

    /**
     * triggerStartupSuggestion
     */
    builder
      .addCase(triggerStartupSuggestion.pending, (state) => {
        state.startupLoading = true
        state.startupError = null
      })
      .addCase(triggerStartupSuggestion.fulfilled, (state, action) => {
        state.startupLoading = false
        const payload = action.payload
        if (payload?.success && payload?.startup_ideas) {
          state.startupIdeas = payload.startup_ideas
        } else if (Array.isArray(payload)) {
          state.startupIdeas = payload
        }
      })
      .addCase(triggerStartupSuggestion.rejected, (state, action) => {
        state.startupLoading = false
        state.startupError = action.payload
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
  setCareerPath,
  resetAIState,
  clearRAGRecommendation,
  setRAGRecommendation,
  clearStartupIdeas
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
// Redux state: { management_track: [...], age_transition: [...], ... }
export const selectManagementTrack = (state) => state.ai.careerPath?.management_track ?? []
export const selectAgeTransition = (state) => state.ai.careerPath?.age_transition ?? []
export const selectSkillUpgrades = (state) => state.ai.careerPath?.skill_upgrades ?? []

// Career Transitions selectors (35+)
export const selectCareerTransitions = (state) => state.ai.careerTransitions
export const selectCareerTransitionsLoading = (state) => state.ai.careerTransitionsLoading
export const selectCareerTransitionsError = (state) => state.ai.careerTransitionsError
export const selectCareerTransitionsUrgency = (state) => state.ai.careerTransitionsUrgency
export const selectCareerTransitionsIndustries = (state) => state.ai.careerTransitionsIndustries

// RAG Career Recommendation selectors
export const selectRAGRecommendation = (state) => state.ai.ragRecommendation
export const selectRAGLoading = (state) => state.ai.ragLoading
export const selectRAGError = (state) => state.ai.ragError
export const selectRAGSources = (state) => state.ai.ragSources
export const selectRAGHealth = (state) => state.ai.ragHealth
export const selectRAGGeneratedAt = (state) => state.ai.ragGeneratedAt
export const selectRAGRefreshCount = (state) => state.ai.ragRefreshCount
export const selectRAGExpiresAt = (state) => state.ai.ragExpiresAt
export const selectRAGIsFresh = (state) => state.ai.ragIsFresh
export const selectRAGIsExpired = (state) => state.ai.ragIsExpired

// RAG convenience selectors
export const selectBestFits = (state) => state.ai.ragRecommendation?.best_fits ?? []
export const selectIncomeBoost = (state) => state.ai.ragRecommendation?.income_boost ?? []
export const selectProgression = (state) => state.ai.ragRecommendation?.progression ?? []

// Startup selectors
export const selectStartupIdeas = (state) => state.ai.startupIdeas
export const selectStartupLoading = (state) => state.ai.startupLoading
export const selectStartupError = (state) => state.ai.startupError

export default aiSlice.reducer