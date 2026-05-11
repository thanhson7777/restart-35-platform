import Joi from 'joi'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import {
  OBJECT_ID_RULE,
  OBJECT_ID_RULE_MESSAGE
} from '~/utils/validator'
import {
  SCHEDULE_STATUS,
  SESSION_STATUS,
  LOCATION_TYPES,
  ATTENDANCE_STATUS,
  REMINDER_TYPES,
  MAX_ITEM_PER_PAGE
} from '~/utils/constants'

// ============ Create Schedule Validation ============
const createSchedule = async (req, res, next) => {
  const correctCondition = Joi.object({
    courseId: Joi.string().required()
      .pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    title: Joi.string().required().max(255),
    description: Joi.string().allow(null, ''),
    startDate: Joi.date().timestamp('javascript').required(),
    endDate: Joi.date().timestamp('javascript').required(),
    location: Joi.object({
      type: Joi.string().valid(...Object.values(LOCATION_TYPES)).required(),
      address: Joi.string().allow(null, ''),
      link: Joi.string().uri().allow(null, '')
    }),
    sessions: Joi.array().items(
      Joi.object({
        sessionNumber: Joi.number().integer().min(1).required(),
        title: Joi.string().required().max(255),
        date: Joi.date().timestamp('javascript').required(),
        startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
        endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
        duration: Joi.number().integer().min(1).required(),
        topic: Joi.string().allow(null, ''),
        location: Joi.object({
          type: Joi.string().valid(...Object.values(LOCATION_TYPES)),
          address: Joi.string().allow(null, ''),
          link: Joi.string().uri().allow(null, '')
        })
      })
    ).default([])
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Update Schedule Validation ============
const updateSchedule = async (req, res, next) => {
  const correctCondition = Joi.object({
    title: Joi.string().max(255),
    description: Joi.string().allow(null, ''),
    status: Joi.string().valid(...Object.values(SCHEDULE_STATUS)),
    startDate: Joi.date().timestamp('javascript'),
    endDate: Joi.date().timestamp('javascript'),
    location: Joi.object({
      type: Joi.string().valid(...Object.values(LOCATION_TYPES)),
      address: Joi.string().allow(null, ''),
      link: Joi.string().uri().allow(null, '')
    })
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Add Session Validation ============
const addSession = async (req, res, next) => {
  const correctCondition = Joi.object({
    sessionNumber: Joi.number().integer().min(1).required(),
    title: Joi.string().required().max(255),
    date: Joi.date().timestamp('javascript').required(),
    startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    duration: Joi.number().integer().min(1).required(),
    topic: Joi.string().allow(null, ''),
    instructorId: Joi.string().allow(null, ''),
    location: Joi.object({
      type: Joi.string().valid(...Object.values(LOCATION_TYPES)),
      address: Joi.string().allow(null, ''),
      link: Joi.string().uri().allow(null, '')
    })
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Update Session Validation ============
const updateSession = async (req, res, next) => {
  const correctCondition = Joi.object({
    sessionNumber: Joi.number().integer().min(1),
    title: Joi.string().max(255),
    date: Joi.date().timestamp('javascript'),
    startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    duration: Joi.number().integer().min(1),
    topic: Joi.string().allow(null, ''),
    status: Joi.string().valid(...Object.values(SESSION_STATUS)),
    materials: Joi.array().items(Joi.string().uri()),
    notes: Joi.string().allow(null, '')
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Reschedule Session Validation ============
const rescheduleSession = async (req, res, next) => {
  const correctCondition = Joi.object({
    newDate: Joi.date().timestamp('javascript').required(),
    newStartTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    newEndTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    reason: Joi.string().max(500).allow(null, '')
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Cancel Session Validation ============
const cancelSession = async (req, res, next) => {
  const correctCondition = Joi.object({
    reason: Joi.string().max(500).allow(null, '')
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Record Attendance Validation ============
const recordAttendance = async (req, res, next) => {
  const correctCondition = Joi.object({
    attendance: Joi.array().items(
      Joi.object({
        userId: Joi.string().required(),
        status: Joi.string().valid(...Object.values(ATTENDANCE_STATUS)).required(),
        note: Joi.string().allow(null, '')
      })
    ).min(1).required()
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Query Schedules Validation ============
const querySchedules = async (req, res, next) => {
  const correctCondition = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(MAX_ITEM_PER_PAGE).default(10),
    status: Joi.string().valid(...Object.values(SCHEDULE_STATUS)),
    startDate: Joi.date().timestamp(),
    endDate: Joi.date().timestamp(),
    sortBy: Joi.string().valid('startDate', 'createdAt', 'status').default('createdAt'),
    order: Joi.string().valid('asc', 'desc').default('desc')
  })

  try {
    await correctCondition.validateAsync(req.query, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.BAD_REQUEST, error.details?.[0]?.message || error.message))
  }
}

// ============ Query Sessions Validation ============
const querySessions = async (req, res, next) => {
  const correctCondition = Joi.object({
    status: Joi.string().valid(...Object.values(SESSION_STATUS)),
    fromDate: Joi.date().timestamp(),
    toDate: Joi.date().timestamp()
  })

  try {
    await correctCondition.validateAsync(req.query, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.BAD_REQUEST, error.details?.[0]?.message || error.message))
  }
}

// ============ Check ID Validation ============
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

// ============ Check Session Number Validation ============
const checkSessionNumber = async (req, res, next) => {
  const condition = Joi.object({
    sessionNumber: Joi.number().integer().min(1).required()
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

export const scheduleValidation = {
  createSchedule,
  updateSchedule,
  addSession,
  updateSession,
  rescheduleSession,
  cancelSession,
  recordAttendance,
  querySchedules,
  querySessions,
  checkId,
  checkSessionNumber,
  checkCourseId
}
