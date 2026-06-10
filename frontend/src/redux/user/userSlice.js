import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authorizeAxiosInstance, publicAxiosInstance, resetInterceptorState, injectStore } from '~/utils/authorizeAxios'
import { API_ROOT } from '~/utils/constants'
import { loginAPI, registerAPI } from '~/apis/authAPI'
import { clearAllSessionData } from '~/utils/logout'
import { resetProfile } from '~/redux/profile/profileSlice'
import { resetAIState } from '~/redux/ai/aiSlice'
import { clearSavedJobs, clearFilters } from '~/redux/job/jobSlice'
import { clearCurrentOutcome } from '~/redux/outcome/outcomeSlice'
import { resetPlacement } from '~/redux/placement/placementSlice'
import { resetLearningRecord } from '~/redux/learningRecord/learningRecordSlice'

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
    return null
  }
)

export const fetchCurrentUser = createAsyncThunk(
  'user/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authorizeAxiosInstance.get(`${API_ROOT}/v1/users/me`)
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
      // Reset all slices before new account takes over
      const store = injectStore()
      fetch('http://127.0.0.1:7657/ingest/50723660-d880-4eec-a288-d8347939a202',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'8e2819'},body:JSON.stringify({sessionId:'8e2819',location:'userSlice.js:login.fulfilled',message:'injectStore result in login.fulfilled',data:{storeValue:store,storeType:typeof store,truthy:!!store},timestamp:Date.now(),hypothesisId:'H-injectStore',runId:'debug'})}).catch(()=>{});
      if (store) {
        store.dispatch(resetProfile())
        store.dispatch(resetAIState())
        store.dispatch(resetJobs())
        store.dispatch(clearOutcomes())
        store.dispatch(resetPlacement())
        store.dispatch(resetLearningRecord())
      }
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
