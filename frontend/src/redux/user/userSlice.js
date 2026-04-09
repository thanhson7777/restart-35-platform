import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { publicAxiosInstance, authorizeAxiosInstance } from '~/utils/authorizeAxios'
import { API_ROOT } from '~/utils/constants'

const initialState = {
  currentUser: null
}

export const loginUserAPI = createAsyncThunk(
  'user/loginUserAPI',
  async (data, { rejectWithValue }) => {
    try {
      const response = await publicAxiosInstance.post(`${API_ROOT}/v1/users/login`, data)
      // Backend trả về { success: true, data: { user, accessToken, refreshToken } }
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message)
    }
  }
)

export const logoutUserAPI = createAsyncThunk(
  'user/logoutUserAPI',
  async (showSuccessMessage = true, { rejectWithValue }) => {
    try {
      // Dùng publicAxiosInstance vì khi gọi logout từ interceptor thì token có thể đã hết hạn
      const response = await publicAxiosInstance.delete(`${API_ROOT}/v1/users/logout`)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message)
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
      return rejectWithValue(error.response?.data?.message || 'Có lỗi khi cập nhật');
    }
  }
)

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearUser: (state) => {
      state.currentUser = null;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    },
    updateUser: (state, action) => {
      state.currentUser = { ...state.currentUser, ...action.payload }
    }
  },

  extraReducers: (builder) => {
    builder.addCase(loginUserAPI.fulfilled, (state, action) => {
      // Backend trả về { success, message, data: { user, accessToken, refreshToken } }
      const responseData = action.payload
      const user = responseData.data || responseData

      state.currentUser = user

      if (user?.accessToken) {
        localStorage.setItem('accessToken', user.accessToken)
        if (user.refreshToken) {
          localStorage.setItem('refreshToken', user.refreshToken)
        }
      }
    })
    builder.addCase(logoutUserAPI.fulfilled, (state) => {
      state.currentUser = null
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    })

    builder.addCase(logoutUserAPI.rejected, (state) => {
      state.currentUser = null
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    })

    builder.addCase(updateUserAPI.fulfilled, (state, action) => {
      const updatedUser = action.payload
      state.currentUser = { ...state.currentUser, ...updatedUser }
    })
  }
})

export const { clearUser, updateUser } = userSlice.actions;

export const selectCurrentUser = (state) => {
  return state.user.currentUser
}

export const userReducer = userSlice.reducer