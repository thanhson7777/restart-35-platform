/**
 * Outcome Slice - Redux state cho Job Outcome Tracking
 * Quản lý state cho outcome, feedback và preferences
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import {
  createOutcomeAPI,
  getMyOutcomesAPI,
  getOutcomeByIdAPI,
  updateOutcomeStatusAPI,
  submitFeedbackAPI,
  getMyStatsAPI,
  getMyPreferencesAPI,
  withdrawOutcomeAPI,
  OUTCOME_STATUS
} from '~/apis/outcomeAPI'

/**
 * Async Thunks
 */

// Tạo outcome mới (khi apply)
export const createOutcome = createAsyncThunk(
  'outcome/createOutcome',
  async ({ jobId, jobTitle, companyName, metadata }, { rejectWithValue }) => {
    try {
      const response = await createOutcomeAPI({ jobId, jobTitle, companyName, metadata })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Không thể tạo outcome')
    }
  }
)

// Lấy danh sách outcomes
export const fetchMyOutcomes = createAsyncThunk(
  'outcome/fetchMyOutcomes',
  async (options = {}, { rejectWithValue }) => {
    try {
      const response = await getMyOutcomesAPI(options)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Không thể lấy danh sách outcomes')
    }
  }
)

// Lấy chi tiết outcome
export const fetchOutcomeById = createAsyncThunk(
  'outcome/fetchOutcomeById',
  async (outcomeId, { rejectWithValue }) => {
    try {
      const response = await getOutcomeByIdAPI(outcomeId)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Không thể lấy chi tiết outcome')
    }
  }
)

// Update status
export const updateOutcomeStatus = createAsyncThunk(
  'outcome/updateOutcomeStatus',
  async ({ outcomeId, status, additionalData }, { rejectWithValue }) => {
    try {
      const response = await updateOutcomeStatusAPI(outcomeId, status, additionalData)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Không thể cập nhật status')
    }
  }
)

// Submit feedback
export const submitFeedback = createAsyncThunk(
  'outcome/submitFeedback',
  async ({ outcomeId, feedbackData }, { rejectWithValue }) => {
    try {
      const response = await submitFeedbackAPI(outcomeId, feedbackData)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Không thể gửi feedback')
    }
  }
)

// Lấy thống kê
export const fetchMyStats = createAsyncThunk(
  'outcome/fetchMyStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getMyStatsAPI()
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Không thể lấy thống kê')
    }
  }
)

// Lấy preferences cho ML
export const fetchMyPreferences = createAsyncThunk(
  'outcome/fetchMyPreferences',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getMyPreferencesAPI()
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Không thể lấy preferences')
    }
  }
)

// Withdraw outcome
export const withdrawOutcome = createAsyncThunk(
  'outcome/withdrawOutcome',
  async ({ outcomeId, reason }, { rejectWithValue }) => {
    try {
      const response = await withdrawOutcomeAPI(outcomeId, reason)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Không thể rút đơn')
    }
  }
)

/**
 * Initial State
 */
const initialState = {
  // Danh sách outcomes
  outcomes: [],
  outcomesLoading: false,
  outcomesError: null,

  // Outcome hiện tại
  currentOutcome: null,
  currentOutcomeLoading: false,

  // Rating modal
  ratingModal: {
    isOpen: false,
    job: null,
    outcomeId: null
  },

  // Thống kê
  stats: null,
  statsLoading: false,

  // Preferences (cho ML)
  preferences: null,
  preferencesLoading: false,

  // Feedback modal
  feedbackModal: {
    isOpen: false,
    outcomeId: null
  }
}

/**
 * Outcome Slice
 */
