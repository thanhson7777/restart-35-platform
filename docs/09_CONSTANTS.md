# 09. Constants & Enums

> **Cập nhật:** 2026-04-10

## 9.1 USER_ROLES

```javascript
// backend/src/utils/constants.js
export const USER_ROLES = {
  WORKER: 'worker',
  ENTERPRISE: 'enterprise',
  TRAINER: 'trainer',
  NGO: 'ngo',
  ADMIN: 'admin'
}
```

---

## 9.2 EDUCATION_LEVELS

```javascript
export const EDUCATION_LEVELS = {
  NONE: 'none',             // Không bằng cấp
  PRIMARY: 'primary',       // Tiểu học
  MIDDLE: 'middle',         // THCS
  HIGH: 'high',             // THPT
  VOCATIONAL: 'vocational', // Học nghề/Trung cấp
  COLLEGE: 'college',       // Cao đẳng
  UNIVERSITY: 'university'  // Đại học
}

// Frontend label
export const EDUCATION_LABELS = {
  'none': 'Không bằng cấp',
  'primary': 'Tiểu học',
  'middle': 'THCS',
  'high': 'THPT',
  'vocational': 'Học nghề/Trung cấp',
  'college': 'Cao đẳng',
  'university': 'Đại học'
}
```

---

## 9.3 JOB_TYPES

```javascript
export const JOB_TYPES = {
  FULL_TIME: 'full-time',   // Toàn thời gian
  PART_TIME: 'part-time',   // Bán thời gian
  TEMPORARY: 'temporary',   // Thời vụ/Khoán việc
  FREELANCE: 'freelance'    // Làm tự do
}

// Frontend label
export const JOB_TYPE_LABELS = {
  'full-time': 'Toàn thời gian',
  'part-time': 'Bán thời gian',
  'temporary': 'Thời vụ/Khoán việc',
  'freelance': 'Làm tự do'
}
```

---

## 9.4 BARRIER_TYPES

```javascript
export const BARRIER_TYPES = {
  HEALTH: 'health',        // Sức khỏe
  FAMILY: 'family',        // Chăm sóc gia đình
  TECH_GAP: 'techGap',     // Hạn chế công nghệ
  LOCATION: 'location',   // Vị trí địa lý
  OTHER: 'other'          // Khác
}

// Frontend label
export const BARRIER_LABELS = {
  'health': 'Sức khỏe',
  'family': 'Chăm sóc gia đình',
  'techGap': 'Hạn chế công nghệ',
  'location': 'Vị trí địa lý',
  'other': 'Khác'
}
```

---

## 9.5 WORKER_PROFILE_STEPS

```javascript
export const WORKER_PROFILE_STEPS = {
  BASIC_INFO: 1,
  EMPLOYMENT_HISTORY: 2,
  BARRIERS: 3,
  ASPIRATIONS: 4,
  MAX_STEP: 4
}

export const STEP_TITLES = {
  1: 'Thông tin cơ bản',
  2: 'Kinh nghiệm làm việc',
  3: 'Rào cản & Thách thức',
  4: 'Nguyện vọng'
}
```

---

## 9.6 RISK_LEVELS

```javascript
export const RISK_LEVELS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
}

export const RISK_LABELS = {
  'high': 'Nguy cơ cao',
  'medium': 'Nguy cơ trung bình',
  'low': 'Nguy cơ thấp'
}

export const RISK_COLORS = {
  'high': 'red',
  'medium': 'yellow',
  'low': 'green'
}
```

---

## 9.7 MARITAL_STATUS

```javascript
export const MARITAL_STATUS = {
  SINGLE: 'single',
  MARRIED: 'married',
  DIVORCED: 'divorced',
  WIDOWED: 'widowed'
}

export const MARITAL_STATUS_LABELS = {
  'single': 'Độc thân',
  'married': 'Đã kết hôn',
  'divorced': 'Ly hôn'
}
```

---

## 9.8 GENDER

```javascript
export const GENDER = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other'
}

export const GENDER_LABELS = {
  'male': 'Nam',
  'female': 'Nữ',
  'other': 'Khác'
}
```

---

## 9.9 PAGINATION

```javascript
export const DEFAULT_PAGE = 1
export const DEFAULT_ITEM_PER_PAGE = 10
export const MAX_ITEM_PER_PAGE = 100
```

---

## 9.10 CORS

```javascript
export const WHITELIST_DOMAINS = [
  'http://localhost:5173',
  'http://localhost:3000'
]

export const WEBSITE_DOMAIN = (env.BUILD_MODE === 'production')
  ? env.WEBISTE_DOMAIN_PRODUCTION
  : env.WEBISTE_DOMAIN_DEVELOPMENT
```
