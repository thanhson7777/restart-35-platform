# 07. Frontend Components

> **Cập nhật:** 2026-04-10

## 12.1 AIRecommendations

### Mô tả
Component hiển thị gợi ý việc làm và risk badge cho worker.

### Props

```javascript
AIRecommendations.propTypes = {
  userSkills: PropTypes.arrayOf(PropTypes.string),  // Danh sách skills
  limit: PropTypes.number,                          // Số job tối đa (default: 6)
  showRiskSection: PropTypes.bool,                  // Hiển thị risk (default: true)
  showViewMore: PropTypes.bool,                    // Hiển thị nút xem thêm (default: true)
  onJobClick: PropTypes.func                        // Callback khi click job
}
```

### Logic chính

```javascript
// Điều kiện hiển thị AI
const canUseAI =
  isProfileCompleted ||
  (currentStep >= 4 && Array.isArray(skillsList) && skillsList.length > 0)

// Fetch AI khi đủ điều kiện
useEffect(() => {
  if (canUseAI && skillsList.length > 0) {
    dispatch(fetchJobRecommendations({
      skills: skillsList,
      location: profile?.aspirations?.targetProvince,
      limit: limit
    }))
  }
}, [canUseAI, skillsList])
```

### Cấu trúc UI

```
AIRecommendations
├── RiskBadge                    ← Hiển thị mức độ rủi ro
├── Section Header
│   └── "Việc làm phù hợp với bạn"
├── JobCard[]                    ← Danh sách job được gợi ý
│   └── Score badge
├── SkeletonLoader               ← Loading state
└── EmptyState                   ← Chưa đủ điều kiện
```

---

## 12.2 MultiStepForm

### Mô tả
Form 4 bước để hoàn thành hồ sơ worker.

### Các bước

| Bước | Tên | Component | Data |
|------|-----|-----------|------|
| 1 | Thông tin cơ bản | `StepBasicInfo.jsx` | basicInfo |
| 2 | Kinh nghiệm | `StepEmployment.jsx` | employmentHistory |
| 3 | Rào cản | `StepBarriers.jsx` | barriers |
| 4 | Nguyện vọng | `StepAspirations.jsx` | aspirations |

### Luồng xử lý

```javascript
// 1. init() - Khởi tạo
const init = async () => {
  try {
    const profile = await dispatch(fetchMyProfile()).unwrap()
    if (!profile) {
      await dispatch(createProfile()).unwrap()
    }
  } catch (error) {
    console.error('Init error:', error)
  }
}

// 2. handleNext() - Lưu và chuyển bước
const handleNext = async () => {
  // Validate current step
  if (!validateStep(currentStep)) return

  // Save to backend
  await dispatch(saveStep({ step: currentStep, data: formData[currentStep] })).unwrap()

  // Move to next step
  if (currentStep < 4) {
    setCurrentStep(currentStep + 1)
  } else {
    // Complete profile
    await dispatch(completeProfile()).unwrap()
    navigate('/')
  }
}

// 3. Auto-save (debounce 2 giây)
useEffect(() => {
  const timer = setTimeout(() => {
    dispatch(autoSave({ step: currentStep, data: formData[currentStep] }))
  }, 2000)
  return () => clearTimeout(timer)
}, [formData])
```

### Validation

```javascript
const validateStep = (step) => {
  switch (step) {
    case 1:
      return formData.basicInfo.age >= 35 && formData.basicInfo.province
    case 2:
      return true // Optional
    case 3:
      return true // Optional
    case 4:
      return formData.aspirations.skills?.length > 0
    default:
      return false
  }
}
```

---

## 12.3 DashboardPage

### Mô tả
Trang chủ của worker sau khi đăng nhập.

### UI Structure

```
DashboardPage
├── Header (User info, avatar)
├── Progress Banner
│   └── "Hoàn thành hồ sơ để nhận gợi ý việc làm"
├── Profile Completion Card
│   ├── Progress Bar (currentStep / 4)
│   └── "Hoàn thành ngay" button
├── AIRecommendations
│   └── Job cards + Risk badge
└── Quick Actions
    ├── Xem việc làm
    ├── Khóa học
    └── Hỗ trợ
```

### Logic chính

```javascript
// Load profile khi mount
useEffect(() => {
  if (user?._id) {
    dispatch(fetchMyProfile())
    dispatch(fetchUserById(user._id))
  }
}, [user?._id])

// Tính toán hiển thị
const allStepsDone = isCompleted || currentStep >= 4
const progressPercent = Math.min(100, (currentStep / 4) * 100)
```

---

## 12.4 JobCard

### Mô tả
Card hiển thị thông tin một công việc.

### Props

```javascript
JobCard.propTypes = {
  job: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    company: PropTypes.string,
    score: PropTypes.number,        // 0-1 match score
    skills: PropTypes.arrayOf(PropTypes.string),
    salary_range: PropTypes.string,
    location: PropTypes.string,
    type: PropTypes.string
  }),
  onClick: PropTypes.func
}
```

### UI

```
JobCard
├── Header
│   ├── Title
│   └── Company
├── Score Badge (màu theo mức độ)
├── Info Row
│   ├── Location icon + Location
│   ├── Salary icon + Salary
│   └── Type badge
├── Skills Tags
└── Footer
    └── "Ứng tuyển" button
```

---

## 12.5 RiskBadge

### Mô tả
Badge hiển thị mức độ rủi ro thất nghiệp.

### Variants

| Level | Màu | Icon | Mô tả |
|-------|------|------|--------|
| `high` | Đỏ | ⚠️ | Nguy cơ cao - Cần hỗ trợ ngay |
| `medium` | Vàng | ⚡ | Nguy cơ trung bình - Cần cải thiện |
| `low` | Xanh | ✅ | Nguy cơ thấp - Đang ổn định |

### Usage

```javascript
<RiskBadge
  level={profile?.riskLevel}
  score={profile?.riskScore}
/>
```
