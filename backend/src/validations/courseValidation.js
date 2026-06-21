import Joi from 'joi'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import {
  OBJECT_ID_RULE,
  OBJECT_ID_RULE_MESSAGE
} from '~/utils/validator'
import {
  COURSE_STATUS,
  DURATION_UNITS,
  LOCATION_TYPES,
  MAX_ITEM_PER_PAGE,
  COURSE_DELIVERY_TYPES,
  COURSE_FUNDING_MODELS
} from '~/utils/constants'

// ============ Create Course Validation ============
const createCourse = async (req, res, next) => {
  const correctCondition = Joi.object({
    title: Joi.string().required().min(10).max(200).trim()
      .messages({
        'string.min': 'Tiêu đề phải có ít nhất 10 ký tự',
        'string.max': 'Tiêu đề không được quá 200 ký tự',
        'any.required': 'Tiêu đề là bắt buộc'
      }),
    description: Joi.string().required().min(50).max(5000)
      .messages({
        'string.min': 'Mô tả phải có ít nhất 50 ký tự',
        'any.required': 'Mô tả là bắt buộc'
      }),
    shortDescription: Joi.string().max(500).allow(''),
    thumbnail: Joi.string().uri().allow(null, ''),
    slug: Joi.string().min(3).max(255).pattern(/^[a-z0-9-]+$/).optional(),
    categoryId: Joi.string().required()
      .pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    duration: Joi.object({
      value: Joi.number().required().min(1),
      unit: Joi.string().valid(...Object.values(DURATION_UNITS)).required()
    }),
    schedule: Joi.string().max(500).allow(''),
    location: Joi.object({
      type: Joi.string().valid(...Object.values(LOCATION_TYPES)).allow('', null),
      address: Joi.string().max(500).allow('', null),
      province: Joi.string().allow('', null),
      ward: Joi.string().allow('', null),
      coordinates: Joi.object({
        lat: Joi.number().allow(null),
        lng: Joi.number().allow(null)
      }).allow(null)
    }),
    scheduleConfig: Joi.object({
      totalSessions: Joi.number().integer().min(1).required(),
      sessionsPerWeek: Joi.number().integer().min(1).required(),
      sessionDurationMinutes: Joi.number().integer().min(30).default(90),
      preferredDays: Joi.array().items(
        Joi.string().valid('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
      ).default([]),
      preferredTime: Joi.string().valid('Morning', 'Afternoon', 'Evening').allow(null, ''),
      expectedStartDate: Joi.date().timestamp('javascript').allow(null, '')
    }).allow(null),
    fundingConfig: Joi.object({
      type: Joi.string().valid('FREE', 'PAID', 'SPONSORED').default('FREE'),
      price: Joi.number().min(0).default(0),
      sponsorIds: Joi.array().items(Joi.string()).default([]),
      hasJobGuarantee: Joi.boolean().default(false)
    }).default({
      type: 'FREE',
      price: 0,
      sponsorIds: [],
      hasJobGuarantee: false
    }),
    maxStudents: Joi.number().integer().min(1).default(30),
    enrollmentStartDate: Joi.date().timestamp().allow(null, ''),
    delivery_type: Joi.string().valid(...Object.values(COURSE_DELIVERY_TYPES)).default(COURSE_DELIVERY_TYPES.VIDEO),
    skills: Joi.array().items(Joi.string()).max(20).default([]),
    syllabus: Joi.array().items(
      Joi.object({
        week: Joi.number().required(),
        title: Joi.string().required(),
        content: Joi.string().allow(''),
        duration: Joi.string().allow('')
      })
    ).max(50).default([]),
    certificate: Joi.string().max(200).allow(''),
    outcomes: Joi.array().items(Joi.string()).max(20).default([]),
    linkedPartnershipId: Joi.string().pattern(OBJECT_ID_RULE).allow(null, '').message(OBJECT_ID_RULE_MESSAGE),
    linkedEnterpriseId: Joi.string().pattern(OBJECT_ID_RULE).allow(null, '').message(OBJECT_ID_RULE_MESSAGE)
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Update Course Validation ============
const updateCourse = async (req, res, next) => {
  const correctCondition = Joi.object({
    title: Joi.string().min(10).max(200).trim(),
    description: Joi.string().min(50).max(5000),
    shortDescription: Joi.string().max(500).allow(''),
    thumbnail: Joi.string().uri().allow(null, ''),
    slug: Joi.string().min(3).max(255).pattern(/^[a-z0-9-]+$/).optional(),
    categoryId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    duration: Joi.object({
      value: Joi.number().required().min(1),
      unit: Joi.string().valid(...Object.values(DURATION_UNITS)).required()
    }),
    schedule: Joi.string().max(500).allow(''),
    location: Joi.object({
      type: Joi.string().valid(...Object.values(LOCATION_TYPES)).allow('', null),
      address: Joi.string().max(500).allow('', null),
      province: Joi.string().allow('', null),
      ward: Joi.string().allow('', null),
      coordinates: Joi.object({
        lat: Joi.number().allow(null),
        lng: Joi.number().allow(null)
      }).allow(null)
    }),
    scheduleConfig: Joi.object({
      totalSessions: Joi.number().integer().min(1).required(),
      sessionsPerWeek: Joi.number().integer().min(1).required(),
      sessionDurationMinutes: Joi.number().integer().min(30),
      preferredDays: Joi.array().items(
        Joi.string().valid('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
      ),
      preferredTime: Joi.string().valid('Morning', 'Afternoon', 'Evening').allow(null, ''),
      expectedStartDate: Joi.date().timestamp('javascript').allow(null, '')
    }).allow(null),
    fundingConfig: Joi.object({
      type: Joi.string().valid('FREE', 'PAID', 'SPONSORED'),
      price: Joi.number().min(0),
      sponsorIds: Joi.array().items(Joi.string()),
      hasJobGuarantee: Joi.boolean()
    }),
    maxStudents: Joi.number().integer().min(1),
    enrollmentStartDate: Joi.date().timestamp().allow(null, ''),
    delivery_type: Joi.string().valid(...Object.values(COURSE_DELIVERY_TYPES)),
    skills: Joi.array().items(Joi.string()).max(20),
    syllabus: Joi.array().items(
      Joi.object({
        week: Joi.number().required(),
        title: Joi.string().required(),
        content: Joi.string().allow(''),
        duration: Joi.string().allow('')
      })
    ).max(50),
    certificate: Joi.string().max(200).allow(''),
    outcomes: Joi.array().items(Joi.string()).max(20)
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Update Status Validation ============
const updateStatus = async (req, res, next) => {
  const correctCondition = Joi.object({
    status: Joi.string().valid(
      COURSE_STATUS.APPROVED,
      COURSE_STATUS.REJECTED,
      COURSE_STATUS.ARCHIVED
    ).required(),
    rejectionReason: Joi.string().max(1000).allow('')
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Query Validation ============
const queryCourses = async (req, res, next) => {
  const correctCondition = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(MAX_ITEM_PER_PAGE).default(10),
    search: Joi.string().max(200).allow(''),
    category: Joi.string().pattern(OBJECT_ID_RULE).allow('').message(OBJECT_ID_RULE_MESSAGE),
    provider: Joi.string().pattern(OBJECT_ID_RULE).allow('').message(OBJECT_ID_RULE_MESSAGE),
    minFee: Joi.number().integer().min(0),
    maxFee: Joi.number().integer().min(0),
    isFree: Joi.boolean(),
    hasScholarship: Joi.boolean(),
    status: Joi.string().valid(...Object.values(COURSE_STATUS)).allow(''),
    skill: Joi.string().max(100).allow(''),
    delivery_type: Joi.string().valid(...Object.values(COURSE_DELIVERY_TYPES)).allow(''),
    funding_model: Joi.string().valid(...Object.values(COURSE_FUNDING_MODELS)).allow(''),
    sortBy: Joi.string().valid('createdAt', 'title', 'fee', 'rating', 'enrollmentCount').default('createdAt'),
    order: Joi.string().valid('asc', 'desc').default('desc')
  })

  try {
    await correctCondition.validateAsync(req.query, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.BAD_REQUEST, error.details?.[0]?.message || error.message))
  }
}

// ============ ID Validation ============
const checkId = async (req, res, next) => {
  const condition = Joi.object({
    id: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
  })

  try {
    await condition.validateAsync(req.params)
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.BAD_REQUEST, error.message))
  }
}

// ============ Check Owner Validation ============
const checkOwnership = async (req, res, next) => {
  const condition = Joi.object({
    courseId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
  })

  try {
    await condition.validateAsync(req.params)
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.BAD_REQUEST, error.message))
  }
}

export const courseValidation = {
  createCourse,
  updateCourse,
  updateStatus,
  queryCourses,
  checkId,
  checkOwnership
}