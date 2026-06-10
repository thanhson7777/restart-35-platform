# KẾ HOẠCH XỬ LÝ SKIP KINH NGHIỆM LÀM VIỆC - WORKER PROFILE

> **Dự án:** Nền tảng hỗ trợ tái hòa nhập và lập nghiệp cho lao động trung niên (35+)
> **Tác giả:** Thanh Sơn
> **Cập nhật:** 2026-06-10
> **Trạng thái:** Sắp triển khai
> **Phiên bản:** V1 - Mô tả chi tiết lộ trình thực hiện

---

# MỤC LỤC

1. [Tóm tắt cuộc trao đổi](#1-tóm-tắt-cuộc-trao-đổi)
2. [Phân tích hiện trạng](#2-phân-tích-hiện-trạng)
3. [Lộ trình thực hiện](#3-lộ-trình-thực-hiện)
4. [Nhóm 1 - Frontend: EmploymentForm (Skip)](#4-nhóm-1---frontend-employmentform-skip)
5. [Nhóm 2 - Frontend: AspirationsForm (Warning + Checkbox)](#5-nhóm-2---frontend-aspirationsform-warning--checkbox)
6. [Nhóm 3 - Backend: Model & Controller](#6-nhóm-3---backend-model--controller)
7. [Nhóm 4 - AI-Service: RAG Context](#7-nhóm-4---ai-service-rag-context)
8. [Bảng tổng hợp thay đổi](#8-bảng-tổng-hợp-thay-đổi)

---

# 1. TÓM TẮT CUỘC TRAO ĐỔI

## 1.1 Yêu cầu chính

| STT | Quyết định | Chi tiết |
|-----|------------|----------|
| 1 | Skip kinh nghiệm → Qua sở thích | Flow: skip kinh nghiệm → hiển thị câu hỏi sở thích |
| 2 | Backend lưu `"không có"` + `years=0` | `time = 0`, `status = "không có"`, thêm flag `has_experience: false` |
| 3 | Checkbox "đã hiểu" ở AspirationsForm | Chỉ hiện khi user skip kinh nghiệm, user phải tick mới được tiếp tục |
| 4 | Warning message theo từng case | 4 trường hợp khác nhau: không KN, không ST, thiếu cả 2, không KN + muốn KNG |
| 5 | Nút "Quay lại bổ sung kinh nghiệm" | Khuyến khích user hoàn thiện profile |
| 6 | Checkbox entrepreneurship luôn enable | Không block, chỉ hiện cảnh báo context kèm theo |

## 1.2 Cấu trúc dữ liệu khi skip kinh nghiệm

```javascript
// Structure khi KHÔNG có kinh nghiệm:
employmentHistory = {
  status: "không có",
  experiences: [],
  years_experience: 0,
  has_experience: false,
  is_completed: false,
  skipped_at: "2026-06-10T00:00:00Z"
}

// Structure khi CÓ kinh nghiệm:
employmentHistory = [
  {
    companyName: "Công ty ABC",
    occupation: { uri: "...", code: "...", titleEn: "...", titleVi: "..." },
    duration: 12,
    jobType: "full_time",
    skills: [...]
  }
]
// has_experience = true, is_completed = true
```

## 1.3 4 Case Warning Message

```javascript
const WARNING_MESSAGES = {
  // Case 1: Không có kinh nghiệm + Không có sở thích
  no_experience_no_interests: {
    title: "Hồ sơ chưa hoàn thiện",
    message: `Bạn chưa cung cấp thông tin kinh nghiệm làm việc và sở thích.
Gợi ý việc làm từ AI dựa trên hồ sơ chưa hoàn thiện sẽ không mang lại kết quả như mong đợi.`,
    checkbox: "Tôi đã hiểu và đồng ý tiếp tục với hồ sơ chưa hoàn thiện"
  },

  // Case 2: Không có kinh nghiệm + Có sở thích
  no_experience_has_interests: {
    title: "Hồ sơ còn thiếu thông tin",
    message: `Bạn đã cung cấp sở thích nhưng chưa có kinh nghiệm làm việc.
Gợi ý việc làm từ AI sẽ dựa chủ yếu vào sở thích của bạn, chưa có kinh nghiệm thực tế để đề xuất chính xác hơn.`,
    checkbox: "Tôi đã hiểu và đồng ý tiếp tục"
  },

  // Case 3: Có kinh nghiệm + Không có sở thích
  has_experience_no_interests: {
    title: "Hồ sơ còn thiếu thông tin",
    message: `Bạn đã cung cấp kinh nghiệm làm việc nhưng chưa có sở thích.
Gợi ý việc làm từ AI sẽ dựa chủ yếu vào kinh nghiệm, chưa có sở thích để cá nhân hóa gợi ý.`,
    checkbox: "Tôi đã hiểu và đồng ý tiếp tục"
  },

  // Case 4: Không có kinh nghiệm + entrepreneurship = true
  no_experience_wants_entrepreneurship: {
    title: "⚠️  Cần lưu ý khi chọn khởi nghiệp",
    message: `Với hồ sơ chưa có kinh nghiệm làm việc, khởi nghiệp là lựa chọn khó khăn.
Bạn nên cân nhắc tích lũy kinh nghiệm thực tế, kỹ năng chuyên môn và hiểu biết thị trường trước khi bắt đầu dự án kinh doanh riêng.`,
    checkbox: "Tôi đã hiểu các rủi ro và đồng ý tiếp tục"
  }
};
```

---

# 2. PHÂN TÍCH HIỆN TRẠNG

## 2.1 Frontend

| File | Hiện trạng | Cần thay đổi |
|------|------------|--------------|
| `EmploymentForm.jsx` | Không có option skip | Thêm UI "Có / Không có" |
| `AspirationsForm.jsx` | Không có warning box | Thêm warning + checkbox |
| `WorkerProfilePage.jsx` | 3 step cố định | Có thể thêm step sở thích |
| `profileSlice.js` | Không có `has_experience` | Thêm selector & state |
| `profileAPI.js` | Chưa có complete-check | Thêm endpoint completeness |

## 2.2 Backend

| File | Hiện trạng | Cần thay đổi |
|------|------------|--------------|
| `workerProfileModel.js` | Schema chưa có `status` + flags | Mở rộng schema |
| `workerProfileController.js` | Chưa validate skip case | Thêm validation |
| `workerProfileRoute.js` | Route đã có đủ | Kiểm tra params |

## 2.3 AI-Service

| File | Hiện trạng | Cần thay đổi |
|------|------------|--------------|
| `rag_context_builder.py` | Chưa handle `"không có"` | Thêm branch xử lý |
| `career_recommend.py` | Prompt generic | Thêm 4 case prompts riêng |

---

# 3. LỘ TRÌNH THỰC HIỆN

## Thứ tự ưu tiên

```
1. Backend: Mở rộng schema (nền tảng dữ liệu)
2. Frontend: EmploymentForm (UI skip)
3. Frontend: AspirationsForm (Warning + Checkbox)
4. AI-Service: RAG Context (xử lý "không có")
5. AI-Service: Career Recommend (4 case prompts)
```

---

# 4. NHÓM 1 - FRONTEND: EMPLOYMENTFORM SKIP

## 4.1 Mục tiêu

Thêm option **"Không có" / "Có"** ở đầu `EmploymentForm.jsx` để user chọn skip kinh nghiệm.

## 4.2 File cần sửa

```
📁 frontend/src/components/worker-profile/
└── EmploymentForm.jsx
```

## 4.3 Các bước thực hiện

### Bước 1: Thêm state cho skip mode

```jsx
// Thêm vào đầu component EmploymentForm.jsx

// State mới cho skip mode
const [hasNoExperience, setHasNoExperience] = useState(() => {
  const saved = savedData.employmentHistory;
  // Check nếu là object với status = "không có"
  if (saved && typeof saved === 'object' && saved.status === 'không có') {
    return true;
  }
  // Check nếu là array rỗng hoặc chỉ có object rỗng
  if (Array.isArray(saved) && (saved.length === 0 || (saved.length === 1 && !saved[0].companyName))) {
    return true;
  }
  return false;
});

const [isSkipped, setIsSkipped] = useState(false); // Đã xác nhận skip
```

### Bước 2: Thêm UI "Có / Không có" đầu form

```jsx
// Thêm vào sau Header trong JSX (sau phần <h2> Kinh nghiệm làm việc)

{/* Skip Option - Chỉ hiện khi chưa có dữ liệu */}
{!isSkipped && jobs.length <= 1 && !jobs[0].companyName && (
  <motion.div variants={itemVariants}>
    <div className="mb-6 p-4 bg-muted/50 rounded-xl border border-border">
      <p className="text-sm text-muted-foreground mb-3">
        Bạn đã có kinh nghiệm làm việc chính thức chưa?
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setHasNoExperience(false)}
          className={cn(
            "flex-1 py-2.5 px-4 rounded-lg border-2 text-sm font-semibold transition-all",
            !hasNoExperience
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-primary/50"
          )}
        >
          Có, tôi đã làm việc
        </button>
        <button
          type="button"
          onClick={() => {
            setHasNoExperience(true);
            setIsSkipped(true);
          }}
          className={cn(
            "flex-1 py-2.5 px-4 rounded-lg border-2 text-sm font-semibold transition-all",
            hasNoExperience
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-primary/50"
          )}
        >
          Không có
        </button>
      </div>
    </div>
  </motion.div>
)}
```

### Bước 3: Cập nhật handleSubmit để lưu skip data

```jsx
// Trong EmploymentForm.jsx - sửa handleSubmit

const handleSubmit = async (e) => {
  e.preventDefault();

  // Validate: nếu có job nào có dữ liệu thì duration > 0 là tốt, không thì cũng ok (all optional)
  const hasFilledJob = jobs.some(
    (j) => j.companyName || j.position || j.description || j.jobType
  );
  const hasDurationWarning = jobs.some(
    (j) => (j.companyName || j.position) && j.duration === 0
  );

  if (hasDurationWarning) {
    toast.error('Vui lòng chọn thời gian làm việc cho công việc đã nhập.');
    return;
  }

  if (autosaveTimerRef.current) {
    clearTimeout(autosaveTimerRef.current);
  }

  setIsSubmitting(true);

  try {
    // Sync to Redux
    dispatch(updateFormData({ step: STEP_NUMBER, data: jobs }));

    // XỬ LÝ SKIP - Khi user chọn "Không có"
    let payloadData = jobs;
    
    if (isSkipped || (hasNoExperience && !hasFilledJob)) {
      // Lưu data skip: object với status = "không có"
      payloadData = {
        status: "không có",
        experiences: [],
        years_experience: 0,
        has_experience: false,
        is_completed: false,
        skipped_at: new Date().toISOString()
      };
      
      // Cập nhật Redux với data skip
      dispatch(updateFormData({ 
        step: STEP_NUMBER, 
        data: { 
          status: "không có",
          has_experience: false,
          is_completed: false
        } 
      }));
    }

    // Save to backend
    const result = await dispatch(saveStep({ step: STEP_NUMBER, data: payloadData }));

    if (saveStep.fulfilled.match(result)) {
      // Clear career path cache
      dispatch(clearCareerPath());
      dispatch(clearRAGRecommendation());
      dispatch(clearStartupIdeas());

      invalidateCareerPathCacheAPI().catch(err => {
        console.error('[EmploymentForm] Failed to invalidate career path cache:', err);
      });
      invalidateRAGCacheAPI().catch(err => {
        console.error('[EmploymentForm] Failed to invalidate RAG cache:', err);
      });

      // Advance to step 3 (Barriers) - hoặc nhảy sang step sở thích nếu có
      dispatch(setCurrentStep(STEP_NUMBER + 1));
      
      if (isSkipped || (hasNoExperience && !hasFilledJob)) {
        toast.success('Đã lưu thông tin - Bạn chưa có kinh nghiệm làm việc!');
      } else {
        toast.success('Đã lưu kinh nghiệm làm việc!');
      }
      
      onNext?.();
    } else {
      toast.error(typeof result.payload === 'string' ? result.payload : result.payload?.message || 'Lưu thất bại. Vui lòng thử lại.');
    }
  } catch (err) {
    toast.error('Đã xảy ra lỗi. Vui lòng thử lại.');
  } finally {
    setIsSubmitting(false);
  }
}
```

### Bước 4: Cập nhật nút submit

```jsx
// Thêm logic disable nếu chưa chọn có/không
const canSubmit = hasNoExperience !== null;

// Trong nút submit
<Button
  type="button"
  onClick={handleSubmit}
  isLoading={isSubmitting}
  size="xl"
  className="w-full"
  disabled={!canSubmit}
>
  {hasNoExperience ? 'Tiếp tục (Không có kinh nghiệm)' : 'Tiếp tục'}
  <svg className="w-4 h-4 ml-2" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd"/>
  </svg>
</Button>
```

### Bước 5: Thêm nút quay lại sửa (undo skip)

```jsx
// Thêm sau UI "Có / Không có" - chỉ hiện khi đã skip
{isSkipped && (
  <motion.div variants={itemVariants} className="mb-4">
    <button
      type="button"
      onClick={() => {
        setIsSkipped(false);
        setHasNoExperience(false);
        setJobs([createEmptyJob()]);
      }}
      className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
    >
      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd"/>
      </svg>
      Quay lại để nhập kinh nghiệm
    </button>
  </motion.div>
)}
```

## 4.4 Chi phí thực hiện

| Task | Thời gian |
|------|-----------|
| Thêm state & UI Có/Không | 1 giờ |
| Cập nhật handleSubmit | 30 phút |
| Test flow skip | 30 phút |
| **Tổng** | **~2 giờ** |

---

# 5. NHÓM 2 - FRONTEND: ASPIRATIONSFORM WARNING + CHECKBOX

## 5.1 Mục tiêu

Thêm **warning box + checkbox** ở cuối `AspirationsForm.jsx` để:
- Hiển thị cảnh báo khi profile chưa hoàn thiện
- Yêu cầu user tick checkbox trước khi tiếp tục
- Disable nút "Hoàn thành hồ sơ" nếu chưa tick

## 5.2 File cần sửa

```
📁 frontend/src/components/worker-profile/
└── AspirationsForm.jsx
```

## 5.3 Các bước thực hiện

### Bước 1: Thêm state và import

```jsx
// Thêm import AlertTriangle (hoặc dùng lucide đã có)
import { MapPin, Lightbulb, Sparkles, RefreshCw, Loader2, AlertTriangle, RotateCcw } from 'lucide-react';

// Thêm state cho agreement checkbox
const [agreedToIncompleteProfile, setAgreedToIncompleteProfile] = useState(false);
```

### Bước 2: Thêm helper function check profile completeness

```jsx
// Thêm vào đầu component AspirationsForm

// Helper check profile có kinh nghiệm không
const hasExperience = () => {
  const empHistory = savedData.employmentHistory;
  
  // Trường hợp 1: Object với status = "không có"
  if (empHistory && typeof empHistory === 'object' && empHistory.status === 'không có') {
    return false;
  }
  
  // Trường hợp 2: Array rỗng hoặc object rỗng
  if (Array.isArray(empHistory)) {
    if (empHistory.length === 0) return false;
    // Check nếu item đầu tiên là object rỗng
    const firstItem = empHistory[0];
    if (!firstItem || Object.keys(firstItem).every(k => !firstItem[k])) {
      return false;
    }
  }
  
  // Trường hợp 3: Object không có key nào
  if (empHistory && typeof empHistory === 'object' && Object.keys(empHistory).length === 0) {
    return false;
  }
  
  return true;
};

// Helper check profile completeness
const isProfileComplete = () => {
  return hasExperience();
};

// Xác định case warning
const getWarningCase = () => {
  const exp = hasExperience();
  const int = savedData.interests && 
    savedData.interests !== "không có" && 
    (savedData.interests.length > 0 || 
     (savedData.interests.interests && savedData.interests.interests.length > 0));
  const wantsKNG = aspirations.wantsToStartBusiness;
  
  if (!exp && !int) return 'no_experience_no_interests';
  if (!exp && int) return 'no_experience_has_interests';
  if (exp && !int) return 'has_experience_no_interests';
  if (!exp && wantsKNG) return 'no_experience_wants_entrepreneurship';
  return null;
};
```

### Bước 3: Thêm constants cho warning messages

```jsx
// Thêm constants WARNING_MESSAGES vào đầu file (ngoài component)
const WARNING_MESSAGES = {
  no_experience_no_interests: {
    title: "Hồ sơ chưa hoàn thiện",
    message: `Bạn chưa cung cấp thông tin kinh nghiệm làm việc và sở thích. Gợi ý việc làm từ AI dựa trên hồ sơ chưa hoàn thiện sẽ không mang lại kết quả như mong đợi.`,
    checkbox: "Tôi đã hiểu và đồng ý tiếp tục với hồ sơ chưa hoàn thiện",
    severity: "high"
  },

  no_experience_has_interests: {
    title: "Hồ sơ còn thiếu thông tin",
    message: `Bạn đã cung cấp sở thích nhưng chưa có kinh nghiệm làm việc. Gợi ý việc làm từ AI sẽ dựa chủ yếu vào sở thích của bạn, chưa có kinh nghiệm thực tế để đề xuất chính xác hơn.`,
    checkbox: "Tôi đã hiểu và đồng ý tiếp tục",
    severity: "medium"
  },

  has_experience_no_interests: {
    title: "Hồ sơ còn thiếu thông tin",
    message: `Bạn đã cung cấp kinh nghiệm làm việc nhưng chưa có sở thích. Gợi ý việc làm từ AI sẽ dựa chủ yếu vào kinh nghiệm, chưa có sở thích để cá nhân hóa gợi ý.`,
    checkbox: "Tôi đã hiểu và đồng ý tiếp tục",
    severity: "medium"
  },

  no_experience_wants_entrepreneurship: {
    title: "⚠️  Cần lưu ý khi chọn khởi nghiệp",
    message: `Với hồ sơ chưa có kinh nghiệm làm việc, khởi nghiệp là lựa chọn khó khăn. Bạn nên cân nhắc tích lũy kinh nghiệm thực tế, kỹ năng chuyên môn và hiểu biết thị trường trước khi bắt đầu dự án kinh doanh riêng.`,
    checkbox: "Tôi đã hiểu các rủi ro và đồng ý tiếp tục",
    severity: "high"
  }
};
```

### Bước 4: Thêm warning box component

```jsx
// Thêm component IncompleteProfileWarning vào JSX
// Đặt trước phần <form> hoặc sau form trước phần Submit Buttons

const IncompleteProfileWarning = ({ warningCase, onBackToAddExperience }) => {
  const config = WARNING_MESSAGES[warningCase];
  
  if (!config) return null;
  
  const isHighSeverity = config.severity === 'high';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`
        rounded-2xl p-6 mb-6
        ${isHighSeverity 
          ? 'bg-amber-50 border-2 border-amber-400' 
          : 'bg-yellow-50 border-2 border-yellow-300'
        }
      `}
    >
      <div className="flex gap-4">
        {/* Icon */}
        <div className={`
          flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center
          ${isHighSeverity ? 'bg-amber-100' : 'bg-yellow-100'}
        `}>
          <AlertTriangle 
            size={24} 
            className={isHighSeverity ? 'text-amber-600' : 'text-yellow-600'}
          />
        </div>
        
        {/* Content */}
        <div className="flex-1">
          <h3 className={`
            font-bold text-base mb-2
            ${isHighSeverity ? 'text-amber-800' : 'text-yellow-800'}
          `}>
            {config.title}
          </h3>
          
          <p className={`
            text-sm leading-relaxed mb-4
            ${isHighSeverity ? 'text-amber-700' : 'text-yellow-700'}
          `}>
            {config.message}
          </p>
          
          {/* Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={agreedToIncompleteProfile}
              onChange={(e) => setAgreedToIncompleteProfile(e.target.checked)}
              className="w-5 h-5 mt-0.5 rounded border-2 border-amber-400 
                         text-amber-600 focus:ring-amber-500 cursor-pointer"
            />
            <span className={`
              text-sm leading-relaxed
              ${isHighSeverity ? 'text-amber-700' : 'text-yellow-700'}
            `}>
              {config.checkbox}
            </span>
          </label>
          
          {/* Nút quay lại bổ sung */}
          {onBackToAddExperience && (
            <button
              type="button"
              onClick={onBackToAddExperience}
              className={`
                flex items-center gap-2 text-sm font-semibold
                px-4 py-2 rounded-lg border-2 transition-all
                ${isHighSeverity 
                  ? 'border-amber-500 text-amber-700 hover:bg-amber-100' 
                  : 'border-yellow-500 text-yellow-700 hover:bg-yellow-100'
                }
              `}
            >
              <RotateCcw size={16} />
              Quay lại bổ sung kinh nghiệm
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
```

### Bước 5: Thêm warning box vào JSX (trước form submit)

```jsx
// Trong AspirationsForm.jsx - thêm vào trước <form>

{/* WARNING BOX - Chỉ hiện khi profile chưa hoàn thiện */}
{warningCase && !isProfileComplete() && (
  <IncompleteProfileWarning 
    warningCase={warningCase}
    onBackToAddExperience={() => {
      // Navigate về step 1 (Employment)
      dispatch(setCurrentStep(1));
    }}
  />
)}
```

### Bước 6: Cập nhật validate và disable button

```jsx
// Sửa validate() trong AspirationsForm

const validate = () => {
  const newErrors = {};

  // Skills validation (optional but max 10)
  if (aspirations.skills?.length > 10) {
    newErrors.skills = 'Tối đa 10 kỹ năng';
  }

  // Salary validation
  if (aspirations.targetSalary > 1000000000) {
    newErrors.targetSalary = 'Lương không quá 1 tỷ đồng';
  }

  // ⚠️  PROFILE COMPLETENESS CHECK - Ngăn submit nếu chưa tick checkbox
  if (!isProfileComplete() && !agreedToIncompleteProfile) {
    newErrors.profileIncomplete = 'Vui lòng đồng ý tiếp tục với hồ sơ chưa hoàn thiện';
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

### Bước 7: Cập nhật nút Hoàn thành hồ sơ

```jsx
// Sửa nút submit - disable khi profile incomplete và chưa tick

const canSubmit = isProfileComplete() || agreedToIncompleteProfile;

// Nút Hoàn thành hồ sơ
<Button
  type="submit"
  isLoading={isSubmitting || isCompleting}
  disabled={!canSubmit || isCompleted}
  size="xl"
  className={cn(
    "w-full transition-all duration-300",
    !canSubmit && "opacity-50 cursor-not-allowed",
    isCompleted && "opacity-50 cursor-not-allowed"
  )}
>
  <Sparkles size={18} className="mr-2" />
  {canSubmit ? 'Hoàn thành hồ sơ' : 'Vui lòng đồng ý với điều kiện'}
  {!isCompleted && (
    <svg className="w-4 h-4 ml-2" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
    </svg>
  )}
</Button>
```

### Bước 8: Cập nhật handleSubmit để lưu agreement

```jsx
// Thêm vào aspirations data khi submit nếu đã tick agreement

const handleSubmit = async (e) => {
  e.preventDefault();

  if (!validate()) {
    const firstErrorField = Object.keys(errors)[0];
    if (firstErrorField && formRef.current) {
      const errorElement = formRef.current.querySelector(`[data-error="${firstErrorField}"]`);
      errorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  if (autosaveTimerRef.current) {
    clearTimeout(autosaveTimerRef.current);
  }

  setIsSubmitting(true);

  try {
    // ⚠️  THÊM: Nếu user đã tick checkbox, lưu vào aspirations
    const finalAspirations = {
      ...aspirations,
      ...(!isProfileComplete() && agreedToIncompleteProfile ? {
        agreed_to_incomplete_profile: true,
        incomplete_profile_agreed_at: new Date().toISOString()
      } : {})
    };

    // Sync to Redux
    dispatch(updateFormData({ step: STEP_NUMBER, data: finalAspirations }));

    // Auto-save aspirations data
    await dispatch(autosave({ step: STEP_NUMBER, data: finalAspirations }));

    // ... (phần còn lại giữ nguyên)
  } catch (err) {
    toast.error('Đã xảy ra lỗi. Vui lòng thử lại.');
  } finally {
    setIsSubmitting(false);
  }
};
```

## 5.4 Styling

```css
/* AspirationsForm.css hoặc inline styles */

/* Warning box animation */
.incomplete-profile-warning {
  animation: slideDown 0.4s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Checkbox styling */
input[type="checkbox"]:checked {
  accent-color: #D97706;
}

/* Warning text */
.warning-high {
  background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
  border: 2px solid #F59E0B;
}

.warning-medium {
  background: linear-gradient(135deg, #FEF9C3 0%, #FEF08A 100%);
  border: 2px solid #EAB308;
}
```

## 5.5 Chi phí thực hiện

| Task | Thời gian |
|------|-----------|
| Thêm state & helper functions | 30 phút |
| Thêm warning box component | 1 giờ |
| Tích hợp vào JSX | 30 phút |
| Cập nhật validate & disable | 30 phút |
| Test flow | 30 phút |
| **Tổng** | **~3 giờ** |

---

# 6. NHÓM 3 - BACKEND: MODEL & CONTROLLER

## 6.1 Mục tiêu

Mở rộng `workerProfileModel.js` để hỗ trợ lưu trữ skip data với đầy đủ flags.

## 6.2 File cần sửa

```
📁 backend/src/models/
└── workerProfileModel.js

📁 backend/src/validations/
└── workerProfileValidation.js

📁 backend/src/controllers/
└── workerProfileController.js (kiểm tra, không sửa nếu không cần)
```

## 6.3 Các bước thực hiện

### Bước 1: Mở rộng schema trong workerProfileModel.js

```javascript
// Sửa phần WORKER_PROFILE_COLLECTION_SCHEMA trong workerProfileModel.js
// Thay đổi phần employmentHistory để hỗ trợ cả 2 format

// Schema mới cho employmentHistory - hỗ trợ skip
const EMPLOYMENT_HISTORY_SCHEMA = Joi.alternatives().try(
  // Format khi CÓ kinh nghiệm: array of jobs
  Joi.array().items(
    Joi.object({
      companyName: Joi.string().allow(''),
      occupation: Joi.alternatives().try(
        OCCUPATION_SCHEMA,
        Joi.string().allow('')
      ),
      position: Joi.string().allow(''),
      duration: Joi.number().integer().min(0),
      jobType: Joi.string().valid(...Object.values(JOB_TYPES)),
      skills: Joi.array().items(
        Joi.alternatives().try(
          SKILL_SCHEMA,
          Joi.string()
        )
      ),
      industry: Joi.string().allow('')
    })
  ).max(MAX_EMPLOYMENT_HISTORY),
  
  // Format khi KHÔNG CÓ kinh nghiệm: object với status
  Joi.object({
    status: Joi.string().valid('không có').required(),
    experiences: Joi.array().items(Joi.object()).default([]),
    years_experience: Joi.number().integer().min(0).default(0),
    has_experience: Joi.boolean().default(false),
    is_completed: Joi.boolean().default(false),
    skipped_at: Joi.date().timestamp('javascript').default(Date.now())
  })
);

// Thay thế trong WORKER_PROFILE_COLLECTION_SCHEMA
employmentHistory: EMPLOYMENT_HISTORY_SCHEMA,
```

### Bước 2: Thêm validation cho skip case

```javascript
// Trong workerProfileValidation.js (tạo mới hoặc sửa)

const validateEmploymentHistorySkip = (data) => {
  // Nếu là object với status = "không có"
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    if (data.status === 'không có') {
      return {
        status: 'không có',
        experiences: [],
        years_experience: 0,
        has_experience: false,
        is_completed: false,
        skipped_at: Date.now()
      };
    }
  }
  
  // Nếu là array rỗng hoặc array với object rỗng
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return {
        status: 'không có',
        experiences: [],
        years_experience: 0,
        has_experience: false,
        is_completed: false,
        skipped_at: Date.now()
      };
    }
  }
  
  // Giữ nguyên nếu là data bình thường
  return data;
};
```

### Bước 3: Cập nhật service layer (workerProfileService.js)

```javascript
// Kiểm tra workerProfileService.js - thêm logic xử lý skip

// Nếu chưa có service, tạo mới hoặc kiểm tra logic trong controller
// Controller đã đủ xử lý, service layer thường không cần sửa
```

### Bước 4: Thêm API endpoint kiểm tra profile completeness (tùy chọn)

```javascript
// Thêm vào backend/src/routes/v1/workerProfileRoute.js

// GET /v1/worker-profiles/completeness - Kiểm tra mức độ hoàn thiện
router.get(
  '/completeness',
  isAuthenticated,
  authorizeRoles('worker'),
  async (req, res, next) => {
    try {
      const userId = req.user._id.toString();
      const profile = await workerProfileService.getMyProfile(userId);
      
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Hồ sơ không tồn tại'
        });
      }
      
      // Check completeness
      const employmentHistory = profile.employmentHistory;
      let hasExperience = true;
      let hasInterests = true;
      
      if (employmentHistory) {
        if (typeof employmentHistory === 'object' && !Array.isArray(employmentHistory)) {
          // Object với status
          hasExperience = employmentHistory.status !== 'không có';
        } else if (Array.isArray(employmentHistory)) {
          hasExperience = employmentHistory.length > 0 && 
            employmentHistory.some(j => j.companyName || j.position);
        }
      } else {
        hasExperience = false;
      }
      
      if (profile.interests) {
        hasInterests = profile.interests !== 'không có' && 
          (profile.interests.length > 0 || 
           (profile.interests.interests && profile.interests.interests.length > 0));
      } else {
        hasInterests = false;
      }
      
      const isComplete = hasExperience && hasInterests;
      
      // Generate warnings
      const warnings = [];
      if (!hasExperience) {
        warnings.push({
          field: 'employmentHistory',
          severity: 'high',
          message: 'Hồ sơ chưa hoàn thiện. Gợi ý việc làm từ AI sẽ không mang lại kết quả như mong đợi.'
        });
      }
      if (!hasInterests) {
        warnings.push({
          field: 'interests',
          severity: 'medium',
          message: 'Bạn chưa cung cấp sở thích. Gợi ý sẽ dựa vào kinh nghiệm và thông tin khác.'
        });
      }
      
      res.status(200).json({
        success: true,
        data: {
          is_complete: isComplete,
          has_experience: hasExperience,
          has_interests: hasInterests,
          missing_fields: [
            ...(!hasExperience ? ['employmentHistory'] : []),
            ...(!hasInterests ? ['interests'] : [])
          ],
          warnings: warnings,
          completeness_score: (hasExperience ? 50 : 0) + (hasInterests ? 50 : 0)
        }
      });
    } catch (error) {
      next(error);
    }
  }
);
```

## 6.4 Chi phí thực hiện

| Task | Thời gian |
|------|-----------|
| Mở rộng schema model | 1 giờ |
| Thêm validation | 30 phút |
| Thêm completeness API | 1 giờ |
| Test API | 30 phút |
| **Tổng** | **~3 giờ** |

---

# 7. NHÓM 4 - AI-SERVICE: RAG CONTEXT

## 7.1 Mục tiêu

Cập nhật `rag_context_builder.py` và `career_recommend.py` để xử lý trường hợp user không có kinh nghiệm làm việc.

## 7.2 File cần sửa

```
📁 ai-service/services/
└── rag_context_builder.py

📁 ai-service/prompts/
└── career_recommend.py
```

## 7.3 Các bước thực hiện

### Bước 1: Cập nhật RAG Context Builder

```python
# Trong rag_context_builder.py - thêm method mới hoặc sửa build_profile_context

def build_employment_context(self, employment_history):
    """
    Build context từ employment history.
    Xử lý cả 2 trường hợp: có kinh nghiệm và không có kinh nghiệm.
    """
    context_parts = []
    
    # Trường hợp 1: employment_history là object với status = "không có"
    if isinstance(employment_history, dict):
        if employment_history.get('status') == 'không có':
            context_parts.append("KINH NGHIỆM LÀM VIỆC: CHƯA CÓ")
            context_parts.append("- Người dùng CHƯA CÓ kinh nghiệm làm việc chính thức.")
            context_parts.append("- Đây là người mới bắt đầu, chưa từng làm việc chính thức.")
            context_parts.append("- Tổng số năm kinh nghiệm: 0 năm.")
            context_parts.append("- Gợi ý công việc cần phù hợp với người mới, chưa có kinh nghiệm.")
            
            if employment_history.get('skipped_at'):
                context_parts.append(f"- Người dùng đã chủ động không cung cấp thông tin kinh nghiệm (đã skip).")
            
            return '\n'.join(context_parts)
        else:
            # Object nhưng không phải skip - lấy thông tin bình thường
            return self._build_experience_context_from_list([employment_history])
    
    # Trường hợp 2: employment_history là list
    if isinstance(employment_history, list):
        if len(employment_history) == 0:
            context_parts.append("KINH NGHIỆM LÀM VIỆC: CHƯA CÓ")
            context_parts.append("- Người dùng CHƯA CÓ kinh nghiệm làm việc chính thức.")
            context_parts.append("- Tổng số năm kinh nghiệm: 0 năm.")
            return '\n'.join(context_parts)
        
        # Lọc bỏ các job rỗng
        valid_jobs = [j for j in employment_history if j and (j.get('companyName') or j.get('position') or j.get('occupation'))]
        
        if len(valid_jobs) == 0:
            context_parts.append("KINH NGHIỆM LÀM VIỆC: CHƯA CÓ")
            context_parts.append("- Người dùng CHƯA CÓ kinh nghiệm làm việc chính thức.")
            context_parts.append("- Tổng số năm kinh nghiệm: 0 năm.")
            return '\n'.join(context_parts)
        
        return self._build_experience_context_from_list(valid_jobs)
    
    # Fallback
    return "Không có thông tin kinh nghiệm làm việc."


def _build_experience_context_from_list(self, experiences):
    """
    Build context từ list of experiences (private method).
    """
    context_parts = []
    
    total_years = sum(exp.get('duration', 0) for exp in experiences if exp)
    
    context_parts.append(f"KINH NGHIỆM LÀM VIỆC: CÓ ({len(experiences)} công việc, {total_years} năm)")
    
    for i, exp in enumerate(experiences, 1):
        if not exp:
            continue
            
        context_parts.append(f"\n--- Công việc {i} ---")
        
        if exp.get('companyName'):
            context_parts.append(f"- Công ty: {exp['companyName']}")
        
        # Occupation (ESCO format)
        occupation = exp.get('occupation')
        if occupation:
            if isinstance(occupation, dict):
                title = occupation.get('titleVi') or occupation.get('titleEn', 'N/A')
            else:
                title = occupation
            context_parts.append(f"- Vị trí: {title}")
        elif exp.get('position'):
            context_parts.append(f"- Vị trí: {exp['position']}")
        
        duration = exp.get('duration', 0)
        context_parts.append(f"- Thời gian: {duration} tháng")
        
        if exp.get('skills'):
            skills = exp['skills']
            if isinstance(skills, list):
                skills_text = ', '.join([s.get('titleVi', s) if isinstance(s, dict) else s for s in skills])
            else:
                skills_text = str(skills)
            context_parts.append(f"- Kỹ năng: {skills_text}")
    
    return '\n'.join(context_parts)


def build_full_profile_context(self, profile):
    """
    Build complete profile context cho RAG, xử lý cả có/không kinh nghiệm.
    """
    context_parts = []
    
    # Basic Info
    basic_info = profile.get('basicInfo', {})
    if basic_info:
        context_parts.append("THÔNG TIN CƠ BẢN:")
        if basic_info.get('age'):
            context_parts.append(f"- Tuổi: {basic_info['age']} (lao động trung niên)")
        if basic_info.get('gender'):
            context_parts.append(f"- Giới tính: {basic_info['gender']}")
        if basic_info.get('province'):
            context_parts.append(f"- Tỉnh/Thành: {basic_info['province']}")
        if basic_info.get('education'):
            context_parts.append(f"- Trình độ học vấn: {basic_info['education']}")
    
    # Employment History - sử dụng method mới
    employment_history = profile.get('employmentHistory')
    if employment_history:
        emp_context = self.build_employment_context(employment_history)
        context_parts.append(f"\n{emp_context}")
    
    # Aspirations
    aspirations = profile.get('aspirations', {})
    if aspirations:
        context_parts.append("\nNGUYỆN VỌNG:")
        if aspirations.get('targetJob'):
            target = aspirations['targetJob']
            if isinstance(target, dict):
                title = target.get('titleVi') or target.get('titleEn', 'N/A')
            else:
                title = target
            context_parts.append(f"- Công việc mong muốn: {title}")
        if aspirations.get('targetSalary'):
            context_parts.append(f"- Mức lương kỳ vọng: {aspirations['targetSalary']} VND")
        if aspirations.get('targetProvince'):
            context_parts.append(f"- Địa điểm: {aspirations['targetProvince']}")
        if aspirations.get('wantsToStartBusiness'):
            context_parts.append("- Mong muốn: Khởi nghiệp/Tự tạo việc làm")
    
    return '\n'.join(context_parts)
```

### Bước 2: Cập nhật Career Recommend Prompt

```python
# Trong career_recommend.py - thêm 4 case prompts riêng biệt

# Thêm constants cho các case
class ProfileCase:
    NO_EXPERIENCE_NO_INTERESTS = "no_experience_no_interests"
    NO_EXPERIENCE_HAS_INTERESTS = "no_experience_has_interests"
    HAS_EXPERIENCE_NO_INTERESTS = "has_experience_no_interests"
    NO_EXPERIENCE_WANTS_ENTREPRENEURSHIP = "no_experience_wants_entrepreneurship"
    COMPLETE = "complete"


def get_case_prompt(case, profile_context):
    """
    Get specialized prompt based on profile case.
    """
    
    prompts = {
        ProfileCase.NO_EXPERIENCE_NO_INTERESTS: f"""
## TRƯỜNG HỢP ĐẶC BIỆT: PROFILE CHƯA HOÀN THIỆN

Bạn đang gợi ý việc làm cho người dùng với hồ sơ CHƯA HOÀN THIỆN:
- Không có kinh nghiệm làm việc chính thức
- Không có thông tin sở thích

### Hồ sơ người dùng:
{profile_context}

### HƯỚNG DẪN ĐẶC BIỆT:
1. **Đây là người mới hoàn toàn** - chưa có kinh nghiệm, chưa biết mình thích gì
2. **Gợi ý cần CONSERVATIVE và THỰC TẾ:**
   - Đề xuất công việc entry-level, dễ xin việc
   - Ưu tiên công việc không yêu cầu kinh nghiệm (lao động phổ thông, bán lẻ, phục vụ...)
   - Gợi ý cách tích lũy kinh nghiệm đầu tiên
3. **KHÔNG đề xuất công việc yêu cầu 1-2 năm kinh nghiệm** trừ khi có lý do đặc biệt
4. **Cảnh báo user:** Gợi ý dựa trên hồ sơ chưa hoàn thiện, chất lượng có thể không cao
5. **Khuyến khích user hoàn thiện hồ sơ** để nhận gợi ý chính xác hơn

### FORMAT TRẢ LỜI:
- Job Title
- Tại sao phù hợp (dù không có kinh nghiệm)
- Cách xin việc cho người mới
- Lưu ý quan trọng

""",

        ProfileCase.NO_EXPERIENCE_HAS_INTERESTS: f"""
## TRƯỜNG HỢP: NGƯỜI MỚI CÓ SỞ THÍCH

Bạn đang gợi ý việc làm cho người dùng với:
- Không có kinh nghiệm làm việc chính thức
- Có thông tin sở thích

### Hồ sơ người dùng:
{profile_context}

### HƯỚNG DẪN ĐẶC BIỆT:
1. **Sở thích là PRIMARY SIGNAL** - dùng sở thích để gợi ý thay vì kinh nghiệm
2. **Gợi ý cần sáng tạo nhưng THỰC TẾ:**
   - Tìm công việc liên quan đến sở thích
   - Ưu tiên công việc không yêu cầu kinh nghiệm trong lĩnh vực sở thích
   - Gợi ý cách bắt đầu từ sở thích để phát triển sự nghiệp
3. **Kết hợp sở thích + thực tế thị trường lao động Việt Nam**
4. **Cảnh báo nhẹ:** Gợi ý dựa chủ yếu vào sở thích, chưa có kinh nghiệm để validate

### FORMAT TRẢ LỜI:
- Job Title
- Liên quan đến sở thích như thế nào
- Cách xin việc cho người mới trong lĩnh vực này
- Hành trình phát triển từ sở thích

""",

        ProfileCase.HAS_EXPERIENCE_NO_INTERESTS: f"""
## TRƯỜNG HỢP: CÓ KINH NGHIỆM, CẦN TÌM DIRECTION

Bạn đang gợi ý việc làm cho người dùng với:
- Có kinh nghiệm làm việc
- Chưa có thông tin sở thích

### Hồ sơ người dùng:
{profile_context}

### HƯỚNG DẪN ĐẶC BIỆT:
1. **Kinh nghiệm là PRIMARY SIGNAL** - dùng kinh nghiệm để gợi ý
2. **Gợi ý dựa trên:**
   - Nghề nghiệp đã làm trước đây
   - Kỹ năng đã tích lũy
   - Định hướng tương lai
3. **Cố gắng INFER sở thích** từ kinh nghiệm (nếu có pattern)
4. **Gợi ý cách KHÁM PHÁ sở thích** để cá nhân hóa hơn

""",

        ProfileCase.NO_EXPERIENCE_WANTS_ENTREPRENEURSHIP: f"""
## ⚠️  CẢNH BÁO: NGƯỜI MỚI MUỐN KHỞI NGHIỆP

Bạn đang gợi ý cho người dùng với:
- Không có kinh nghiệm làm việc chính thức
- Mong muốn khởi nghiệp/tự tạo việc làm

### Hồ sơ người dùng:
{profile_context}

### HƯỚNG DẪN NGHIÊM NGẶT:
1. **KHÔNG KHUYẾN KHÍCH KHỞI NGHIỆP LÚC NÀY**
2. **Gợi ý cần CÂN BẰNG:**
   - Thừa nhận khát vọng khởi nghiệp là TỐT
   - Nhưng với 0 kinh nghiệm, rủi ro rất CAO
   - Gợi ý cách CHUẨN BỊ để khởi nghiệp thành công trong tương lai
3. **Cần có trong gợi ý:**
   - Tại sao nên có kinh nghiệm trước khi khởi nghiệp
   - Cách tích lũy kinh nghiệm phù hợp với mục tiêu khởi nghiệp
   - Ví dụ: Làm trong ngành muốn khởi nghiệp trước 1-2 năm
4. **Gợi ý VIỆC LÀM PHÙ HỢP** thay vì khởi nghiệp (để tích lũy)
5. **Nhắc nhở:** Khởi nghiệp cần: kỹ năng + hiểu biết thị trường + nguồn lực tài chính

### FORMAT TRẢ LỜI:
- Cảnh báo rõ ràng (nhưng không phủ nhận khát vọng)
- Gợi ý công việc để tích lũp
- Lộ trình chuẩn bị cho khởi nghiệp (3-5 năm)
- Lời khuyên thực tế

""",

        ProfileCase.COMPLETE: f"""
## TRƯỜNG HỢP BÌNH THƯỜNG: PROFILE HOÀN CHỈNH

Hồ sơ người dùng đã hoàn thiện đầy đủ.

### Hồ sơ người dùng:
{profile_context}

### HƯỚNG DẪN:
Gợi ý bình thường dựa trên đầy đủ thông tin:
- Kinh nghiệm
- Sở thích
- Nguyện vọng
- Kỹ năng

""",
    }
    
    return prompts.get(case, prompts[ProfileCase.COMPLETE])


def determine_profile_case(profile):
    """
    Xác định case của profile để chọn prompt phù hợp.
    """
    # Check employment history
    employment_history = profile.get('employmentHistory', [])
    has_experience = False
    
    if isinstance(employment_history, dict):
        has_experience = employment_history.get('status') != 'không có'
    elif isinstance(employment_history, list):
        valid_jobs = [j for j in employment_history if j and (j.get('companyName') or j.get('position') or j.get('occupation'))]
        has_experience = len(valid_jobs) > 0
    
    # Check interests
    interests = profile.get('interests', [])
    has_interests = False
    
    if isinstance(interests, str):
        has_interests = interests != 'không có' and len(interests) > 0
    elif isinstance(interests, list):
        has_interests = len(interests) > 0
    elif isinstance(interests, dict):
        has_interests = len(interests.get('interests', [])) > 0
    
    # Check entrepreneurship
    aspirations = profile.get('aspirations', {})
    wants_entrepreneurship = aspirations.get('wantsToStartBusiness', False)
    
    # Determine case
    if not has_experience and not has_interests:
        return ProfileCase.NO_EXPERIENCE_NO_INTERESTS
    if not has_experience and has_interests:
        if wants_entrepreneurship:
            return ProfileCase.NO_EXPERIENCE_WANTS_ENTREPRENEURSHIP
        return ProfileCase.NO_EXPERIENCE_HAS_INTERESTS
    if has_experience and not has_interests:
        return ProfileCase.HAS_EXPERIENCE_NO_INTERESTS
    
    return ProfileCase.COMPLETE
```

### Bước 3: Cập nhật main career recommend flow

```python
# Trong career_recommend.py - cập nhật main function để sử dụng case prompts

# Thêm vào cuối file hoặc sửa main recommend function

async def recommend_careers_with_case_handling(profile, user_query=None):
    """
    Career recommendation với xử lý case riêng biệt.
    """
    # Xác định case
    profile_case = determine_profile_case(profile)
    
    # Build context
    rag_builder = RAGContextBuilder()
    rag_builder._ensure_init()
    profile_context = rag_builder.build_full_profile_context(profile)
    
    # Lấy specialized prompt
    case_prompt = get_case_prompt(profile_case, profile_context)
    
    # Call LLM với specialized prompt
    # ... (call LLM code)
    
    # Trả về response + metadata về case
    return {
        "recommendations": [...],  # job recommendations
        "case_used": profile_case,
        "case_metadata": {
            "has_experience": profile_case not in [
                ProfileCase.NO_EXPERIENCE_NO_INTERESTS,
                ProfileCase.NO_EXPERIENCE_HAS_INTERESTS,
                ProfileCase.NO_EXPERIENCE_WANTS_ENTREPRENEURSHIP
            ],
            "has_interests": profile_case not in [
                ProfileCase.NO_EXPERIENCE_NO_INTERESTS
            ],
            "profile_completeness_score": get_completeness_score(profile_case),
            "warnings": get_case_warnings(profile_case)
        }
    }


def get_completeness_score(case):
    """Tính điểm hoàn thiện profile dựa trên case."""
    scores = {
        ProfileCase.COMPLETE: 100,
        ProfileCase.HAS_EXPERIENCE_NO_INTERESTS: 70,
        ProfileCase.NO_EXPERIENCE_HAS_INTERESTS: 60,
        ProfileCase.NO_EXPERIENCE_NO_INTERESTS: 30,
        ProfileCase.NO_EXPERIENCE_WANTS_ENTREPRENEURSHIP: 35
    }
    return scores.get(case, 50)


def get_case_warnings(case):
    """Get warnings cho từng case."""
    warnings = {
        ProfileCase.COMPLETE: [],
        ProfileCase.HAS_EXPERIENCE_NO_INTERESTS: [
            "Gợi ý chưa cá nhân hóa 100% vì thiếu thông tin sở thích"
        ],
        ProfileCase.NO_EXPERIENCE_HAS_INTERESTS: [
            "Gợi ý dựa chủ yếu vào sở thích, chưa có kinh nghiệm để validate"
        ],
        ProfileCase.NO_EXPERIENCE_NO_INTERESTS: [
            "Hồ sơ chưa hoàn thiện, kết quả gợi ý có thể không chính xác",
            "Khuyến nghị: Bổ sung kinh nghiệm và sở thích để cải thiện chất lượng gợi ý"
        ],
        ProfileCase.NO_EXPERIENCE_WANTS_ENTREPRENEURSHIP: [
            "⚠️  Khởi nghiệp với 0 kinh nghiệm có rủi ro rất cao",
            "Khuyến nghị: Tích lũy kinh nghiệm 1-3 năm trước khi khởi nghiệp"
        ]
    }
    return warnings.get(case, [])
```

## 7.4 Chi phí thực hiện

| Task | Thời gian |
|------|-----------|
| Cập nhật RAG context builder | 2 giờ |
| Thêm 4 case prompts | 2 giờ |
| Tích hợp case detection | 1 giờ |
| Test với từng case | 2 giờ |
| **Tổng** | **~7 giờ** |

---

# 8. BẢNG TỔNG HỢP THAY ĐỔI

## 8.1 Thống kê theo nhóm

| Nhóm | Thành phần | File | Thời gian |
|------|-----------|------|-----------|
| 1 | Frontend | `EmploymentForm.jsx` | ~2 giờ |
| 2 | Frontend | `AspirationsForm.jsx` | ~3 giờ |
| 3 | Backend | `workerProfileModel.js`, `workerProfileRoute.js` | ~3 giờ |
| 4 | AI-Service | `rag_context_builder.py`, `career_recommend.py` | ~7 giờ |
| **Tổng** | | | **~15 giờ** |

## 8.2 Bảng chi tiết file changes

### Frontend

| File | Hành động | Chi tiết |
|------|----------|----------|
| `EmploymentForm.jsx` | Sửa | Thêm UI skip, handleSubmit mới, state skip |
| `AspirationsForm.jsx` | Sửa | Thêm warning box, checkbox, validate mới |

### Backend

| File | Hành động | Chi tiết |
|------|----------|----------|
| `workerProfileModel.js` | Sửa | Mở rộng schema employmentHistory |
| `workerProfileRoute.js` | Sửa | Thêm completeness API endpoint |
| `workerProfileValidation.js` | Sửa | Thêm validation skip case |

### AI-Service

| File | Hành động | Chi tiết |
|------|----------|----------|
| `rag_context_builder.py` | Sửa | Thêm `build_employment_context`, `build_full_profile_context` |
| `career_recommend.py` | Sửa | Thêm 4 case prompts, `determine_profile_case`, `get_case_prompt` |

## 8.3 Checklist tiến độ

### Trước khi bắt đầu

- [ ] Backup database (nếu có data production)
- [ ] Tạo branch mới cho feature: `feature/skip-work-experience`

### Nhóm 1: Backend (nền tảng)

- [ ] Mở rộng schema `workerProfileModel.js`
- [ ] Thêm validation trong `workerProfileValidation.js`
- [ ] Thêm completeness API
- [ ] Test API với data skip

### Nhóm 2: Frontend - EmploymentForm

- [ ] Thêm state skip mode
- [ ] Thêm UI "Có / Không có"
- [ ] Cập nhật handleSubmit
- [ ] Test flow skip → Barriers

### Nhóm 3: Frontend - AspirationsForm

- [ ] Thêm helper functions
- [ ] Thêm constants WARNING_MESSAGES
- [ ] Thêm IncompleteProfileWarning component
- [ ] Tích hợp vào JSX
- [ ] Cập nhật validate & disable button
- [ ] Test với từng case

### Nhóm 4: AI-Service

- [ ] Cập nhật RAG context builder
- [ ] Thêm 4 case prompts
- [ ] Tích hợp case detection
- [ ] Test với từng profile case

### Sau khi hoàn thành

- [ ] Test end-to-end flow
- [ ] Review code
- [ ] Merge PR
- [ ] Deploy staging
- [ ] Test production

## 8.4 Test Cases

| Case | Input | Expected Output |
|------|-------|-----------------|
| TC01 | Skip kinh nghiệm, có sở thích | Warning case 2, checkbox enable |
| TC02 | Skip kinh nghiệm, không sở thích | Warning case 1, checkbox enable |
| TC03 | Skip kinh nghiệm, chọn khởi nghiệp | Warning case 4, checkbox enable |
| TC04 | Có kinh nghiệm, không sở thích | Warning case 3, checkbox enable |
| TC05 | Có kinh nghiệm, có sở thích | Không warning, button enable |
| TC06 | Submit không tick checkbox | Button disabled, error message |
| TC07 | Submit sau khi tick checkbox | Button enable, submit success |
| TC08 | AI gợi ý với case 1 | Conservative recommendations |
| TC09 | AI gợi ý với case 4 | Warning về khởi nghiệp |
| TC10 | AI gợi ý với case 5 | Normal recommendations |

---

## 8.5 Ghi chú triển khai

1. **Thứ tự triển khai quan trọng:** Backend → EmploymentForm → AspirationsForm → AI-Service
2. **Backend cần xong trước** để đảm bảo data layer ổn định
3. **Test từng step** trước khi làm step tiếp theo
4. **AI-Service làm cuối cùng** vì phụ thuộc data thực tế từ frontend
5. **Commit message convention:** `feat(worker-profile): skip work experience feature`

---

> **Tài liệu này được tạo dựa trên cuộc trao đổi giữa Thanh Sơn và AI Assistant ngày 2026-06-10**
