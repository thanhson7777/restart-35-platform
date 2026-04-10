# 10. Bug History (Đã fix)

> **Cập nhật:** 2026-04-10

---

## BUG-001: `fetchMyProfile` thunk không reject khi 404

**Mức độ:** 🔴 Nghiêm trọng

**File:** `frontend/src/redux/profile/profileSlice.js`

**Mô tả:** Thunk `fetchMyProfile` bắt lỗi 404 và `return null` thay vì `rejectWithValue`. Khi dùng `unwrap()` trong `init()`, nó resolve thành công → `catch` không chạy → `createProfile()` không được gọi → hồ sơ không tồn tại.

**Nguyên nhân:**
```javascript
// Code cũ - SAI
export const fetchMyProfile = createAsyncThunk(
  'profile/fetchMyProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getMyWorkerProfileAPI()
      return response.data
    } catch (error) {
      if (error.response?.status === 404) {
        return null  // ❌ SAI: resolve null thay vì reject
      }
      return rejectWithValue(...)
    }
  }
)
```

**Fix trong MultiStepForm:**
```javascript
// init() trong MultiStepForm.jsx
const init = async () => {
  try {
    const profile = await dispatch(fetchMyProfile()).unwrap()
    if (!profile) {
      // Backend trả 404 → thunk resolve null → check ở đây
      await dispatch(createProfile()).unwrap()
    }
  } catch (error) {
    console.error('Init error:', error)
  }
}
```

**Hoặc fix trong thunk:**
```javascript
// Fix: Luôn reject khi lỗi
export const fetchMyProfile = createAsyncThunk(
  'profile/fetchMyProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getMyWorkerProfileAPI()
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)
```

---

## BUG-002: `completeProfile` Redux nhận payload sai cấu trúc

**Mức độ:** 🔴 Nghiêm trọng

**File:** `frontend/src/redux/profile/profileSlice.js`

**Mô tả:** Backend trả `{ success, message, data: profile }`. Thunk gán `return response.data` → trả về object `{ success, message, data }`, reducer gán `state.profile = action.payload` → state lưu sai hoàn toàn.

**Nguyên nhân:**
```javascript
// Code cũ - SAI
export const completeProfile = createAsyncThunk(
  'profile/completeProfile',
  async (_, { rejectWithValue }) => {
    const response = await completeWorkerProfileAPI()
    return response.data  // ❌ response.data = { success, message, data }
  }
)

// Reducer nhận payload = { success, message, data }
.completeProfile.fulfilled: (state, action) => {
  state.profile = action.payload  // ❌ Lưu sai: { success, message, data }
  state.isCompleted = true
}
```

**Fix:**
```javascript
// Thunk - luôn lấy profile thực
export const completeProfile = createAsyncThunk(
  'profile/completeProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await completeWorkerProfileAPI()
      return response.data?.data ?? response.data  // ✅ Lấy profile thực
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

// Reducer - sync formData từ bản ghi thực tế
.completeProfile.fulfilled: (state, action) => {
  const profile = action.payload
  state.profile = profile
  state.isCompleted = profile?.isCompleted !== false
  state.currentStep = profile?.currentStep ?? 4
  if (profile?.basicInfo) state.formData.basicInfo = profile.basicInfo
  if (profile?.employmentHistory) state.formData.employmentHistory = profile.employmentHistory
  if (profile?.barriers) state.formData.barriers = profile.barriers
  if (profile?.aspirations) state.formData.aspirations = profile.aspirations
}
```

---

## BUG-003: `findOneAndUpdate` trả về `null` trong MongoDB Node.js driver v6

**Mức độ:** 🟡 Trung bình

**File:** `backend/src/models/workerProfileModel.js`

**Mô tả:** `findOneAndUpdate` trong MongoDB driver v6 trả về `null` thay vì `{ value: null }` như các phiên bản cũ. Nếu query không khớp bản ghi nào → `null`.

**Nguyên nhân:** Thay đổi behavior trong MongoDB Node.js driver v6.

**Tình trạng:** Backend đã wrap trong try-catch ở service layer → không crash nhưng cần lưu ý khi đọc code.

**Fix trong service:**
```javascript
const updateStep = async (userId, step, data) => {
  try {
    const result = await workerProfileModel.findOneAndUpdate(
      { userId, _destroy: false },
      {
        $set: {
          [`formData.step${step}`]: data,  // Tùy cách lưu
          currentStep: step,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    )

    if (!result) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Hồ sơ không tồn tại')
    }

    return result
  } catch (error) { throw error }
}
```

---

## BUG-004: AIRecommendations bị khóa dù đã 4/4 bước

**Mức độ:** 🟡 Trung bình

**File:** `frontend/src/components/ai/AIRecommendations.jsx`

**Mô tả:** Chỉ kiểm tra `isProfileCompleted`, không tính `currentStep`. Nếu `isCompleted` false nhưng `currentStep = 4` (do autosave), AI vẫn bị khóa.

**Nguyên nhân:**
```javascript
// Code cũ - SAI
const canUseAI = isProfileCompleted  // ❌ Bỏ qua currentStep
```

**Fix:**
```javascript
// Code mới - ĐÚNG
const canUseAI =
  isProfileCompleted ||
  (currentStep >= 4 && Array.isArray(skillsList) && skillsList.length > 0)
```

---

## BUG-005: Dashboard hiển thị mâu thuẫn khi 4/4 bước nhưng chưa complete

**Mức độ:** 🟡 Trung bình

**File:** `frontend/src/pages/DashboardPage.jsx`

**Mô tả:** Banner "Dành 3 phút hoàn thành hồ sơ..." kiểm tra `!isCompleted`, nhưng thanh progress bar kiểm tra `currentStep === 4`. Khi `currentStep = 4` và `isCompleted = false`: thanh 100%, banner vẫn hiện.

**Fix:**
```javascript
const allStepsDone = isCompleted || currentStep >= 4

// Banner chỉ hiện khi còn bước thật sự
{!isCompleted && currentStep < 4 && <Banner ... />}

// Nếu đã 4 bước nhưng chưa complete → nút mở hồ sơ
{!isCompleted && currentStep >= 4 && (
  <Card>
    <p>Bạn đã điền đủ thông tin nhưng chưa xác nhận hoàn thành</p>
    <Button onClick={() => navigate('/profile/create')}>
      Mở hồ sơ để xác nhận
    </Button>
  </Card>
)}
```
