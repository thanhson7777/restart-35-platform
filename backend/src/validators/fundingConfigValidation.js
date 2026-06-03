import Joi from 'joi'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import {
  OBJECT_ID_RULE,
  OBJECT_ID_RULE_MESSAGE
} from '~/utils/validator'
import {
  FUNDING_LEARNER_PAY_MODE
} from '~/utils/constants'

// ============ Create Funding Config Validation ============
const createFundingConfig = async (req, res, next) => {
  const correctCondition = Joi.object({
    courseId: Joi.string().required()
      .pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    learner_pay_mode: Joi.string()
      .valid(...Object.values(FUNDING_LEARNER_PAY_MODE))
      .required()
      .messages({
        'any.only': 'Hình thức thanh toán không hợp lệ',
        'any.required': 'Hình thức thanh toán là bắt buộc'
      }),
    configs: Joi.object({
      depositAmount: Joi.number().integer().min(0).default(0),
      installmentCount: Joi.number().integer().min(0).default(0),
      installmentAmount: Joi.number().integer().min(0).default(0),
      isaPercentage: Joi.number().min(0).max(100).default(0),
      isaThreshold: Joi.number().integer().min(0).default(0),
      isaMaxCap: Joi.number().integer().min(0).default(0),
      isaDuration: Joi.number().integer().min(0).default(0)
    }).default()
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Update Funding Config Validation ============
const updateFundingConfig = async (req, res, next) => {
  const correctCondition = Joi.object({
    learner_pay_mode: Joi.string()
      .valid(...Object.values(FUNDING_LEARNER_PAY_MODE))
      .messages({ 'any.only': 'Hình thức thanh toán không hợp lệ' }),
    configs: Joi.object({
      depositAmount: Joi.number().integer().min(0),
      installmentCount: Joi.number().integer().min(0),
      installmentAmount: Joi.number().integer().min(0),
      isaPercentage: Joi.number().min(0).max(100),
      isaThreshold: Joi.number().integer().min(0),
      isaMaxCap: Joi.number().integer().min(0),
      isaDuration: Joi.number().integer().min(0)
    })
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Calculate Funding Validation ============
const calculateFunding = async (req, res, next) => {
  const correctCondition = Joi.object({
    amount: Joi.number().integer().min(0).required()
      .messages({
        'number.min': 'Số tiền không được nhỏ hơn 0',
        'any.required': 'Số tiền là bắt buộc'
      }),
    mode: Joi.string()
      .valid(...Object.values(FUNDING_LEARNER_PAY_MODE))
      .required()
      .messages({
        'any.only': 'Hình thức thanh toán không hợp lệ',
        'any.required': 'Hình thức thanh toán là bắt buộc'
      })
  })

  try {
    await correctCondition.validateAsync(req.query, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.BAD_REQUEST, error.details?.[0]?.message || error.message))
  }
}

// ============ Check Course ID Validation ============
const checkCourseId = async (req, res, next) => {
  const { courseId } = req.params
  if (!courseId.match(OBJECT_ID_RULE)) {
    next(new ApiError(StatusCodes.BAD_REQUEST, 'ID khóa học không hợp lệ'))
    return
  }
  next()
}

// ============ Check Funding Config ID Validation ============
const checkFundingConfigId = async (req, res, next) => {
  const { id } = req.params
  if (!id.match(OBJECT_ID_RULE)) {
    next(new ApiError(StatusCodes.BAD_REQUEST, 'ID funding config không hợp lệ'))
    return
  }
  next()
}

export const fundingConfigValidation = {
  createFundingConfig,
  updateFundingConfig,
  calculateFunding,
  checkCourseId,
  checkFundingConfigId
}
