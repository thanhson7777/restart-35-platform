import Joi from 'joi'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import {
  OBJECT_ID_RULE,
  OBJECT_ID_RULE_MESSAGE
} from '~/utils/validator'
import { MAX_ITEM_PER_PAGE, PARTNERSHIP_STATUS } from '~/utils/constants'

const RECRUITMENT_NEEDS_SCHEMA = Joi.object({
  jobTitle: Joi.string().trim().max(255).required(),
  jobQuantity: Joi.number().integer().min(1).required(),
  salaryRange: Joi.object({
    min: Joi.number().min(0).allow(null),
    max: Joi.number().min(0).allow(null),
    currency: Joi.string().default('VND')
  }).allow(null),
  requirements: Joi.array().items(Joi.string()).default([]),
  targetSkills: Joi.array().items(Joi.string()).default([]),
  employmentType: Joi.string().allow('', null),
  categoryId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE).allow(null),
  deliveryType: Joi.string().valid('live', 'offline', 'video').allow(null)
})

const AGREED_TERMS_SCHEMA = Joi.object({
  linkedCourseIds: Joi.array().items(
    Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
  ).default([]),
  tuitionFeePerLearner: Joi.number().min(0).allow(null),
  paymentTerms: Joi.string().allow('', null),
  placementGuarantee: Joi.boolean().default(false),
  guaranteePeriodMonths: Joi.number().integer().min(0).allow(null),
  referralBonus: Joi.number().min(0).default(0)
})

const validate = async (schema, data, next, status = StatusCodes.UNPROCESSABLE_ENTITY) => {
  try {
    await schema.validateAsync(data, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(status, error.details?.[0]?.message || error.message))
  }
}

const createPartnership = async (req, res, next) => {
  return await validate(Joi.object({
    trainerId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    requestedCourseIds: Joi.array().items(
      Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
    ).default([]),
    recruitmentNeeds: RECRUITMENT_NEEDS_SCHEMA.required(),
    referralBonus: Joi.number().min(0).default(0),
    tuitionFee: Joi.number().min(0).allow(null),
    notes: Joi.string().max(2000).allow('', null),
    message: Joi.string().max(2000).allow('', null),
    expiresAt: Joi.date().timestamp('javascript').allow(null)
  }), req.body, next)
}

const queryPartnerships = async (req, res, next) => {
  return await validate(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(MAX_ITEM_PER_PAGE).default(10),
    status: Joi.string().valid(...Object.values(PARTNERSHIP_STATUS)),
    enterpriseId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    trainerId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    courseId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
  }), req.query, next, StatusCodes.BAD_REQUEST)
}

const checkId = async (req, res, next) => {
  return await validate(Joi.object({
    id: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
  }), req.params, next, StatusCodes.BAD_REQUEST)
}

const respondPartnership = async (req, res, next) => {
  return await validate(Joi.object({
    status: Joi.string().valid(PARTNERSHIP_STATUS.NEGOTIATING, PARTNERSHIP_STATUS.REJECTED).default(PARTNERSHIP_STATUS.NEGOTIATING),
    proposedCourseIds: Joi.array().items(
      Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
    ).default([]),
    tuitionFee: Joi.number().min(0).allow(null),
    message: Joi.string().max(2000).allow('', null)
  }), req.body, next)
}

const confirmPartnership = async (req, res, next) => {
  return await validate(Joi.object({
    agreedTerms: AGREED_TERMS_SCHEMA.required(),
    linkedCourseIds: Joi.array().items(
      Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
    ).default([]),
    expiresAt: Joi.date().timestamp('javascript').allow(null),
    signedAt: Joi.date().timestamp('javascript').allow(null)
  }), req.body, next)
}

const cancelPartnership = async (req, res, next) => {
  return await validate(Joi.object({
    reason: Joi.string().max(2000).allow('', null)
  }), req.body, next)
}

const negotiatePartnership = async (req, res, next) => {
  return await validate(Joi.object({
    proposedCourseIds: Joi.array().items(
      Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
    ).default([]),
    agreedTerms: AGREED_TERMS_SCHEMA,
    message: Joi.string().max(2000).allow('', null)
  }), req.body, next)
}

const expirePartnership = async (req, res, next) => {
  return await validate(Joi.object({
    reason: Joi.string().max(2000).allow('', null)
  }), req.body, next)
}

export const partnershipValidation = {
  createPartnership,
  queryPartnerships,
  checkId,
  respondPartnership,
  confirmPartnership,
  cancelPartnership,
  negotiatePartnership,
  expirePartnership
}
