import Joi from 'joi'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import {
  OBJECT_ID_RULE,
  OBJECT_ID_RULE_MESSAGE
} from '~/utils/validator'
import {
  LEARNING_EVENT_TYPES
} from '~/utils/constants'

// ============ Create Learning Record Validation ============
const createLearningRecord = async (req, res, next) => {
  const correctCondition = Joi.object({
    enrollmentId: Joi.string().required()
      .pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    courseId: Joi.string().required()
      .pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    event_type: Joi.string()
      .valid(...Object.values(LEARNING_EVENT_TYPES))
      .required()
      .messages({
        'any.only': 'Loại sự kiện học tập không hợp lệ',
        'any.required': 'Loại sự kiện là bắt buộc'
      }),
    metadata: Joi.object({
      videoId: Joi.string().allow('', null),
      videoDuration: Joi.number().integer().min(0).allow(null),
      watchedDuration: Joi.number().integer().min(0).allow(null),
      quizId: Joi.string().allow('', null),
      quizTitle: Joi.string().allow('', null),
      score: Joi.number().min(0).max(100).allow(null),
      passed: Joi.boolean().allow(null),
      sessionId: Joi.string().allow('', null),
      sessionTitle: Joi.string().allow('', null),
      moduleId: Joi.string().allow('', null),
      moduleTitle: Joi.string().allow('', null),
      moduleIndex: Joi.number().integer().min(0).allow(null)
    }).default({})
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Query Learning Records Validation ============
const queryLearningRecords = async (req, res, next) => {
  const correctCondition = Joi.object({
    enrollmentId: Joi.string()
      .pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    userId: Joi.string()
      .pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    courseId: Joi.string()
      .pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    event_type: Joi.string()
      .valid(...Object.values(LEARNING_EVENT_TYPES)),
    from: Joi.date().timestamp('javascript').allow(null),
    to: Joi.date().timestamp('javascript').allow(null),
    page: Joi.number().integer().min(1).default(1),
    item_per_page: Joi.number().integer().min(1).max(100).default(10)
  })

  try {
    await correctCondition.validateAsync(req.query, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.BAD_REQUEST, error.details?.[0]?.message || error.message))
  }
}

// ============ Check Enrollment ID Validation ============
const checkEnrollmentId = async (req, res, next) => {
  const { enrollmentId } = req.params
  if (enrollmentId && !enrollmentId.match(OBJECT_ID_RULE)) {
    next(new ApiError(StatusCodes.BAD_REQUEST, 'ID enrollment không hợp lệ'))
    return
  }
  next()
}

export const learningRecordValidation = {
  createLearningRecord,
  queryLearningRecords,
  checkEnrollmentId
}
