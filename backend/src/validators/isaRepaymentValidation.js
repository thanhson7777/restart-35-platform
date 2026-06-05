import Joi from 'joi'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import {
  OBJECT_ID_RULE,
  OBJECT_ID_RULE_MESSAGE
} from '~/utils/validator'
import {
  ISA_REPAYMENT_STATUS
} from '~/utils/constants'

// ============ Create ISA Repayment Validation ============
const createIsaRepayment = async (req, res, next) => {
  const correctCondition = Joi.object({
    enrollmentId: Joi.string().required()
      .pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    userId: Joi.string().required()
      .pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    courseId: Joi.string().required()
      .pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    percentage: Joi.number().min(0).max(100).required()
      .messages({
        'number.min': 'Tỷ lệ phần trăm không được nhỏ hơn 0',
        'number.max': 'Tỷ lệ phần trăm không được lớn hơn 100',
        'any.required': 'Tỷ lệ phần trăm là bắt buộc'
      }),
    incomeThreshold: Joi.number().integer().min(0).default(0),
    maxCap: Joi.number().integer().min(0).default(0),
    repaymentPeriod: Joi.object({
      startMonth: Joi.date().timestamp('javascript').required(),
      endMonth: Joi.date().timestamp('javascript').required(),
      currentMonth: Joi.number().integer().min(0).default(0)
    }).required()
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Submit Income Validation ============
const submitIncome = async (req, res, next) => {
  const correctCondition = Joi.object({
    month: Joi.number().integer().min(1).max(12).required()
      .messages({
        'number.min': 'Tháng phải từ 1 đến 12',
        'number.max': 'Tháng phải từ 1 đến 12',
        'any.required': 'Tháng là bắt buộc'
      }),
    year: Joi.number().integer().min(2020).required()
      .messages({ 'any.required': 'Năm là bắt buộc' }),
    income: Joi.number().integer().min(0).required()
      .messages({
        'number.min': 'Thu nhập không được nhỏ hơn 0',
        'any.required': 'Thu nhập là bắt buộc'
      }),
    incomeProof: Joi.string().allow('', null)
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Update Monthly Record Validation ============
const updateMonthlyRecord = async (req, res, next) => {
  const correctCondition = Joi.object({
    year: Joi.number().integer().min(2020).required()
      .messages({
        'number.base': 'Năm phải là số',
        'any.required': 'Năm là bắt buộc để cập nhật bản ghi tháng'
      }),
    income: Joi.number().integer().min(0).optional(),
    paymentAmount: Joi.number().integer().min(0).optional(),
    status: Joi.string()
      .valid(...Object.values(ISA_REPAYMENT_STATUS))
      .optional(),
    paidDate: Joi.date().timestamp('javascript').allow(null).optional(),
    incomeProof: Joi.string().allow('', null).optional()
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Check ISA Repayment ID Validation ============
const checkIsaRepaymentId = async (req, res, next) => {
  const { id } = req.params
  if (!id.match(OBJECT_ID_RULE)) {
    next(new ApiError(StatusCodes.BAD_REQUEST, 'ID ISA repayment không hợp lệ'))
    return
  }
  next()
}

// ============ Check Month Param Validation ============
const checkMonth = async (req, res, next) => {
  const { month } = req.params
  const monthNum = parseInt(month)
  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    next(new ApiError(StatusCodes.BAD_REQUEST, 'Tháng không hợp lệ (1-12)'))
    return
  }
  next()
}

export const isaRepaymentValidation = {
  createIsaRepayment,
  submitIncome,
  updateMonthlyRecord,
  checkIsaRepaymentId,
  checkMonth
}
