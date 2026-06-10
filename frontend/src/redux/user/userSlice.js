import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authorizeAxiosInstance, publicAxiosInstance, resetInterceptorState } from '~/utils/authorizeAxios'
import { API_ROOT } from '~/utils/constants'
import { loginAPI, registerAPI } from '~/apis/authAPI'
import { clearAllSessionData } from '~/utils/logout'
import { resetProfile } from '~/redux/profile/profileSlice'
import { resetAIState } from '~/redux/ai/aiSlice'
import { clearSavedJobs, clearFilters } from '~/redux/job/jobSlice'
import { clearCurrentOutcome } from '~/redux/outcome/outcomeSlice'
import { resetPlacement } from '~/redux/placement/placementSlice'
import { resetLearningRecord } from '~/redux/learningRecord/learningRecordSlice'
import { resetJobs } from '~/redux/job/jobSlice'
import { clearOutcomes } from '~/redux/outcome/outcomeSlice'

// Lazy store accessor — avoids circular dependency with store.js

const initialState = {
  currentUser: null,
  isAuthenticated: false,
  isLoading: false,
  error: null
}

// ── Async Thunks ──────────────────────────────────────────────

export const loginUserAPI = createAsyncThunk(
  'user/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await loginAPI(credentials)
      // Backend trả về user data ở root level, không phải trong key "user"
      const { accessToken, refreshToken, ...user } = response.data || {}

      if (accessToken) {
        localStorage.setItem('accessToken', accessToken)
      }
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken)
      }

      // Reset all slices before new account takes over
      const store = (await import('~/redux/store')).store
      store.dispatch(resetProfile())
      store.dispatch(resetAIState())
      store.dispatch(resetJobs())
      store.dispatch(clearOutcomes())
      store.dispatch(resetPlacement())
      store.dispatch(resetLearningRecord())

      return { user, accessToken, refreshToken }
    } catch (error) {
      const message = error.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.'
      return rejectWithValue(message)
    }
  }
)

export const registerUserAPI = createAsyncThunk(
  'user/register',
  async (data, { rejectWithValue }) => {
    try {
      const response = await registerAPI(data)
      return response.data || response
    } catch (error) {
      const message = error.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.'
      return rejectWithValue(message)
    }
  }
)

export const logoutUser = createAsyncThunk(
  'user/logout',
  async (_, { rejectWithValue }) => {
    // NO-OP: chỉ clear local state, không gọi API
    // Gọi API logout trong thunk gây race condition khi logout → login liên tiếp
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    resetInterceptorState()
    clearAllSessionData()
    // Reset all slices on logout
    const store = (await import('~/redux/store')).store
    store.dispatch(resetProfile())
    store.dispatch(resetAIState())
    store.dispatch(resetJobs())
    store.dispatch(clearOutcomes())
    store.dispatch(resetPlacement())
    store.dispatch(resetLearningRecord())
    return null
  }
)

export const fetchCurrentUser = createAsyncThunk(
  'user/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authorizeAxiosInstance.get(`${API_ROOT}/v1/users/me`)
      // #region agent debug log
      fetch('http://127.0.0.1:7657/ingest/50723660-d880-4eec-a288-d8347939a202',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3b3da8'},body:JSON.stringify({sessionId:'3b3da8',location:'userSlice.js:fetchCurrentUser_fulfilled',message:'GET /v1/users/me raw response.data.data',data:{data:response.data,dataData:response.data?.data},timestamp:Date.now(),hypothesisId:'D',runId:'init'})}).catch(()=>{});
      // #endregion
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Không thể lấy thông tin user')
    }
  }
)

export const updateUserAPI = createAsyncThunk(
  'user/updateUserAPI',
  async (data, { rejectWithValue }) => {
    try {
      const response = await authorizeAxiosInstance.put(`${API_ROOT}/v1/users/update`, data)
      // #region agent debug log
      fetch('http://127.0.0.1:7657/ingest/50723660-d880-4eec-a288-d8347939a202',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3b3da8'},body:JSON.stringify({sessionId:'3b3da8',location:'userSlice.js:updateUserAPI_fulfilled',message:'updateUserAPI response.data',data:{responseData:response.data},timestamp:Date.now(),hypothesisId:'A',runId:'init'})}).catch(()=>{});
      // #endregion
      return response.data.data || response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Có lỗi khi cập nhật')
    }
  }
)

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearUser: (state) => {
      state.currentUser = null
      state.isAuthenticated = false
      state.error = null
    },
    updateUser: (state, action) => {
      state.currentUser = { ...state.currentUser, ...action.payload }
    },
    clearError: (state) => {
      state.error = null
    },
    restoreAuth: (state) => {
      const accessToken = localStorage.getItem('accessToken')
      if (accessToken) {
        state.isAuthenticated = true
      }
    }
  },

  extraReducers: (builder) => {
    // Login
    builder.addCase(loginUserAPI.pending, (state) => {
      state.isLoading = true
      state.error = null
    })
    builder.addCase(loginUserAPI.fulfilled, (state, action) => {
      state.isLoading = false
      state.isAuthenticated = true
      state.currentUser = action.payload.user
      state.error = null
    })
    builder.addCase(loginUserAPI.rejected, (state, action) => {
      state.isLoading = false
      state.isAuthenticated = false
      state.error = action.payload
    })

    // Register
    builder.addCase(registerUserAPI.pending, (state) => {
      state.isLoading = true
      state.error = null
    })
    builder.addCase(registerUserAPI.fulfilled, (state) => {
      state.isLoading = false
      state.error = null
    })
    builder.addCase(registerUserAPI.rejected, (state, action) => {
      state.isLoading = false
      state.error = action.payload
    })

    // Logout
    builder.addCase(logoutUser.fulfilled, (state) => {
      state.currentUser = null
      state.isAuthenticated = false
      state.error = null
    })

    // Update user
    builder.addCase(updateUserAPI.pending, (state) => {
      state.isLoading = true
    })
    builder.addCase(updateUserAPI.fulfilled, (state, action) => {
      state.isLoading = false
      const updatedUser = action.payload
      state.currentUser = { ...state.currentUser, ...updatedUser }
    })
    builder.addCase(updateUserAPI.rejected, (state, action) => {
      state.isLoading = false
      state.error = action.payload
    })

    // Fetch current user
    builder.addCase(fetchCurrentUser.fulfilled, (state, action) => {
      state.currentUser = action.payload
      state.isAuthenticated = true
    })
    builder.addCase(fetchCurrentUser.rejected, (state) => {
      state.currentUser = null
      state.isAuthenticated = false
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    })
  }
})

export const { clearUser, updateUser, clearError, restoreAuth } = userSlice.actions;

export const selectCurrentUser = (state) => {
  return state.user.currentUser
}

export const selectIsAuthenticated = (state) => {
  return state.user.isAuthenticated
}

export const userReducer = userSlice.reducer

export default userSlice.reducer
