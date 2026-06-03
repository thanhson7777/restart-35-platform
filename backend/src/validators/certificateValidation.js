import Joi from 'joi'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import {
  OBJECT_ID_RULE,
  OBJECT_ID_RULE_MESSAGE
} from '~/utils/validator'
import { CERTIFICATE_TYPES } from '~/utils/constants'

// ============ Create Certificate Validation ============
const createCertificate = async (req, res, next) => {
  const correctCondition = Joi.object({
    enrollmentId: Joi.string().required()
      .pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    courseId: Joi.string().required()
      .pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    type: Joi.string()
      .valid(...Object.values(CERTIFICATE_TYPES))
      .required()
      .messages({
        'any.only': 'Loại chứng chỉ không hợp lệ',
        'any.required': 'Loại chứng chỉ là bắt buộc'
      }),
    score: Joi.number().min(0).max(100).allow(null),
    skills: Joi.array().items(Joi.string().trim().max(100)).default([]),
    expiryDate: Joi.date().timestamp('javascript').allow(null),
    issuedBy: Joi.string().allow('', null)
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Update Certificate Validation ============
const updateCertificate = async (req, res, next) => {
  const correctCondition = Joi.object({
    type: Joi.string()
      .valid(...Object.values(CERTIFICATE_TYPES)),
    score: Joi.number().min(0).max(100).allow(null),
    skills: Joi.array().items(Joi.string().trim().max(100)),
    expiryDate: Joi.date().timestamp('javascript').allow(null),
    credentialUrl: Joi.string().allow('', null),
    status: Joi.string().valid('active', 'revoked')
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Revoke Certificate Validation ============
const revokeCertificate = async (req, res, next) => {
  const correctCondition = Joi.object({})

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Check Certificate ID Validation ============
const checkCertificateId = async (req, res, next) => {
  const { id } = req.params
  if (id && !id.match(OBJECT_ID_RULE)) {
    next(new ApiError(StatusCodes.BAD_REQUEST, 'ID chứng chỉ không hợp lệ'))
    return
  }
  next()
}

export const certificateValidation = {
  createCertificate,
  updateCertificate,
  revokeCertificate,
  checkCertificateId
}
