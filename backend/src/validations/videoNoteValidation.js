import Joi from 'joi'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validator'

const createNote = async (req, res, next) => {
  const correctCondition = Joi.object({
    enrollmentId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    lessonId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    timestamp: Joi.number().min(0).required(),
    content: Joi.string().required().trim().max(5000),
    tags: Joi.array().items(Joi.string().max(50)).default([]),
    color: Joi.string().valid('yellow', 'green', 'blue').default('yellow')
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

const updateNote = async (req, res, next) => {
  const correctCondition = Joi.object({
    content: Joi.string().trim().max(5000),
    tags: Joi.array().items(Joi.string().max(50)),
    color: Joi.string().valid('yellow', 'green', 'blue')
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
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

const checkEnrollmentId = async (req, res, next) => {
  const condition = Joi.object({
    enrollmentId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
  })

  try {
    await condition.validateAsync(req.params)
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.BAD_REQUEST, error.message))
  }
}

export const videoNoteValidation = {
  createNote,
  updateNote,
  checkId,
  checkEnrollmentId
}
