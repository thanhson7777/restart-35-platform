import Joi from 'joi'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import {
  OBJECT_ID_RULE,
  OBJECT_ID_RULE_MESSAGE
} from '~/utils/validator'
import {
  JOB_TYPES,
  EDUCATION_LEVELS,
  WORKER_PROFILE_STEPS,
  MAX_EMPLOYMENT_HISTORY,
  MAX_SKILLS
} from '~/utils/constants'

// ============ Step 1: Basic Info Validation ============
const basicInfoValidation = Joi.object({
  age: Joi.number().integer().min(35).max(65).required()
    .messages({
      'number.base': 'Tuổi phải là số',
      'number.min': 'Tuổi phải từ 35 trở lên',
      'number.max': 'Tuổi phải từ 65 trở xuống',
      'any.required': 'Tuổi là bắt buộc'
    }),
  gender: Joi.string().valid('male', 'female', 'other').required()
    .messages({
      'any.only': 'Giới tính không hợp lệ',
      'any.required': 'Giới tính là bắt buộc'
    }),
  province: Joi.string().required()
    .messages({
      'any.required': 'Tỉnh/Thành phố là bắt buộc'
    }),
  district: Joi.string().allow(''),
  education: Joi.string().valid(...Object.values(EDUCATION_LEVELS)).required()
    .messages({
      'any.only': 'Trình độ học vấn không hợp lệ',
      'any.required': 'Trình độ học vấn là bắt buộc'
    }),
  maritalStatus: Joi.string().valid('single', 'married', 'divorced', 'widowed').required()
    .messages({
      'any.only': 'Tình trạng hôn nhân không hợp lệ',
      'any.required': 'Tình trạng hôn nhân là bắt buộc'
    }),
  phone: Joi.string().allow('')
})

// ============ Step 2: Employment History Validation ============
const employmentHistoryItemValidation = Joi.object({
  companyName: Joi.string().allow(''),
  position: Joi.string().allow(''),
  duration: Joi.number().integer().min(0).max(600)
    .messages({
      'number.max': 'Thời gian làm việc tối đa 50 năm (600 tháng)'
    }),
  jobType: Joi.string().valid(...Object.values(JOB_TYPES)),
  description: Joi.string().allow('')
})

// Validation cho employmentHistory - hỗ trợ cả array (có kinh nghiệm) và object (skip)
const employmentHistoryValidation = Joi.alternatives().try(
  // Format 1: Array (có kinh nghiệm)
  Joi.array()
    .items(employmentHistoryItemValidation)
    .max(MAX_EMPLOYMENT_HISTORY)
    .messages({ 'array.max': `Chỉ được nhập tối đa ${MAX_EMPLOYMENT_HISTORY} công việc` }),

  // Format 2: Object skip với status "không có"
  Joi.object({
    status: Joi.string().valid('không có').required(),
    skipped_at: Joi.date().timestamp('javascript').optional()
  }).unknown(true)
)

// ============ Step 3: Barriers Validation ============
const barriersValidation = Joi.object({
  health: Joi.boolean().default(false),
  family: Joi.boolean().default(false),
  techGap: Joi.boolean().default(false),
  location: Joi.boolean().default(false),
  other: Joi.boolean().default(false),
  otherDescription: Joi.string().allow('')
}).custom((value, helpers) => {
  if (value.other && !value.otherDescription) {
    return helpers.error('any.custom', { message: 'Vui lòng mô tả rào cản khác' })
  }
  return value
})

// ============ Step 4: Aspirations Validation ============
const aspirationsValidation = Joi.object({
  targetJob: Joi.string().allow(''),
  targetJobNoPreference: Joi.boolean().default(false),
  targetSalary: Joi.number().integer().min(0).max(1000000000)
    .messages({
      'number.max': 'Mức lương không hợp lệ'
    }),
  targetProvince: Joi.string().allow(''),
  preferredJobType: Joi.string().valid(...Object.values(JOB_TYPES)),
  skills: Joi.array().items(Joi.string()).max(MAX_SKILLS)
    .messages({
      'array.max': `Chỉ được chọn tối đa ${MAX_SKILLS} kỹ năng`
    }),
  wantsToStartBusiness: Joi.boolean().default(false),
  description: Joi.string().allow('')
})

// ============ Step Validations ============
const step1 = async (req, res, next) => {
  const correctCondition = basicInfoValidation

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

const step2 = async (req, res, next) => {
  const correctCondition = employmentHistoryValidation

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

const step3 = async (req, res, next) => {
  const correctCondition = barriersValidation

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

const step4 = async (req, res, next) => {
  const correctCondition = aspirationsValidation

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
  }
}

// ============ Autosave Validation ============
const autosave = async (req, res, next) => {
  const correctCondition = Joi.object({
    step: Joi.number().integer().min(1).max(WORKER_PROFILE_STEPS.MAX_STEP).required(),
    data: Joi.object({
      basicInfo: Joi.object().unknown(true),
      employmentHistory: Joi.alternatives().try(
        Joi.array().items(Joi.object().unknown(true)),
        Joi.object({
          status: Joi.string().valid('không có').required(),
          skipped_at: Joi.date().timestamp('javascript').optional()
        }).unknown(true)
      ),
      barriers: Joi.object().unknown(true),
      aspirations: Joi.object().unknown(true),
      interests: Joi.alternatives().try(
        Joi.array().items(Joi.string()),
        Joi.object({
          interests: Joi.array().items(Joi.string()),
          status: Joi.string().valid('không có')
        }).unknown(true),
        Joi.string().valid('không có')
      ).optional()
    }).unknown(true)
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.details?.[0]?.message || error.message))
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

export const workerProfileValidation = {
  step1,
  step2,
  step3,
  step4,
  autosave,
  checkId
}
