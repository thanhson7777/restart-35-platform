/* eslint-disable no-multi-spaces */
import { env } from '~/config/enviroment'

// ============ PAGINATION DEFAULTS ============
export const DEFAULT_PAGE = 1
export const DEFAULT_ITEM_PER_PAGE = 10
export const MAX_ITEM_PER_PAGE = 50

// ============ USER ROLES ============
export const USER_ROLES = {
  WORKER: 'worker',
  ENTERPRISE: 'enterprise',
  TRAINER: 'trainer',
  NGO: 'ngo',
  ADMIN: 'admin'
}

// ============ JOB TYPES ============
export const JOB_TYPES = {
  FULL_TIME: 'full-time',       // Toàn thời gian
  PART_TIME: 'part-time',       // Bán thời gian
  TEMPORARY: 'temporary',       // Thời vụ/Khoán việc
  FREELANCE: 'freelance'        // Làm tự do
}

// ============ EDUCATION LEVELS ============
export const EDUCATION_LEVELS = {
  NONE: 'none',               // Không bằng cấp
  PRIMARY: 'primary',         // Tiểu học
  MIDDLE: 'middle',           // THCS
  HIGH: 'high',               // THPT
  VOCATIONAL: 'vocational',   // Học nghề/Trung cấp
  COLLEGE: 'college',         // Cao đẳng
  UNIVERSITY: 'university'    // Đại học
}

// ============ BARRIER TYPES ============
export const BARRIER_TYPES = {
  HEALTH: 'health',           // Sức khỏe
  FAMILY: 'family',           // Chăm sóc gia đình
  TECH_GAP: 'techGap',        // Hạn chế công nghệ
  LOCATION: 'location',       // Vị trí địa lý
  OTHER: 'other'              // Khác
}

// ============ INDUSTRY TYPES ============
// 8 industries cho Career Transition (35+)
export const INDUSTRY_TYPES = {
  BAO_VE: 'bao_ve',           // Bảo Vệ & An Ninh
  LAI_XE: 'lai_xe',           // Lái Xe & Vận Tải
  CO_KHI: 'co_khi',           // Cơ Khí & Sản Xuất
  BAN_HANG: 'ban_hang',       // Bán Hàng & Kinh Doanh
  PHUC_VU: 'phuc_vu',         // Phục Vụ & Nhà Hàng
  HANH_CHINH: 'hanh_chinh',   // Hành Chính
  NHAN_SU: 'nhan_su',         // Nhân Sự & HR
  TU_VAN: 'tu_van'            // Tư Vấn
}

// ============ RISK LEVELS ============
export const RISK_LEVELS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
}

// ============ WORKER PROFILE STEPS ============
export const WORKER_PROFILE_STEPS = {
  BASIC_INFO: 1,
  EMPLOYMENT: 2,
  BARRIERS: 3,
  ASPIRATIONS: 4,
  MAX_STEP: 4
}

//============= COURSE STATUS ============
export const COURSE_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ARCHIVED: 'archived'
}

//============COURSE LEVELS ============
export const COURSE_LEVELS = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced'
}

//============DURATION UNITS ============
export const DURATION_UNITS = {
  HOURS: 'hours',
  WEEKS: 'weeks',
  MONTHS: 'months',
  DAYS: 'days'
}

//============LOCATION TYPES ============
export const LOCATION_TYPES = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  HYBRID: 'hybrid'
}

// ============ ENROLLMENT STATUS ============
export const ENROLLMENT_STATUS = {
  PENDING: 'pending',
  WAITLIST: 'waitlist',
  ENROLLED: 'enrolled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  DROPPED: 'dropped',
  CANCELLED: 'cancelled',
  ON_HOLD: 'on_hold'
}

// ============ COMPLETION STATUS ============
export const COMPLETION_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed'
}

// ============ ENROLLMENT SOURCE ============
export const ENROLLMENT_SOURCE = {
  DIRECT: 'direct',
  SCHOLARSHIP: 'scholarship',
  RECOMMENDATION: 'recommendation'
}

// ============ SCHOLARSHIP COVERAGE ============
export const SCHOLARSHIP_COVERAGE = {
  FULL: 'full',
  PARTIAL: 'partial',
  NONE: 'none'
}

// ============ SCHOLARSHIP STATUS ============
export const SCHOLARSHIP_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  EXHAUSTED: 'exhausted',
  EXPIRED: 'expired'
}

// ============ APPLICATION STATUS ============
export const APPLICATION_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  REVIEWING: 'reviewing',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  WAITLIST: 'waitlist'
}

// ============ DISBURSEMENT STATUS ============
export const DISBURSEMENT_STATUS = {
  PENDING: 'pending',
  DISBURSED: 'disbursed',
  CLAWBACK: 'clawback',
  REFUNDED: 'refunded'
}

// ============ APPEAL STATUS ============
export const APPEAL_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected'
}

// ============ DOCUMENT TYPES ============
export const DOCUMENT_TYPES = {
  INCOME_PROOF: 'income_proof',
  ID_CARD: 'id_card',
  HOUSEHOLD_REGISTER: 'household_register',
  BIRTH_CERTIFICATE: 'birth_certificate',
  MARRIAGE_CERTIFICATE: 'marriage_certificate',
  EMPLOYMENT_CONTRACT: 'employment_contract',
  UNEMPLOYMENT_PROOF: 'unemployment_proof'
}

// ============ SCHEDULE STATUS ============
export const SCHEDULE_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
}

// ============ SESSION STATUS ============
export const SESSION_STATUS = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  RESCHEDULED: 'rescheduled'
}

// ============ ATTENDANCE STATUS ============
export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
  EXCUSED: 'excused'
}

// ============ REMINDER TYPES ============
export const REMINDER_TYPES = {
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push'
}

// ============ REMINDER STATUS ============
export const REMINDER_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  FAILED: 'failed'
}

// ============ REVIEW STATUS ============
export const REVIEW_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
}

// ============ CORS & DOMAIN ============
export const WHITELIST_DOMAINS = [
  'http://localhost:5173'
]

export const WEBSITE_DOMAIN = (env.BUILD_MODE === 'production') ? env.WEBISTE_DOMAIN_PRODUCTION : env.WEBISTE_DOMAIN_DEVELOPMENT

// ============ STATUS ============
export const STATUS_REVIEW = {
  ACTIVE: 'active',
  HIDDEN: 'hidden'
}

// ============ MAX LIMITS ============
export const MAX_EMPLOYMENT_HISTORY = 3
export const MAX_SKILLS = 10
