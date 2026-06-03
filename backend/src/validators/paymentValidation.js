import Joi from 'joi'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import {
  OBJECT_ID_RULE,
  OBJECT_ID_RULE_MESSAGE
} from '~/utils/validator'
import {
  PAYMENT_METHOD,
  PAYMENT_STATUS
} from '~/utils/constants'

// ============ Create Payment Validation ============
const createPayment = async (req, res, next) => {
  const correctCondition = Joi.object({
    enrollmentId: Joi.string().required()
      .pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    courseId: Joi.string().required()
      .pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    method: Joi.string()
      .valid(...Object.values(PAYMENT_METHOD))
      .required()
      .messages({
        'any.only': 'Phương thức thanh toán không hợp lệ',
        'any.required': 'Phương thức thanh toán là bắt buộc'
      }),
    amount: Joi.number().integer().min(1).required()
      .messages({
        'number.min': 'Số tiền phải lớn hơn 0',
        'any.required': 'Số tiền là bắt buộc'
      }),
    installments: Joi.array().items(
      Joi.object({
        installmentNumber: Joi.number().integer().required(),
        amount: Joi.number().integer().min(0).required(),
        dueDate: Joi.date().timestamp('javascript').allow(null)
      })
    ).optional()
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Update Payment Status Validation ============
const updatePaymentStatus = async (req, res, next) => {
  const correctCondition = Joi.object({
    status: Joi.string()
      .valid(...Object.values(PAYMENT_STATUS))
      .required()
      .messages({
        'any.only': 'Trạng thái thanh toán không hợp lệ',
        'any.required': 'Trạng thái là bắt buộc'
      }),
    transactionId: Joi.string().allow('', null)
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Refund Payment Validation ============
const refundPayment = async (req, res, next) => {
  const correctCondition = Joi.object({
    reason: Joi.string().max(1000).allow('', null)
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Check Payment ID Validation ============
const checkPaymentId = async (req, res, next) => {
  const { id } = req.params
  if (!id.match(OBJECT_ID_RULE)) {
    next(new ApiError(StatusCodes.BAD_REQUEST, 'ID thanh toán không hợp lệ'))
    return
  }
  next()
}

// ============ Check Gateway Validation ============
const checkGateway = async (req, res, next) => {
  const { gateway } = req.params
  const validGateways = ['momo', 'vnpay', 'zalopay']
  if (!validGateways.includes(gateway)) {
    next(new ApiError(StatusCodes.BAD_REQUEST, 'Payment gateway không hợp lệ'))
    return
  }
  next()
}

export const paymentValidation = {
  createPayment,
  updatePaymentStatus,
  refundPayment,
  checkPaymentId,
  checkGateway
}
