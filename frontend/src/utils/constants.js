/**
 * Constants - Các hằng số và cấu hình cho frontend
 */

// Xác định môi trường hiện tại
const isDev = import.meta.env.MODE === 'development' || import.meta.env.VITE_BUILD_MODE === 'dev'
const isProduction = import.meta.env.MODE === 'production'

/**
 * API Configuration
 * Backend: Node.js/Express server
 * Frontend gọi qua Backend (không gọi trực tiếp AI Service)
 */

// Backend API URL (Node.js Express)
export const API_ROOT = isDev
  ? 'http://localhost:8017'
  : isProduction
    ? 'https://api.restart35.com'
    : 'http://localhost:8017'

/**
 * AI Service được gọi qua Backend Node.js
 * Không còn gọi trực tiếp từ Frontend nữa
 *
 * Flow: Frontend -> Backend Node.js -> AI Service (Python FastAPI)
 */

// Pagination defaults
export const DEFAULT_PAGE = 1
export const DEFAULT_ITEM_PER_PAGE = 10

/**
 * Job Types - Các loại công việc
 */
export const JOB_TYPES = {
  FULL_TIME: 'full-time',
  PART_TIME: 'part-time',
  TEMPORARY: 'temporary',
  FREELANCE: 'freelance',
  PERMANENT: 'permanent'
}

/**
 * Risk Levels - Mức độ rủi ro
 */
export const RISK_LEVELS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
}

/**
 * Education Levels - Trình độ học vấn
 */
export const EDUCATION_LEVELS = {
  PRIMARY: 'primary',
  LOWER_SECONDARY: 'lower_secondary',
  UPPER_SECONDARY: 'upper_secondary',
  COLLEGE: 'college',
  UNIVERSITY: 'university',
  MASTER: 'master'
}

/**
 * Regions - Khu vực
 */
export const REGIONS = {
  NORTH: 'north',
  CENTRAL: 'central',
  SOUTH: 'south'
}

/**
 * Employment Status - Tình trạng việc làm
 */
export const EMPLOYMENT_STATUS = {
  EMPLOYED: 'employed',
  UNEMPLOYED: 'unemployed',
  SELF_EMPLOYED: 'self-employed',
  RETIRED: 'retired'
}

// ─── Course & Enrollment Constants ───────────────────────────────────────────

/**
 * Enrollment Status
 */
export const ENROLLMENT_STATUS = {
  PENDING: 'pending',
  WAITLIST: 'waitlist',
  ENROLLED: 'enrolled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  DROPPED: 'dropped',
  CANCELLED: 'cancelled',
  ON_HOLD: 'on_hold',
}

/**
 * Course Status
 */
export const COURSE_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ARCHIVED: 'archived',
}

/**
 * Course Levels
 */
export const COURSE_LEVELS = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
}

/**
 * Location Types
 */
export const LOCATION_TYPES = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  HYBRID: 'hybrid',
}

/**
 * Enrollment Sources
 */
export const ENROLLMENT_SOURCE = {
  DIRECT: 'direct',
  SCHOLARSHIP: 'scholarship',
  RECOMMENDATION: 'recommendation',
}

// ─── Scholarship & Application Constants ──────────────────────────────────────

/**
 * Scholarship Status
 */
export const SCHOLARSHIP_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  EXHAUSTED: 'exhausted',
  EXPIRED: 'expired',
}

/**
 * Application Status
 */
export const APPLICATION_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  REVIEWING: 'reviewing',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  WAITLIST: 'waitlist',
}

/**
 * User Roles
 */
export const USER_ROLES = {
  WORKER: 'worker',
  ENTERPRISE: 'enterprise',
  TRAINER: 'trainer',
  NGO: 'ngo',
  ADMIN: 'admin',
}

/**
 * Scholarship Coverage
 */
export const SCHOLARSHIP_COVERAGE = {
  FULL: 'full',
  PARTIAL: 'partial',
  NONE: 'none',
}

/**
 * Document Types
 */
export const DOCUMENT_TYPES = {
  INCOME_PROOF: 'income_proof',
  ID_CARD: 'id_card',
  HOUSEHOLD_REGISTER: 'household_register',
  BIRTH_CERTIFICATE: 'birth_certificate',
  MARRIAGE_CERTIFICATE: 'marriage_certificate',
  EMPLOYMENT_CONTRACT: 'employment_contract',
  UNEMPLOYMENT_PROOF: 'unemployment_proof',
}

/**
 * Document Type Labels (Vietnamese)
 */
export const DOCUMENT_TYPE_LABELS = {
  income_proof: 'Giấy chứng minh thu nhập',
  id_card: 'CMND/CCCD',
  household_register: 'Hộ khẩu',
  birth_certificate: 'Giấy khai sinh',
  marriage_certificate: 'Giấy đăng ký kết hôn',
  employment_contract: 'Hợp đồng lao động',
  unemployment_proof: 'Giấy xác nhận thất nghiệp',
}