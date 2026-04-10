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