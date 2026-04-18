import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authorizeAxiosInstance } from '~/utils/authorizeAxios'
import { API_ROOT } from '~/utils/constants'

const API_URL = `${API_ROOT}/v1/ai`

// Fetch all jobs
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
      return data?.jobs || data || []
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch jobs')
    }
  }
)

const initialState = {
  jobs: [],
  currentJob: null,
  loading: false,
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
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllJobs.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchAllJobs.fulfilled, (state, action) => {
        state.loading = false
        state.jobs = action.payload
      })
      .addCase(fetchAllJobs.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
  }
})

export const { clearJobError, setCurrentJob } = jobSlice.actions

export const selectJobs = (state) => state.jobs?.jobs || []
export const selectJobsLoading = (state) => state.jobs?.loading || false
export const selectJobsError = (state) => state.jobs?.error || null

export default jobSlice.reducer
