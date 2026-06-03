import Joi from 'joi'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import {
  OBJECT_ID_RULE,
  OBJECT_ID_RULE_MESSAGE
} from '~/utils/validator'
import { PLACEMENT_STATUS } from '~/utils/constants'

// ============ Create Placement Validation ============
const createPlacement = async (req, res, next) => {
  const correctCondition = Joi.object({
    enrollmentId: Joi.string().required()
      .pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    courseId: Joi.string().required()
      .pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    employer: Joi.object({
      name: Joi.string().required().trim().max(255),
      industry: Joi.string().allow('', null),
      address: Joi.string().allow('', null),
      contactPerson: Joi.string().allow('', null),
      contactEmail: Joi.string().allow('', null)
    }).required(),
    job: Joi.object({
      title: Joi.string().required().trim().max(255),
      salary: Joi.number().min(0).allow(null),
      currency: Joi.string().default('VND'),
      employmentType: Joi.string().allow('', null)
    }).required(),
    referralSource: Joi.string().allow('', null)
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Update Placement Validation ============
const updatePlacement = async (req, res, next) => {
  const correctCondition = Joi.object({
    employer: Joi.object({
      name: Joi.string().trim().max(255),
      industry: Joi.string().allow('', null),
      address: Joi.string().allow('', null),
      contactPerson: Joi.string().allow('', null),
      contactEmail: Joi.string().allow('', null)
    }),
    job: Joi.object({
      title: Joi.string().trim().max(255),
      salary: Joi.number().min(0).allow(null),
      currency: Joi.string().default('VND'),
      employmentType: Joi.string().allow('', null)
    }),
    referralSource: Joi.string().allow('', null),
    interviewDate: Joi.date().timestamp('javascript').allow(null),
    notes: Joi.string().allow('', null)
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Update Placement Status Validation ============
const updatePlacementStatus = async (req, res, next) => {
  const correctCondition = Joi.object({
    status: Joi.string()
      .valid(...Object.values(PLACEMENT_STATUS))
      .required()
      .messages({
        'any.only': 'Trạng thái placement không hợp lệ',
        'any.required': 'Trạng thái là bắt buộc'
      }),
    interviewDate: Joi.date().timestamp('javascript').allow(null),
    offerDetails: Joi.object({
      offeredDate: Joi.date().timestamp('javascript').allow(null),
      offeredSalary: Joi.number().min(0).allow(null),
      startDate: Joi.date().timestamp('javascript').allow(null)
    }).allow(null),
    startedDate: Joi.date().timestamp('javascript').allow(null)
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Resign Placement Validation ============
const resignPlacement = async (req, res, next) => {
  const correctCondition = Joi.object({
    resignationReason: Joi.string().allow('', null),
    resignationDate: Joi.date().timestamp('javascript').default(Date.now())
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Check Placement ID Validation ============
const checkPlacementId = async (req, res, next) => {
  const { id } = req.params
  if (id && !id.match(OBJECT_ID_RULE)) {
    next(new ApiError(StatusCodes.BAD_REQUEST, 'ID placement không hợp lệ'))
    return
  }
  next()
}

export const placementValidation = {
  createPlacement,
  updatePlacement,
  updatePlacementStatus,
  resignPlacement,
  checkPlacementId
}
