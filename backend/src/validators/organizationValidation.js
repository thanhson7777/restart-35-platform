import Joi from 'joi'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import {
  OBJECT_ID_RULE,
  OBJECT_ID_RULE_MESSAGE
} from '~/utils/validator'
import {
  ORGANIZATION_TYPES
} from '~/utils/constants'

// ============ Create Organization Validation ============
const createOrganization = async (req, res, next) => {
  const correctCondition = Joi.object({
    name: Joi.string().required().min(3).max(255).trim().strict()
      .messages({
        'string.min': 'Tên tổ chức phải có ít nhất 3 ký tự',
        'string.max': 'Tên tổ chức không được quá 255 ký tự',
        'any.required': 'Tên tổ chức là bắt buộc'
      }),
    type: Joi.string().required().valid(...Object.values(ORGANIZATION_TYPES))
      .messages({
        'any.only': 'Loại tổ chức không hợp lệ',
        'any.required': 'Loại tổ chức là bắt buộc'
      }),
    industry: Joi.string().max(100).trim().allow('', null),
    address: Joi.string().max(500).trim().allow('', null),
    contactEmail: Joi.string().email().max(255).trim().lowercase().allow('', null)
      .messages({ 'string.email': 'Email liên hệ không hợp lệ' }),
    contactPhone: Joi.string().max(20).trim().allow('', null),
    quota: Joi.number().integer().min(0).default(0),
    logo: Joi.string().allow('', null),
    taxCode: Joi.string().max(50).trim().allow('', null)
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Update Organization Validation ============
const updateOrganization = async (req, res, next) => {
  const correctCondition = Joi.object({
    name: Joi.string().min(3).max(255).trim().strict(),
    type: Joi.string().valid(...Object.values(ORGANIZATION_TYPES))
      .messages({ 'any.only': 'Loại tổ chức không hợp lệ' }),
    industry: Joi.string().max(100).trim().allow('', null),
    address: Joi.string().max(500).trim().allow('', null),
    contactEmail: Joi.string().email().max(255).trim().lowercase().allow('', null)
      .messages({ 'string.email': 'Email liên hệ không hợp lệ' }),
    contactPhone: Joi.string().max(20).trim().allow('', null),
    logo: Joi.string().allow('', null),
    taxCode: Joi.string().max(50).trim().allow('', null),
    size: Joi.string().allow('', null),
    focusAreas: Joi.array().items(Joi.string()).default([]),
    operatingRegions: Joi.array().items(Joi.string()).default([]),
    trainingCategories: Joi.array().items(Joi.string()).default([]),
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Update Quota Validation ============
const updateQuota = async (req, res, next) => {
  const correctCondition = Joi.object({
    quota: Joi.number().integer().min(0).required()
      .messages({
        'number.min': 'Quota không được nhỏ hơn 0',
        'any.required': 'Quota là bắt buộc'
      })
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Check Organization ID Validation ============
const checkOrganizationId = async (req, res, next) => {
  const { id } = req.params
  if (!id.match(OBJECT_ID_RULE)) {
    next(new ApiError(StatusCodes.BAD_REQUEST, 'ID tổ chức không hợp lệ'))
    return
  }
  next()
}

export const organizationValidation = {
  createOrganization,
  updateOrganization,
  updateQuota,
  checkOrganizationId
}
