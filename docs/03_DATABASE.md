# 03. MongoDB Collections & Data Models

> **Cập nhật:** 2026-04-10

## 4.1 `users`

```javascript
{
  _id: ObjectId,
  email: String,          // Required, unique
  password: String,        // bcrypt hash
  username: String,
  displayName: String,
  phone: String,
  avatar: String,          // Cloudinary URL
  role: String,           // 'worker' | 'admin'
  isActive: Boolean,       // true sau khi verify email
  verifyToken: String,
  address: String,
  createdAt: Date,
  updatedAt: Date,
  _destroy: Boolean        // Soft delete
}
```

---

## 4.2 `worker_profiles`

```javascript
{
  _id: ObjectId,
  userId: String,          // users._id (string, KHÔNG phải ObjectId)

  // === Tiến độ hoàn thành ===
  currentStep: Number,     // 1-4 (bước hiện tại trên form)
  isCompleted: Boolean,    // true KHI và CHỈ KHI gọi PUT /complete thành công

  // === Step 1: Thông tin cơ bản ===
  basicInfo: {
    age: Number,           // 35-65
    gender: String,        // 'male' | 'female' | 'other'
    province: String,      // Tỉnh/thành phố
    district: String,
    education: String,     // EDUCATION_LEVELS enum
    maritalStatus: String,  // 'single' | 'married' | 'divorced' | 'widowed'
    phone: String
  },

  // === Step 2: Kinh nghiệm làm việc ===
  employmentHistory: [{
    companyName: String,
    position: String,
    duration: Number,      // Số tháng
    jobType: String,        // JOB_TYPES enum
    description: String
  }],

  // === Step 3: Rào cản ===
  barriers: {
    health: Boolean,
    family: Boolean,
    techGap: Boolean,
    location: Boolean,
    other: Boolean,
    otherDescription: String
  },

  // === Step 4: Nguyện vọng ===
  aspirations: {
    targetJob: String,
    targetSalary: Number,
    targetProvince: String,
    preferredJobType: String,
    skills: [String],
    description: String
  },

  // === AI fields (tính từ ai-service) ===
  riskLevel: String,        // 'high' | 'medium' | 'low'
  riskScore: Number,        // 0.0 - 1.0
  recommendedJobs: [String], // Mảng job IDs

  createdAt: Date,
  updatedAt: Date,
  _destroy: Boolean
}
```

---

## 4.3 `jobs`

```javascript
{
  _id: ObjectId,
  title: String,
  company: String,
  location: String,         // Tỉnh/thành (PHẢI trùng với jobs.csv)
  salary: Number,
  jobType: String,          // JOB_TYPES enum
  description: String,
  requirements: [String],
  skills: [String],         // PHẢI trùng với workers.csv
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date,
  _destroy: Boolean
}
```

---

## 4.4 `job_applications` (Tương lai - cho ML)

```javascript
{
  _id: ObjectId,
  userId: String,           // worker._id
  jobId: String,            // job._id
  action: String,           // 'view' | 'click' | 'apply' | 'save'
  rating: Number,            // 1-5 (sau khi apply)
  timestamp: Date,
  _destroy: Boolean
}
```

---

## 4.5 Lưu ý quan trọng

| Sai lầm thường gặp | Đúng |
|---------------------|------|
| `userId: ObjectId` | `userId: String` (MongoDB native driver lưu string) |
| Dùng `currentStep === 4` để kiểm tra đã hoàn thành | Phải dùng `isCompleted` |
| Tạo hồ sơ worker rồi gọi `completeProfile` ngay | Phải `createNew` → điền 4 bước → `completeProfile` |
| `findOneAndUpdate` không kiểm tra null | MongoDB v6 trả null khi không tìm thấy |
