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
// BASIC_INFO removed - basicInfo now lives in users collection
export const WORKER_PROFILE_STEPS = {
  EMPLOYMENT: 1,
  BARRIERS: 2,
  ASPIRATIONS: 3,
  MAX_STEP: 3
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
  RECOMMENDATION: 'recommendation',
  ENTERPRISE_LINKED: 'enterprise_linked',
  ENTERPRISE_SPONSORED: 'enterprise_sponsored',
  NGO_SPONSORED: 'ngo_sponsored',
  CO_FUNDED: 'co_funded'
}

// ============ PARTNERSHIP STATUS ============
export const PARTNERSHIP_STATUS = {
  PENDING: 'pending',
  NEGOTIATING: 'negotiating',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired'
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

// ============ ORGANIZATION TYPES ============
export const ORGANIZATION_TYPES = {
  ENTERPRISE: 'enterprise',
  NGO: 'ngo',
  GOVERNMENT: 'government',
  TRAINING_CENTER: 'training_center'
}

// ============ COURSE DELIVERY TYPES ============
export const COURSE_DELIVERY_TYPES = {
  VIDEO: 'video',
  LIVE: 'live',
  OFFLINE: 'offline',
  BLENDED: 'blended'
}

// ============ COURSE FUNDING MODELS ============
export const COURSE_FUNDING_MODELS = {
  FREE: 'free',
  ENTERPRISE_FUNDED: 'enterprise_funded',
  LEARNER_PAID: 'learner_paid',
  ISA: 'isa',
  BATCH: 'batch',
  MIXED: 'mixed'
}

// ============ COURSE SPONSORSHIP STATUS ============
export const COURSE_SPONSORSHIP_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  EXHAUSTED: 'exhausted',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled'
}

// ============ COURSE SPONSORSHIP MODEL ============
export const COURSE_SPONSORSHIP_MODEL = {
  ENTERPRISE: 'enterprise',
  NGO: 'ngo',
  CO_FUNDED: 'co_funded'
}

// ============ DISBURSEMENT MODEL ============
export const DISBURSEMENT_MODEL = {
  UPFRONT: 'upfront',
  MILESTONE: 'milestone',
  COMPLETION: 'completion'
}

// ============ ENROLLMENT STATUS V2 ============
// Chuẩn hóa: 8 status cũ → 5 status mới (xem migration ở Task 1.5)
export const ENROLLMENT_STATUS_V2 = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  DROPPED: 'dropped',
  FAILED: 'failed',
  SUSPENDED: 'suspended'
}

// ============ ENROLLMENT PAYMENT STATUS ============
export const ENROLLMENT_PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  WAIVED: 'waived',
  ISA_PENDING: 'isa_pending',
  INSTALLMENT_ACTIVE: 'installment_active'
}

// ============ FUNDING LEARNER PAY MODE ============
export const FUNDING_LEARNER_PAY_MODE = {
  NONE: 'none',
  UPFRONT: 'upfront',
  DEPOSIT: 'deposit',
  INSTALLMENT: 'installment',
  ISA: 'isa'
}

// ============ PAYMENT METHOD ============
export const PAYMENT_METHOD = {
  CASH: 'cash',
  BANK_TRANSFER: 'bank_transfer',
  MOMO: 'momo',
  ZALOPAY: 'zalopay',
  VNPAY: 'vnpay',
  INVOICE: 'invoice'
}

// ============ PAYMENT STATUS ============
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled'
}

// ============ ISA REPAYMENT STATUS ============
export const ISA_REPAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  SKIPPED: 'skipped',
  CAPPED: 'capped',
  WAIVED: 'waived'
}

// ============ LEARNING EVENT TYPES ============
export const LEARNING_EVENT_TYPES = {
  VIDEO_STARTED: 'video_started',
  VIDEO_PAUSED: 'video_paused',
  VIDEO_COMPLETED: 'video_completed',
  VIDEO_SEEKED: 'video_seeked',
  QUIZ_STARTED: 'quiz_started',
  QUIZ_SUBMITTED: 'quiz_submitted',
  LIVE_JOINED: 'live_joined',
  LIVE_LEFT: 'live_left',
  CHECKED_IN: 'checked_in',
  CHECKED_OUT: 'checked_out',
  ASSIGNMENT_SUBMITTED: 'assignment_submitted',
  MODULE_COMPLETED: 'module_completed'
}

// ============ CERTIFICATE TYPES ============
export const CERTIFICATE_TYPES = {
  COMPLETION: 'completion',
  SKILL: 'skill',
  JOB_READY: 'job_ready'
}

// ============ PLACEMENT STATUS ============
export const PLACEMENT_STATUS = {
  REFERRED: 'referred',
  INTERVIEWING: 'interviewing',
  OFFERED: 'offered',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  STARTED: 'started',
  RESIGNED: 'resigned'
}

// ============ PLACEMENT REFERRAL SOURCE ============
export const PLACEMENT_REFERRAL_SOURCE = {
  PARTNERSHIP: 'partnership',
  ENTERPRISE_SPONSORSHIP: 'enterprise_sponsorship',
  NGO_SPONSORSHIP: 'ngo_sponsorship',
  MIXED: 'mixed'
}

// ============ MAX LIMITS ============
export const MAX_EMPLOYMENT_HISTORY = 3
export const MAX_SKILLS = 10
