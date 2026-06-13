import Joi from 'joi'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validator'
import { INTERVIEW_MEETING_TYPE } from '~/utils/constants'

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

const validateCreateInterview = async (req, res, next) => {
  const correctCondition = Joi.object({
    applicationId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    jobId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    scheduledAt: Joi.date().timestamp('javascript').required(),
    duration: Joi.number().integer().min(15).max(180).default(60),
    meetingType: Joi.string().valid(...Object.values(INTERVIEW_MEETING_TYPE)),
    meetingLink: Joi.string().allow('', null),
    officeAddress: Joi.string().allow('', null),
    interviewerName: Joi.string().allow('', null),
    interviewerEmail: Joi.string().email().allow('', null),
    interviewerPhone: Joi.string().allow('', null),
    interviewerPosition: Joi.string().allow('', null),
    notes: Joi.string().max(2000).allow('', null)
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

const validateGetInterviews = async (req, res, next) => {
  const correctCondition = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10),
    status: Joi.string(),
    applicationId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    jobId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    fromDate: Joi.date().timestamp('javascript'),
    toDate: Joi.date().timestamp('javascript')
  })

  try {
    await correctCondition.validateAsync(req.query, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.BAD_REQUEST, error.message))
  }
}

const validateReschedule = async (req, res, next) => {
  const correctCondition = Joi.object({
    scheduledAt: Joi.date().timestamp('javascript').required(),
    reason: Joi.string().max(500).allow('', null)
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

const validateWorkerReschedule = async (req, res, next) => {
  const correctCondition = Joi.object({
    reason: Joi.string().required().trim().min(5).max(500),
    newPreferredTime: Joi.date().timestamp('javascript').allow(null)
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

const validateCancelInterview = async (req, res, next) => {
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

const validateCompleteInterview = async (req, res, next) => {
  const correctCondition = Joi.object({
    enterpriseRating: Joi.number().integer().min(1).max(5).allow(null),
    enterpriseComment: Joi.string().max(1000).allow('', null),
    enterpriseDecision: Joi.string().valid('hire', 'reject').required(),
    enterpriseSalary: Joi.number().integer().min(0).allow(null),
    enterpriseStartDate: Joi.date().timestamp('javascript').allow(null)
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

const validateWorkerFeedback = async (req, res, next) => {
  const correctCondition = Joi.object({
    workerRating: Joi.number().integer().min(1).max(5).allow(null),
    workerComment: Joi.string().max(1000).allow('', null)
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

export const interviewValidation = {
  checkId,
  validateCreateInterview,
  validateGetInterviews,
  validateReschedule,
  validateWorkerReschedule,
  validateCancelInterview,
  validateCompleteInterview,
  validateWorkerFeedback
}
