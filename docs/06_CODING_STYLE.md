# 06. Coding Conventions & Patterns

> **Cập nhật:** 2026-04-10

## 8.1 Layered Architecture (Backend)

```
Request → Validation (Joi) → Controller → Service → Model → MongoDB
                ↓                ↓           ↓         ↓
           400/422 error    try/catch    throw     CRUD
```

| Layer | Trách nhiệm | Ví dụ |
|-------|------------|-------|
| **Validation** | Joi middleware kiểm tra input | `userValidation.js` |
| **Controller** | Parse request, gọi service, try/catch, trả response | `userController.js` |
| **Service** | Business logic, gọi model | `userService.js` |
| **Model** | CRUD với Joi validation riêng | `userModel.js` |

---

## 8.2 Quy tắc đặt tên

| Loại | Quy tắc | Ví dụ |
|------|---------|-------|
| File | camelCase | `userService.js` |
| Function | camelCase, động từ | `createNew`, `findOneByUserId` |
| Variable | camelCase | `existProfile`, `currentPage` |
| Constant | SCREAMING_SNAKE_CASE | `USER_ROLES`, `DEFAULT_PAGE` |
| MongoDB collection | snake_case số ít | `users`, `worker_profiles` |
| Redux slice | camelCase | `profileSlice.js`, `aiSlice.js` |

---

## 8.3 Error Handling Pattern (Backend)

```javascript
// Service — throw ApiError với StatusCodes
const createNew = async (userId) => {
  try {
    const existProfile = await workerProfileModel.findOneByUserId(userId)
    if (existProfile) {
      throw new ApiError(StatusCodes.CONFLICT, 'Hồ sơ đã tồn tại!')
    }
    // ... business logic
  } catch (error) { throw error }
}

// Controller — try/catch → next(error)
const createNew = async (req, res, next) => {
  try {
    const createdProfile = await workerProfileService.createNew(userId)
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Tạo hồ sơ thành công!',
      data: createdProfile
    })
  } catch (error) { next(error) }
}
```

---

## 8.4 Model Pattern (MongoDB Native Driver)

```javascript
// 1. Schema với Joi
const USER_COLLECTION_SCHEMA = Joi.object({
  email: Joi.string().required(),
  // ...
})

// 2. Validation riêng biệt
const validateBeforeCreate = async (data) => {
  return await USER_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
    stripUnknown: true
  })
}

// 3. CRUD functions
const createNew = async (data, skipValidation = false) => {
  const validData = skipValidation ? data : await validateBeforeCreate(data)
  return await GET_DB().collection(NAME).insertOne(validData)
}

// 4. Query luôn thêm _destroy: false
const findOneByUserId = async (userId) => {
  return await GET_DB().collection(NAME).findOne({
    userId: userId,
    _destroy: false
  })
}
```

---

## 8.5 Route Definition Pattern

```javascript
// Nhiều middleware theo thứ tự
Router.route('/update')
  .put(
    authMiddleware.isAuthorized,                           // 1. Auth
    multerUploadMiddleware.uploadMulter.single('avatar'), // 2. File upload
    userValidation.update,                               // 3. Validation
    userController.update                                // 4. Xử lý
  )
```

---

## 8.6 Response Format Standard

```javascript
// Success
res.status(StatusCodes.CREATED).json({
  success: true,
  message: 'Mô tả thành công',
  data: result
})

// Pagination
{
  success: true,
  data: {
    items: [...],
    pagination: { totalRecords, totalPages, currentPage, limit }
  }
}
```

---

## 8.7 Redux Thunk Pattern

```javascript
// Thunk — luôn dùng rejectWithValue cho error
export const fetchMyProfile = createAsyncThunk(
  'profile/fetchMyProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getMyWorkerProfileAPI()
      return response.data   // payload khi fulfill
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

// Gọi từ component — dùng unwrap() để lấy payload hoặc throw error
try {
  const profile = await dispatch(fetchMyProfile()).unwrap()
  // ... thành công
} catch (error) {
  // ... xử lý lỗi
}
```

---

## 8.8 Đặc điểm code chung

| Đặc điểm | Giá trị |
|----------|---------|
| Async/Await | Luôn dùng, KHÔNG dùng `.then()` |
| Try/Catch | Mỗi function đều có try/catch riêng |
| Soft Delete | Dùng `_destroy: false`, KHÔNG xóa vĩnh viễn |
| Password | bcrypt, salt = 10 |
| JWT cookies | httpOnly, secure, sameSite |
| Input | Joi validation + `stripUnknown: true` |
| ObjectId | Chuyển String → ObjectId trước query |

---

## 8.9 Import Alias

```javascript
// Backend
import { workerProfileModel } from '~/models/workerProfileModel'
import ApiError from '~/utils/ApiError'

// Frontend
import { fetchMyProfile } from '~/redux/profile/profileSlice'
import AIRecommendations from '~/components/ai/AIRecommendations'

// Cấu hình alias ~ → ./src
```
