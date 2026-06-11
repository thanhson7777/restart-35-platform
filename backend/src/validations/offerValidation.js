import Joi from 'joi'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validator'

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

const validateCreateOffer = async (req, res, next) => {
  const correctCondition = Joi.object({
    applicationId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    jobId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    salaryAmount: Joi.number().integer().min(0).required(),
    salaryCurrency: Joi.string().default('VND'),
    paymentType: Joi.string().valid('monthly', 'hourly', 'project').default('monthly'),
    position: Joi.string().required().trim().max(255),
    startDate: Joi.date().timestamp('javascript').required(),
    probationMonths: Joi.number().integer().min(0).max(12).default(2),
    probationSalary: Joi.number().integer().min(0).allow(null),
    benefits: Joi.array().items(Joi.string()).default([]),
    workingHours: Joi.string().allow('', null),
    location: Joi.string().allow('', null),
    terms: Joi.string().max(2000).allow('', null),
    expiresAt: Joi.date().timestamp('javascript').allow(null)
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

const validateGetOffers = async (req, res, next) => {
  const correctCondition = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10),
    status: Joi.string().valid('pending', 'accepted', 'rejected', 'expired', 'withdrawn'),
    applicationId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    jobId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
  })

  try {
    await correctCondition.validateAsync(req.query, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.BAD_REQUEST, error.message))
  }
}

const validateAcceptOffer = async (req, res, next) => {
  const correctCondition = Joi.object({
    responseNote: Joi.string().max(1000).allow('', null)
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

const validateRejectOffer = async (req, res, next) => {
  const correctCondition = Joi.object({
    reason: Joi.string().required().trim().min(5).max(500)
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

const validateWithdrawOffer = async (req, res, next) => {
  const correctCondition = Joi.object({
    reason: Joi.string().max(500).allow('', null)
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

export const offerValidation = {
  checkId,
  validateCreateOffer,
  validateGetOffers,
  validateAcceptOffer,
  validateRejectOffer,
  validateWithdrawOffer
}