const outcomeSlice = createSlice({
  name: 'outcome',
  initialState,
  reducers: {
    // Open rating modal
    openRatingModal: (state, action) => {
      state.ratingModal = {
        isOpen: true,
        job: action.payload.job,
        outcomeId: action.payload.outcomeId
      }
    },

    // Close rating modal
    closeRatingModal: (state) => {
      state.ratingModal = {
        isOpen: false,
        job: null,
        outcomeId: null
      }
    },

    // Open feedback modal
    openFeedbackModal: (state, action) => {
      state.feedbackModal = {
        isOpen: true,
        outcomeId: action.payload.outcomeId
      }
    },

    // Close feedback modal
    closeFeedbackModal: (state) => {
      state.feedbackModal = {
        isOpen: false,
        outcomeId: null
      }
    },

    // Clear current outcome
    clearCurrentOutcome: (state) => {
      state.currentOutcome = null
    },

    // Clear outcomes
    clearOutcomes: (state) => {
      state.outcomes = []
      state.outcomesError = null
    }
  },

  extraReducers: (builder) => {
    // createOutcome
    builder
      .addCase(createOutcome.pending, (state) => {
        state.outcomesLoading = true
        state.outcomesError = null
      })
      .addCase(createOutcome.fulfilled, (state, action) => {
        state.outcomesLoading = false
        state.currentOutcome = action.payload
        state.outcomes.unshift(action.payload)
      })
      .addCase(createOutcome.rejected, (state, action) => {
        state.outcomesLoading = false
        state.outcomesError = action.payload
      })

    // fetchMyOutcomes
    builder
      .addCase(fetchMyOutcomes.pending, (state) => {
        state.outcomesLoading = true
        state.outcomesError = null
      })
      .addCase(fetchMyOutcomes.fulfilled, (state, action) => {
        state.outcomesLoading = false
        state.outcomes = action.payload.outcomes || []
      })
      .addCase(fetchMyOutcomes.rejected, (state, action) => {
        state.outcomesLoading = false
        state.outcomesError = action.payload
      })

    // fetchOutcomeById
    builder
      .addCase(fetchOutcomeById.pending, (state) => {
        state.currentOutcomeLoading = true
      })
      .addCase(fetchOutcomeById.fulfilled, (state, action) => {
        state.currentOutcomeLoading = false
        state.currentOutcome = action.payload
      })
      .addCase(fetchOutcomeById.rejected, (state, action) => {
        state.currentOutcomeLoading = false
      })

    // updateOutcomeStatus
    builder
      .addCase(updateOutcomeStatus.fulfilled, (state, action) => {
        const updated = action.payload
        const index = state.outcomes.findIndex(o => o._id === updated._id)
        if (index !== -1) {
          state.outcomes[index] = updated
        }
        if (state.currentOutcome?._id === updated._id) {
          state.currentOutcome = updated
        }
      })

    // submitFeedback
    builder
      .addCase(submitFeedback.fulfilled, (state, action) => {
        const updated = action.payload
        const index = state.outcomes.findIndex(o => o._id === updated._id)
        if (index !== -1) {
          state.outcomes[index] = updated
        }
        if (state.currentOutcome?._id === updated._id) {
          state.currentOutcome = updated
        }
        state.feedbackModal.isOpen = false
      })

    // fetchMyStats
    builder
      .addCase(fetchMyStats.pending, (state) => {
        state.statsLoading = true
      })
      .addCase(fetchMyStats.fulfilled, (state, action) => {
        state.statsLoading = false
        state.stats = action.payload
      })
      .addCase(fetchMyStats.rejected, (state) => {
        state.statsLoading = false
      })

    // fetchMyPreferences
    builder
      .addCase(fetchMyPreferences.pending, (state) => {
        state.preferencesLoading = true
      })
      .addCase(fetchMyPreferences.fulfilled, (state, action) => {
        state.preferencesLoading = false
        state.preferences = action.payload
      })
      .addCase(fetchMyPreferences.rejected, (state) => {
        state.preferencesLoading = false
      })

    // withdrawOutcome
    builder
      .addCase(withdrawOutcome.fulfilled, (state, action) => {
        const updated = action.payload
        const index = state.outcomes.findIndex(o => o._id === updated._id)
        if (index !== -1) {
          state.outcomes[index] = updated
        }
      })
  }
})

/**
 * Actions
 */
export const {
  openRatingModal,
  closeRatingModal,
  openFeedbackModal,
  closeFeedbackModal,
  clearCurrentOutcome,
  clearOutcomes
} = outcomeSlice.actions

/**
 * Selectors
 */

// Outcomes selectors
export const selectOutcomes = (state) => state.outcome?.outcomes || []
export const selectOutcomesLoading = (state) => state.outcome?.outcomesLoading || false
export const selectOutcomesError = (state) => state.outcome?.outcomesError || null

// Current outcome selectors
export const selectCurrentOutcome = (state) => state.outcome?.currentOutcome
export const selectCurrentOutcomeLoading = (state) => state.outcome?.currentOutcomeLoading

// Rating modal selectors
export const selectRatingModal = (state) => state.outcome?.ratingModal
export const selectIsRatingModalOpen = (state) => state.outcome?.ratingModal?.isOpen
export const selectRatingModalJob = (state) => state.outcome?.ratingModal?.job
export const selectRatingModalOutcomeId = (state) => state.outcome?.ratingModal?.outcomeId

// Feedback modal selectors
export const selectFeedbackModal = (state) => state.outcome?.feedbackModal
export const selectIsFeedbackModalOpen = (state) => state.outcome?.feedbackModal?.isOpen

// Stats selectors
export const selectStats = (state) => state.outcome?.stats
export const selectStatsLoading = (state) => state.outcome?.statsLoading

// Preferences selectors
export const selectPreferences = (state) => state.outcome?.preferences
export const selectPreferencesLoading = (state) => state.outcome?.preferencesLoading
export const selectHasEnoughPreferenceData = (state) => state.outcome?.preferences?.hasEnoughData || false

// Derived selectors
export const selectHiredOutcomes = (state) =>
  (state.outcome?.outcomes || []).filter(o => o.status === OUTCOME_STATUS.HIRED)

export const selectPendingOutcomes = (state) =>
  (state.outcome?.outcomes || []).filter(o =>
    [OUTCOME_STATUS.APPLIED, OUTCOME_STATUS.REVIEWING, OUTCOME_STATUS.INTERVIEWED, OUTCOME_STATUS.OFFERED].includes(o.status)
  )

export const selectSuccessRate = (state) => {
  const stats = state.outcome?.stats
  if (!stats) return 0
  return stats.successRate || 0
}

export default outcomeSlice.reducer
