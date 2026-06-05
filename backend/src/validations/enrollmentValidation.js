import Joi from 'joi'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import {
  OBJECT_ID_RULE,
  OBJECT_ID_RULE_MESSAGE
} from '~/utils/validator'
import {
  ENROLLMENT_STATUS,
  ENROLLMENT_PAYMENT_STATUS,
  ENROLLMENT_SOURCE,
  COMPLETION_STATUS,
  MAX_ITEM_PER_PAGE
} from '~/utils/constants'

// ============ Create Enrollment Validation ============
const createEnrollment = async (req, res, next) => {
  const correctCondition = Joi.object({
    courseId: Joi.string().required()
      .pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    scheduleId: Joi.string().allow(null, ''),
    motivation: Joi.string().max(1000).allow(''),
    source: Joi.string()
      .valid(...Object.values(ENROLLMENT_SOURCE))
      .default(ENROLLMENT_SOURCE.DIRECT),
    scholarshipId: Joi.string().allow(null, '')
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Update Progress Validation ============
const updateProgress = async (req, res, next) => {
  const correctCondition = Joi.object({
    progress: Joi.object({
      percentage: Joi.number().min(0).max(100).required(),
      currentLesson: Joi.number().integer().min(0),
      totalLessons: Joi.number().integer().min(0)
    }).required(),
    assessments: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        score: Joi.number().min(0).max(100).allow(null),
        passed: Joi.boolean().allow(null),
        date: Joi.date().timestamp().allow(null)
      })
    ),
    attendance: Joi.object({
      present: Joi.number().integer().min(0),
      absent: Joi.number().integer().min(0),
      late: Joi.number().integer().min(0),
      totalSessions: Joi.number().integer().min(0)
    }),
    notes: Joi.string().max(2000).allow('')
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Update Status Validation ============
const updateStatus = async (req, res, next) => {
  const correctCondition = Joi.object({
    status: Joi.string()
      .valid(...Object.values(ENROLLMENT_STATUS))
      .required(),
    dropReason: Joi.string().max(1000).allow('', null),
    notes: Joi.string().max(2000).allow('', null),
    startDate: Joi.date().timestamp().allow(null),
    endDate: Joi.date().timestamp().allow(null)
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Cancel Enrollment Validation ============
const cancelEnrollment = async (req, res, next) => {
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

// ============ Update Attendance Validation ============
const updateAttendance = async (req, res, next) => {
  const correctCondition = Joi.object({
    present: Joi.number().integer().min(0).required(),
    absent: Joi.number().integer().min(0).required(),
    late: Joi.number().integer().min(0).required(),
    totalSessions: Joi.number().integer().min(0).required()
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Query Enrollments Validation ============
const queryEnrollments = async (req, res, next) => {
  const correctCondition = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(MAX_ITEM_PER_PAGE).default(10),
    status: Joi.string().valid(...Object.values(ENROLLMENT_STATUS)),
    source: Joi.string().valid(...Object.values(ENROLLMENT_SOURCE)),
    courseId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    startDate: Joi.date().timestamp(),
    endDate: Joi.date().timestamp(),
    sortBy: Joi.string().valid('enrolledAt', 'progress', 'status').default('enrolledAt'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
    search: Joi.string().allow('', null),
    riskLevel: Joi.string().valid('low', 'medium', 'high', 'critical').allow('', null)
  })

  try {
    await correctCondition.validateAsync(req.query, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.BAD_REQUEST, error.details?.[0]?.message || error.message))
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

// ============ Check Course ID Validation ============
const checkCourseId = async (req, res, next) => {
  const condition = Joi.object({
    courseId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
  })

  try {
    await condition.validateAsync(req.params)
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.BAD_REQUEST, error.message))
  }
}

// ============ Drop Enrollment Validation ============
const dropEnrollment = async (req, res, next) => {
  const correctCondition = Joi.object({
    dropReason: Joi.string().max(1000).allow('', null)
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Suspend Enrollment Validation ============
const suspendEnrollment = async (req, res, next) => {
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

// ============ Complete Enrollment Validation ============
const completeEnrollment = async (req, res, next) => {
  const correctCondition = Joi.object({
    score: Joi.number().min(0).max(100).allow(null),
    notes: Joi.string().max(2000).allow('', null)
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Fail Enrollment Validation ============
const failEnrollment = async (req, res, next) => {
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

// ============ Update Payment Status Validation ============
const updatePaymentStatus = async (req, res, next) => {
  const correctCondition = Joi.object({
    payment_status: Joi.string()
      .valid(...Object.values(ENROLLMENT_PAYMENT_STATUS))
      .required()
      .messages({
        'any.only': 'Trạng thái thanh toán không hợp lệ',
        'any.required': 'Trạng thái thanh toán là bắt buộc'
      })
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

export const enrollmentValidation = {
  createEnrollment,
  updateProgress,
  updateStatus,
  cancelEnrollment,
  updateAttendance,
  queryEnrollments,
  checkId,
  checkCourseId,
  dropEnrollment,
  suspendEnrollment,
  completeEnrollment,
  failEnrollment,
  updatePaymentStatus
}
