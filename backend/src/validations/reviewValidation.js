import Joi from 'joi'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import {
  OBJECT_ID_RULE,
  OBJECT_ID_RULE_MESSAGE
} from '~/utils/validator'
import {
  REVIEW_STATUS,
  MAX_ITEM_PER_PAGE
} from '~/utils/constants'

// ============ Create Review Validation ============
const createReview = async (req, res, next) => {
  const correctCondition = Joi.object({
    courseId: Joi.string().required()
      .pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    rating: Joi.object({
      overall: Joi.number().integer().min(1).max(5).required(),
      content: Joi.number().integer().min(1).max(5),
      instructor: Joi.number().integer().min(1).max(5),
      materials: Joi.number().integer().min(1).max(5),
      support: Joi.number().integer().min(1).max(5)
    }).required(),
    title: Joi.string().required().max(255),
    content: Joi.string().required().min(20).max(5000)
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Update Review Validation ============
const updateReview = async (req, res, next) => {
  const correctCondition = Joi.object({
    rating: Joi.object({
      overall: Joi.number().integer().min(1).max(5),
      content: Joi.number().integer().min(1).max(5),
      instructor: Joi.number().integer().min(1).max(5),
      materials: Joi.number().integer().min(1).max(5),
      support: Joi.number().integer().min(1).max(5)
    }),
    title: Joi.string().max(255),
    content: Joi.string().min(20).max(5000)
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Response Review Validation ============
const responseReview = async (req, res, next) => {
  const correctCondition = Joi.object({
    content: Joi.string().required().min(10).max(2000)
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Moderate Review Validation ============
const moderateReview = async (req, res, next) => {
  const correctCondition = Joi.object({
    action: Joi.string().valid('approve', 'reject', 'flag').required(),
    reason: Joi.string().max(500).when('action', {
      is: Joi.valid('reject', 'flag'),
      then: Joi.required()
    })
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Query Reviews Validation ============
const queryReviews = async (req, res, next) => {
  const correctCondition = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(MAX_ITEM_PER_PAGE).default(10),
    status: Joi.string().valid(...Object.values(REVIEW_STATUS)),
    sortBy: Joi.string().valid('createdAt', 'rating', 'helpful').default('createdAt'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
    rating: Joi.number().integer().min(1).max(5)
  })

  try {
    await correctCondition.validateAsync(req.query, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.BAD_REQUEST, error.details?.[0]?.message || error.message))
  }
}

// ============ Check ID Validation ============
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

// ============ Check Course ID Validation ============
const checkCourseId = async (req, res, next) => {
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

export const reviewValidation = {
  createReview,
  updateReview,
  responseReview,
  moderateReview,
  queryReviews,
  checkId,
  checkCourseId
}
