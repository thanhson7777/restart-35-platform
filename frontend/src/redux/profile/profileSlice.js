import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import {
  createWorkerProfileAPI,
  getMyWorkerProfileAPI,
  updateWorkerProfileStepAPI,
  autosaveWorkerProfileAPI,
  completeWorkerProfileAPI
} from '~/apis/profileAPI'

// Async thunks
export const fetchMyProfile = createAsyncThunk(
  'profile/fetchMyProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getMyWorkerProfileAPI()
      return response.data
    } catch (error) {
      if (error.response?.data?.message === 'Hồ sơ không tồn tại!') {
        return null
      }
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

export const createProfile = createAsyncThunk(
  'profile/createProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await createWorkerProfileAPI()
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

export const saveStep = createAsyncThunk(
  'profile/saveStep',
  async ({ step, data }, { rejectWithValue }) => {
    try {
      const response = await updateWorkerProfileStepAPI(step, data)
      return { step, data: response.data }
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

export const autosave = createAsyncThunk(
  'profile/autosave',
  async ({ step, data }, { rejectWithValue }) => {
    try {
      const response = await autosaveWorkerProfileAPI(step, data)
      return { profileId: response.data.profileId, savedAt: response.data.savedAt }
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

export const completeProfile = createAsyncThunk(
  'profile/completeProfile',
  async (_, { rejectWithValue }) => {
    try {
      const body = await completeWorkerProfileAPI()
      // Backend: { success, message, data: profile }
      return body?.data ?? body
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

// Initial state
const initialState = {
  profile: null,
  profileId: null,
  currentStep: 1,
  isCompleted: false,
  isLoading: false,
  isSaving: false,
  isCompleting: false,
  lastSavedAt: null,
  error: null,

  // Form data for each step
  formData: {
    basicInfo: {},
    employmentHistory: [],
    barriers: {},
    aspirations: {}
  },

  // Step validation errors
  errors: {}
}

// Slice
const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setCurrentStep: (state, action) => {
      state.currentStep = action.payload
    },

    updateFormData: (state, action) => {
      const { step, data } = action.payload
      const stepFieldMap = {
        1: 'basicInfo',
        2: 'employmentHistory',
        3: 'barriers',
        4: 'aspirations'
      }
      if (stepFieldMap[step]) {
        state.formData[stepFieldMap[step]] = data
      }
    },

    setStepErrors: (state, action) => {
      state.errors = action.payload
    },

    clearStepErrors: (state) => {
      state.errors = {}
    },

    loadFormFromProfile: (state, action) => {
      const profile = action.payload
      if (profile) {
        state.profile = profile
        state.profileId = profile._id
        state.currentStep = profile.currentStep || 1
        state.isCompleted = profile.isCompleted || false
        state.formData = {
          basicInfo: profile.basicInfo || {},
          employmentHistory: profile.employmentHistory || [],
          barriers: profile.barriers || {},
          aspirations: profile.aspirations || {}
        }
      }
    },

    resetProfile: () => initialState
  },

  extraReducers: (builder) => {
    // fetchMyProfile
    builder
      .addCase(fetchMyProfile.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchMyProfile.fulfilled, (state, action) => {
        state.isLoading = false
        if (action.payload) {
          state.profile = action.payload
          state.profileId = action.payload._id
          state.currentStep = action.payload.currentStep || 1
          state.isCompleted = action.payload.isCompleted || false
          state.formData = {
            basicInfo: action.payload.basicInfo || {},
            employmentHistory: action.payload.employmentHistory || [],
            barriers: action.payload.barriers || {},
            aspirations: action.payload.aspirations || {}
          }
        }
      })
      .addCase(fetchMyProfile.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })

    // createProfile
    builder
      .addCase(createProfile.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(createProfile.fulfilled, (state, action) => {
        state.isLoading = false
        state.profile = action.payload
        state.profileId = action.payload._id
      })
      .addCase(createProfile.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })

    // saveStep
    builder
      .addCase(saveStep.pending, (state) => {
        state.isSaving = true
        state.error = null
      })
      .addCase(saveStep.fulfilled, (state, action) => {
        state.isSaving = false
        state.profile = action.payload.data
        state.profileId = action.payload.data._id
        if (action.payload.data.currentStep) {
          state.currentStep = action.payload.data.currentStep
        }
        if (action.payload.data.isCompleted) {
          state.isCompleted = true
        }
      })
      .addCase(saveStep.rejected, (state, action) => {
        state.isSaving = false
        state.error = action.payload
      })

    // autosave
    builder
      .addCase(autosave.pending, (state) => {
        state.isSaving = true
      })
      .addCase(autosave.fulfilled, (state, action) => {
        state.isSaving = false
        state.lastSavedAt = action.payload.savedAt
        if (action.payload.profileId) {
          state.profileId = action.payload.profileId
        }
      })
      .addCase(autosave.rejected, (state) => {
        state.isSaving = false
      })

    // completeProfile
    builder
      .addCase(completeProfile.pending, (state) => {
        state.isCompleting = true
        state.error = null
      })
      .addCase(completeProfile.fulfilled, (state, action) => {
        state.isCompleting = false
        const profile = action.payload
        state.profile = profile
        state.isCompleted = profile?.isCompleted !== false
        state.currentStep = profile?.currentStep ?? 4
        if (profile?.basicInfo) state.formData.basicInfo = profile.basicInfo
        if (profile?.employmentHistory) state.formData.employmentHistory = profile.employmentHistory
        if (profile?.barriers) state.formData.barriers = profile.barriers
        if (profile?.aspirations) state.formData.aspirations = profile.aspirations
      })
      .addCase(completeProfile.rejected, (state, action) => {
        state.isCompleting = false
        state.error = action.payload
      })
  }
})

// Actions
export const {
  setCurrentStep,
  updateFormData,
  setStepErrors,
  clearStepErrors,
  loadFormFromProfile,
  resetProfile
} = profileSlice.actions

// Selectors
export const selectProfile = (state) => state.profile.profile
export const selectCurrentStep = (state) => state.profile.currentStep
export const selectIsCompleted = (state) => state.profile.isCompleted
export const selectFormData = (state) => state.profile.formData
export const selectIsSaving = (state) => state.profile.isSaving
export const selectLastSavedAt = (state) => state.profile.lastSavedAt
export const selectIsLoading = (state) => state.profile.isLoading
export const selectIsCompleting = (state) => state.profile.isCompleting
export const selectErrors = (state) => state.profile.errors

export default profileSlice.reducer
