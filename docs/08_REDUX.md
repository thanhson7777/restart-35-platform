# 08. Redux Store & Slices

> **Cập nhật:** 2026-04-10

## 10.1 Store Configuration

```javascript
// frontend/src/redux/store.js
import { configureStore } from '@reduxjs/toolkit'
import userReducer from './user/userSlice'
import profileReducer from './profile/profileSlice'
import aiReducer from './ai/aiSlice'

export const store = configureStore({
  reducer: {
    user: userReducer,
    profile: profileReducer,
    ai: aiReducer
  }
})
```

---

## 10.2 `profileSlice` — State shape

```javascript
{
  // Profile data
  profile: null | WorkerProfileObject,
  profileId: null | string,

  // Progress
  currentStep: 1,           // 1-4
  isCompleted: false,
  isLoading: false,
  isSaving: false,
  isCompleting: false,
  lastSavedAt: null,

  // Form data (từng bước)
  formData: {
    basicInfo: {
      age: null,
      gender: null,
      province: null,
      district: null,
      education: null,
      maritalStatus: null,
      phone: null
    },
    employmentHistory: [],
    barriers: {
      health: false,
      family: false,
      techGap: false,
      location: false,
      other: false,
      otherDescription: ''
    },
    aspirations: {
      targetJob: '',
      targetSalary: null,
      targetProvince: null,
      preferredJobType: null,
      skills: [],
      description: ''
    }
  },

  // Error handling
  errors: {}
}
```

---

## 10.3 `profileSlice` — Key Thunks

```javascript
// 1. Fetch profile của user hiện tại
export const fetchMyProfile = createAsyncThunk(
  'profile/fetchMyProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getMyWorkerProfileAPI()
      return response.data   // Trả về profile hoặc null
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

// 2. Tạo profile mới (rỗng)
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

// 3. Lưu từng bước
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

// 4. Auto-save (debounce)
export const autoSave = createAsyncThunk(
  'profile/autoSave',
  async ({ step, data }, { rejectWithValue }) => {
    try {
      const response = await autoSaveWorkerProfileAPI({ step, data })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

// 5. Hoàn thành profile
export const completeProfile = createAsyncThunk(
  'profile/completeProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await completeWorkerProfileAPI()
      return response.data?.data ?? response.data
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)
```

---

## 10.4 `profileSlice` — Reducers

```javascript
// Cập nhật formData khi user nhập
.updateFormData: (state, action) => {
  const { section, data } = action.payload
  if (state.formData[section]) {
    state.formData[section] = { ...state.formData[section], ...data }
  }
}

// Fetch profile thành công
.fetchMyProfile.fulfilled: (state, action) => {
  const profile = action.payload
  state.profile = profile
  state.isCompleted = profile?.isCompleted ?? false
  state.currentStep = profile?.currentStep ?? 1
  state.profileId = profile?._id ?? null

  // Sync formData từ profile
  if (profile?.basicInfo) state.formData.basicInfo = profile.basicInfo
  if (profile?.employmentHistory) state.formData.employmentHistory = profile.employmentHistory
  if (profile?.barriers) state.formData.barriers = profile.barriers
  if (profile?.aspirations) state.formData.aspirations = profile.aspirations
}

// Tạo profile thành công
.createProfile.fulfilled: (state, action) => {
  state.profile = action.payload
  state.profileId = action.payload?._id ?? null
  state.currentStep = 1
  state.isCompleted = false
}

// Lưu step thành công
.saveStep.pending: (state) => { state.isSaving = true }
.saveStep.fulfilled: (state, action) => {
  state.isSaving = false
  state.currentStep = action.payload.step + 1
  state.lastSavedAt = new Date().toISOString()
}

// Hoàn thành profile
.completeProfile.fulfilled: (state, action) => {
  const profile = action.payload
  state.profile = profile
  state.isCompleted = true
  state.currentStep = 4
}
```

---

## 10.5 `aiSlice` — State shape

```javascript
{
  recommendations: [],       // Mảng job gợi ý
  isLoading: false,
  error: null,
  lastFetched: null,

  // Risk prediction
  userRiskLevel: null,       // 'high' | 'medium' | 'low'
  userRiskScore: null,        // 0-1
  riskLoading: false,
  riskError: null
}
```

---

## 10.6 `aiSlice` — Key Thunks

```javascript
// Fetch job recommendations
export const fetchJobRecommendations = createAsyncThunk(
  'ai/fetchJobRecommendations',
  async ({ skills, location, limit = 10 }, { rejectWithValue }) => {
    try {
      const response = await fetchJobRecommendationsAPI({ skills, location, limit })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

// Predict risk
export const predictRisk = createAsyncThunk(
  'ai/predictRisk',
  async (workerProfile, { rejectWithValue }) => {
    try {
      const response = await fetchRiskPredictionAPI(workerProfile)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)
```

---

## 10.7 Key Selectors

```javascript
// Profile selectors
export const selectProfile = (state) => state.profile.profile
export const selectCurrentStep = (state) => state.profile.currentStep
export const selectIsCompleted = (state) => state.profile.isCompleted
export const selectFormData = (state) => state.profile.formData
export const selectIsSaving = (state) => state.profile.isSaving

// AI selectors
export const selectRecommendations = (state) => state.ai.recommendations
export const selectIsLoading = (state) => state.ai.isLoading
export const selectRiskLevel = (state) => state.ai.userRiskLevel
export const selectRiskScore = (state) => state.ai.userRiskScore
```

---

## 10.8 Luồng tạo hồ sơ đúng

```
1. User vào /profile/create
   → MultiStepForm mount
   → init() chạy

2. init():
   await dispatch(fetchMyProfile()).unwrap()
   ↓ profile = null (404)
   if (!profile) await dispatch(createProfile()).unwrap()
   → Backend tạo record rỗng { userId, currentStep: 1, isCompleted: false }

3. User điền từng bước (1→4):
   → handleNext() gọi dispatch(saveStep({ step, data })).unwrap()
   → Backend lưu vào MongoDB

4. Ở bước 4, user nhấn "Hoàn thành":
   → dispatch(completeProfile()).unwrap()
   → Backend set isCompleted: true, currentStep: 4

5. Redirect về /
   → DashboardPage mount
   → dispatch(fetchMyProfile())
   → Redux: profile.isCompleted = true, currentStep = 4
   → AIRecommendations: canUseAI = true → gọi AI
```
