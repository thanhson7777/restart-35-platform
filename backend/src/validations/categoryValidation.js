import Joi from 'joi'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import {
  OBJECT_ID_RULE,
  OBJECT_ID_RULE_MESSAGE
} from '~/utils/validator'

// ============ Create Category Validation ============
const createCategory = async (req, res, next) => {
  const correctCondition = Joi.object({
    name: Joi.string().required().trim().max(100),
    description: Joi.string().allow(null, '').max(500),
    icon: Joi.string().allow(null, '').max(255),
    status: Joi.string().valid('pending', 'approved', 'rejected').default('approved'),
    order: Joi.number().integer().min(0).default(0),
    isActive: Joi.boolean().default(true),
    isFeatured: Joi.boolean().default(false)
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Update Category Validation ============
const updateCategory = async (req, res, next) => {
  const correctCondition = Joi.object({
    name: Joi.string().trim().max(100),
    description: Joi.string().allow(null, '').max(500),
    icon: Joi.string().allow(null, '').max(255),
    status: Joi.string().valid('pending', 'approved', 'rejected'),
    order: Joi.number().integer().min(0),
    isActive: Joi.boolean(),
    isFeatured: Joi.boolean()
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Reorder Categories Validation ============
const reorderCategories = async (req, res, next) => {
  const correctCondition = Joi.object({
    categories: Joi.array().items(
      Joi.object({
        id: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
        order: Joi.number().integer().min(0).required()
      })
    ).min(1).required()
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
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

// ============ Check Slug Validation ============
const checkSlug = async (req, res, next) => {
  const condition = Joi.object({
    slug: Joi.string().required().trim().lowercase().max(100)
  })

  try {
    await condition.validateAsync(req.params)
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.BAD_REQUEST, error.message))
  }
}

// ============ Query Categories Validation ============
const queryCategories = async (req, res, next) => {
  const correctCondition = Joi.object({
    includeInactive: Joi.boolean().default(false),
    status: Joi.string().valid('pending', 'approved', 'rejected', 'all').default('all')
  })

  try {
    await correctCondition.validateAsync(req.query, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.BAD_REQUEST, error.details?.[0]?.message || error.message))
  }
}

export const categoryValidation = {
  createCategory,
  updateCategory,
  reorderCategories,
  checkId,
  checkSlug,
  queryCategories
}
