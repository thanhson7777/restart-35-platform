import Joi from 'joi'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import {
  EMAIL_RULE,
  EMAIL_RULE_MESSAGE,
  OBJECT_ID_RULE,
  OBJECT_ID_RULE_MESSAGE,
  PASSWORD_RULE,
  PASSWORD_RULE_MESSAGE,
  PHONE_RULE,
  PHONE_RULE_MESSAGE
} from '~/utils/validator'
import { USER_ROLES } from '~/utils/constants'

const createNew = async (req, res, next) => {
  const correctCondition = Joi.object({
    email: Joi.string().required().pattern(EMAIL_RULE).message(EMAIL_RULE_MESSAGE),
    password: Joi.string().required().pattern(PASSWORD_RULE).message(PASSWORD_RULE_MESSAGE),
    phone: Joi.string().required().pattern(PHONE_RULE).message(PHONE_RULE_MESSAGE)
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

const verifyAccount = async (req, res, next) => {
  const correctCodition = Joi.object({
    email: Joi.string().required().pattern(EMAIL_RULE).message(EMAIL_RULE_MESSAGE),
    token: Joi.string().required()
  })

  try {
    await correctCodition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) { next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message)) }
}

const login = async (req, res, next) => {
  try {
    const correctCondition = Joi.object({
      email: Joi.string().required().pattern(EMAIL_RULE).message(EMAIL_RULE_MESSAGE),
      password: Joi.string().required().pattern(PASSWORD_RULE).message(PASSWORD_RULE_MESSAGE)
    })

    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

const update = async (req, res, next) => {
  const correctCondition = Joi.object({
    displayName: Joi.string().trim().strict(),
    phone: Joi.string().pattern(PHONE_RULE).message(PHONE_RULE_MESSAGE),
    address: Joi.string().trim().strict(),
    companyName: Joi.string().trim().strict(),
    taxCode: Joi.string().trim().strict(),
    current_password: Joi.string().pattern(PASSWORD_RULE).message(`current_password: ${PASSWORD_RULE_MESSAGE}`),
    new_password: Joi.string().pattern(PASSWORD_RULE).message(`new_password: ${PASSWORD_RULE_MESSAGE}`)
  })
    .with('current_password', 'new_password')
    .with('new_password', 'current_password')
  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Update Organization ID (Admin Only) ============
const updateOrganizationId = async (req, res, next) => {
  const correctCondition = Joi.object({
    organizationId: Joi.string().pattern(/^[a-f\d]{24}$/i).allow(null, '').required()
      .messages({
        'string.pattern.base': 'ID tổ chức không hợp lệ',
        'any.required': 'organizationId là bắt buộc (hoặc null để xóa liên kết)'
      })
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

const updateUserStatus = async (req, res, next) => {
  const correctCondition = Joi.object({
    isActive: Joi.boolean().strict(),
    role: Joi.string().valid(...Object.values(USER_ROLES))
  }).min(1)

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })

    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }
}

const checkProductId = async (req, res, next) => {
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

export const userValidation = {
  createNew,
  verifyAccount,
  login,
  update,
  updateUserStatus,
  updateOrganizationId,
  checkProductId,
  checkId
}
