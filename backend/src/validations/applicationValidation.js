import Joi from 'joi'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validator'
import { RECRUITMENT_APPLICATION_STATUS } from '~/utils/constants'

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

const checkJobId = async (req, res, next) => {
  const condition = Joi.object({
    jobId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
  })

  try {
    await condition.validateAsync(req.params)
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.BAD_REQUEST, error.message))
  }
}

const validateApplyJob = async (req, res, next) => {
  const correctCondition = Joi.object({
    coverLetter: Joi.string().max(2000).allow('', null),
    notes: Joi.string().max(1000).allow('', null),
    source: Joi.string().valid('direct', 'course_linked', 'recommendation', 'ai_suggested').default('direct')
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

const validateGetApplications = async (req, res, next) => {
  const correctCondition = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10),
    status: Joi.string().valid(...Object.values(RECRUITMENT_APPLICATION_STATUS)),
    jobId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    search: Joi.string().allow('', null)
  })

  try {
    await correctCondition.validateAsync(req.query, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.BAD_REQUEST, error.message))
  }
}

const validateUpdateApplicationStatus = async (req, res, next) => {
  const correctCondition = Joi.object({
    status: Joi.string().required().valid(...Object.values(RECRUITMENT_APPLICATION_STATUS)),
    note: Joi.string().max(500).allow('', null)
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

const validateShortlist = async (req, res, next) => {
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

const validateRejectApplication = async (req, res, next) => {
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

export const applicationValidation = {
  checkId,
  checkJobId,
  validateApplyJob,
  validateGetApplications,
  validateUpdateApplicationStatus,
  validateShortlist,
  validateRejectApplication
}
