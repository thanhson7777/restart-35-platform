import { env } from '~/config/enviroment'

// ============ DEFAULT PAGINATION ============
export const DEFAULT_PAGE = 1
export const DEFAULT_ITEM_PER_PAGE = 10

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
