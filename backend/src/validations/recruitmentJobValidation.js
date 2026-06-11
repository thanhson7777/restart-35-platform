import Joi from 'joi'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validator'
import { JOB_TYPES, JOB_LOCATION_TYPE, INTERVIEW_MEETING_TYPE } from '~/utils/constants'

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

const validateCreateJob = async (req, res, next) => {
  const correctCondition = Joi.object({
    title: Joi.string().required().trim().max(255),
    description: Joi.string().required().trim().max(5000),
    type: Joi.string().required().valid(...Object.values(JOB_TYPES)),
    quantity: Joi.number().integer().min(1).max(100).default(1),
    requirements: Joi.array().items(Joi.string()).default([]),
    benefits: Joi.array().items(Joi.string()).default([]),
    salary: Joi.object({
      min: Joi.number().integer().min(0).allow(null),
      max: Joi.number().integer().min(0).allow(null),
      negotiable: Joi.boolean().default(false),
      currency: Joi.string().default('VND')
    }).default({}),
    gender: Joi.string().valid('male', 'female', 'any').default('any'),
    ageRange: Joi.object({
      min: Joi.number().integer().min(18).max(65).allow(null),
      max: Joi.number().integer().min(18).max(65).allow(null)
    }).default({}),
    workingHours: Joi.string().allow('', null),
    category: Joi.string().allow('', null),

    // Requirements
    education: Joi.string().allow('', null),
    experience: Joi.number().integer().min(0).max(50).default(0),
    skills: Joi.array().items(Joi.string()).default([]),
    certifications: Joi.array().items(Joi.string()).default([]),
    languages: Joi.array().items(Joi.string()).default([]),

    // Location
    address: Joi.string().required(),
    province: Joi.string().required(),
    district: Joi.string().allow('', null),
    ward: Joi.string().allow('', null),
    locationType: Joi.string()
      .valid(...Object.values(JOB_LOCATION_TYPE))
      .default(JOB_LOCATION_TYPE.ONSITE),
    coordinates: Joi.object({
      lat: Joi.number().allow(null),
      lng: Joi.number().allow(null)
    }).default({}),

    // Interview Config
    meetingType: Joi.string()
      .valid(...Object.values(INTERVIEW_MEETING_TYPE))
      .default(INTERVIEW_MEETING_TYPE.GOOGLE_MEET),
    officeAddress: Joi.string().allow('', null),
    interviewDuration: Joi.number().integer().min(15).max(180).default(60),
    allowReschedule: Joi.boolean().default(true),
    maxReschedules: Joi.number().integer().min(0).max(5).default(2),
    reminderMinutes: Joi.number().integer().min(15).max(1440).default(60),
    suggestedSlots: Joi.array().items(
      Joi.object({
        dayOfWeek: Joi.number().integer().min(0).max(6),
        startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      })
    ).default([]),

    // Other
    targetCourses: Joi.array().items(Joi.string()).default([]),
    hiringBonus: Joi.object({
      enabled: Joi.boolean().default(false),
      amount: Joi.number().integer().min(0).allow(null),
      payoutCondition: Joi.string().valid('on_hire', 'on_probation_complete').allow(null)
    }).default({}),
    deadline: Joi.date().timestamp('javascript').allow(null)
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

const validateUpdateJob = async (req, res, next) => {
  const correctCondition = Joi.object({
    title: Joi.string().trim().max(255),
    description: Joi.string().trim().max(5000),
    type: Joi.string().valid(...Object.values(JOB_TYPES)),
    quantity: Joi.number().integer().min(1).max(100),
    requirements: Joi.array().items(Joi.string()),
    benefits: Joi.array().items(Joi.string()),
    salary: Joi.object({
      min: Joi.number().integer().min(0).allow(null),
      max: Joi.number().integer().min(0).allow(null),
      negotiable: Joi.boolean(),
      currency: Joi.string()
    }),
    gender: Joi.string().valid('male', 'female', 'any'),
    ageRange: Joi.object({
      min: Joi.number().integer().min(18).max(65).allow(null),
      max: Joi.number().integer().min(18).max(65).allow(null)
    }),
    workingHours: Joi.string().allow('', null),
    category: Joi.string().allow('', null),

    education: Joi.string().allow('', null),
    experience: Joi.number().integer().min(0).max(50),
    skills: Joi.array().items(Joi.string()),
    certifications: Joi.array().items(Joi.string()),
    languages: Joi.array().items(Joi.string()),

    address: Joi.string(),
    province: Joi.string(),
    district: Joi.string().allow('', null),
    ward: Joi.string().allow('', null),
    locationType: Joi.string().valid(...Object.values(JOB_LOCATION_TYPE)),
    coordinates: Joi.object({
      lat: Joi.number().allow(null),
      lng: Joi.number().allow(null)
    }),

    interviewConfig: Joi.object({
      meetingType: Joi.string().valid(...Object.values(INTERVIEW_MEETING_TYPE)),
      officeAddress: Joi.string().allow('', null),
      interviewDuration: Joi.number().integer().min(15).max(180),
      allowReschedule: Joi.boolean(),
      maxReschedules: Joi.number().integer().min(0).max(5),
      reminderMinutes: Joi.number().integer().min(15).max(1440),
      suggestedSlots: Joi.array().items(
        Joi.object({
          dayOfWeek: Joi.number().integer().min(0).max(6),
          startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
          endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        })
      )
    }),

    targetCourses: Joi.array().items(Joi.string()),
    hiringBonus: Joi.object({
      enabled: Joi.boolean(),
      amount: Joi.number().integer().min(0).allow(null),
      payoutCondition: Joi.string().valid('on_hire', 'on_probation_complete').allow(null)
    }),
    deadline: Joi.date().timestamp('javascript').allow(null)
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

const validateGetJobs = async (req, res, next) => {
  const correctCondition = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10),
    status: Joi.string(),
    search: Joi.string().allow('', null),
    province: Joi.string().allow('', null),
    type: Joi.string().valid(...Object.values(JOB_TYPES)),
    locationType: Joi.string().valid(...Object.values(JOB_LOCATION_TYPE))
  })

  try {
    await correctCondition.validateAsync(req.query, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.BAD_REQUEST, error.message))
  }
}

const validateRejectJob = async (req, res, next) => {
  const correctCondition = Joi.object({
    reason: Joi.string().required().trim().min(10).max(500)
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

export const recruitmentJobValidation = {
  checkId,
  validateCreateJob,
  validateUpdateJob,
  validateGetJobs,
  validateRejectJob
}
