import { env } from '~/config/enviroment'

export const DEFAULT_PAGE = 1
export const DEFAULT_ITEM_PER_PAGE = 10

export const USER_ROLE = {
  ADMIN: 'admin',
  CUSTOMER: 'customer'
}

export const PRODUCT_TYPE = {
  FLOWER: 'flower',
  ACCESSORY: 'accessory'
}

export const STATUS_PRODUCT = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  OUTOFSTOCK: 'out-of-stock'
}

export const PAYMENT_METHOD = {
  COD: 'COD',
  MOMO: 'MOMO',
  VNPAY: 'VNPAY'
}

export const STATUS_PAYMENT = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED'
}

export const STATUS_ORDER = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  ARRANGING_FLOWERS: 'ARRANGING_FLOWERS',
  SHIPPING: 'SHIPPING',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED'
}

export const STATUS_CONTACT = {
  NEW: 'NEW',
  PENDING: 'PENDING',
  RESOLVED: 'RESOLVED',
  SPAM: 'SPAM'
}

export const WHITELIST_DOMAINS = [
  'http://localhost:5173'
]

export const WEBSITE_DOMAIN = (env.BUILD_MODE === 'production') ? env.WEBISTE_DOMAIN_PRODUCTION : env.WEBISTE_DOMAIN_DEVELOPMENT
export const STATUS_REVIEW = { ACTIVE: 'active', HIDDEN: 'hidden' }
