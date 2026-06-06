import Joi from 'joi'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import {
  OBJECT_ID_RULE,
  OBJECT_ID_RULE_MESSAGE
} from '~/utils/validator'
import {
  MAX_ITEM_PER_PAGE,
  COURSE_SPONSORSHIP_STATUS,
  COURSE_SPONSORSHIP_MODEL,
  DISBURSEMENT_MODEL,
  ORGANIZATION_TYPES,
  SCHOLARSHIP_COVERAGE
} from '~/utils/constants'

const LINKED_COURSE_SCHEMA = Joi.object({
  courseId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  coverage: Joi.string().valid(...Object.values(SCHOLARSHIP_COVERAGE)).default(SCHOLARSHIP_COVERAGE.PARTIAL),
  maxAmount: Joi.number().integer().min(0).allow(null)
})

const ELIGIBILITY_CRITERIA_SCHEMA = Joi.object({
  ageMin: Joi.number().integer().min(18).max(100).allow(null),
  ageMax: Joi.number().integer().min(18).max(100).allow(null),
  maxIncome: Joi.number().integer().min(0).allow(null),
  provinces: Joi.array().items(Joi.string()).default([]),
  targetSkills: Joi.array().items(Joi.string()).default([]),
  education: Joi.array().items(Joi.string()).default([]),
  employmentStatus: Joi.array().items(Joi.string()).default([])
})

const validate = async (schema, data, next, status = StatusCodes.UNPROCESSABLE_ENTITY) => {
  try {
    await schema.validateAsync(data, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(status, error.details?.[0]?.message || error.message))
  }
}

const createCourseSponsorship = async (req, res, next) => {
  return await validate(Joi.object({
    sponsorType: Joi.string().valid(ORGANIZATION_TYPES.ENTERPRISE, ORGANIZATION_TYPES.NGO).required(),
    title: Joi.string().trim().max(255).required(),
    description: Joi.string().max(5000).allow('', null),
    fundingModel: Joi.string().valid(...Object.values(COURSE_SPONSORSHIP_MODEL)).default(COURSE_SPONSORSHIP_MODEL.ENTERPRISE),
    linkedCourses: Joi.array().items(LINKED_COURSE_SCHEMA).min(1).required(),
    budget: Joi.number().integer().min(0).required(),
    coverageType: Joi.string().valid(...Object.values(SCHOLARSHIP_COVERAGE)).default(SCHOLARSHIP_COVERAGE.PARTIAL),
    maxAmountPerLearner: Joi.number().integer().min(0).allow(null),
    eligibilityCriteria: ELIGIBILITY_CRITERIA_SCHEMA,
    disbursementModel: Joi.string().valid(...Object.values(DISBURSEMENT_MODEL)).default(DISBURSEMENT_MODEL.UPFRONT),
    autoApprove: Joi.boolean().default(false),
    priorityRecruitment: Joi.boolean().default(false),
    clawbackPolicy: Joi.object({
      enabled: Joi.boolean().default(false),
      refundOnDrop: Joi.boolean().default(false),
      refundOnNoShow: Joi.boolean().default(false),
      notes: Joi.string().allow('', null)
    }),
    startsAt: Joi.date().timestamp('javascript').allow(null),
    expiresAt: Joi.date().timestamp('javascript').allow(null)
  }), req.body, next)
}

const queryCourseSponsorships = async (req, res, next) => {
  return await validate(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(MAX_ITEM_PER_PAGE).default(10),
    sponsorType: Joi.string().valid(ORGANIZATION_TYPES.ENTERPRISE, ORGANIZATION_TYPES.NGO),
    status: Joi.string().valid(...Object.values(COURSE_SPONSORSHIP_STATUS)),
    courseId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    sponsorId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
  }), req.query, next, StatusCodes.BAD_REQUEST)
}

const checkId = async (req, res, next) => {
  return await validate(Joi.object({
    id: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
  }), req.params, next, StatusCodes.BAD_REQUEST)
}

const updateCourseSponsorship = async (req, res, next) => {
  return await validate(Joi.object({
    title: Joi.string().trim().max(255),
    description: Joi.string().max(5000).allow('', null),
    fundingModel: Joi.string().valid(...Object.values(COURSE_SPONSORSHIP_MODEL)),
    linkedCourses: Joi.array().items(LINKED_COURSE_SCHEMA).min(1),
    budget: Joi.number().integer().min(0),
    coverageType: Joi.string().valid(...Object.values(SCHOLARSHIP_COVERAGE)),
    maxAmountPerLearner: Joi.number().integer().min(0).allow(null),
    eligibilityCriteria: ELIGIBILITY_CRITERIA_SCHEMA,
    disbursementModel: Joi.string().valid(...Object.values(DISBURSEMENT_MODEL)),
    autoApprove: Joi.boolean(),
    priorityRecruitment: Joi.boolean(),
    clawbackPolicy: Joi.object({
      enabled: Joi.boolean(),
      refundOnDrop: Joi.boolean(),
      refundOnNoShow: Joi.boolean(),
      notes: Joi.string().allow('', null)
    }),
    startsAt: Joi.date().timestamp('javascript').allow(null),
    expiresAt: Joi.date().timestamp('javascript').allow(null)
  }), req.body, next)
}

const approveCourseSponsorship = async (req, res, next) => {
  return await validate(Joi.object({
    status: Joi.string().valid(COURSE_SPONSORSHIP_STATUS.ACTIVE).default(COURSE_SPONSORSHIP_STATUS.ACTIVE)
  }), req.body, next)
}

const pauseCourseSponsorship = async (req, res, next) => {
  return await validate(Joi.object({
    reason: Joi.string().max(2000).allow('', null)
  }), req.body, next)
}

const resumeCourseSponsorship = async (req, res, next) => {
  return await validate(Joi.object({
    reason: Joi.string().max(2000).allow('', null)
  }), req.body, next)
}

const linkCourse = async (req, res, next) => {
  return await validate(Joi.object({
    courseId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    coverage: Joi.string().valid(...Object.values(SCHOLARSHIP_COVERAGE)).default(SCHOLARSHIP_COVERAGE.PARTIAL),
    maxAmount: Joi.number().integer().min(0).allow(null)
  }), req.body, next)
}

const unlinkCourse = async (req, res, next) => {
  return await validate(Joi.object({
    courseId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
  }), req.body, next)
}

export const courseSponsorshipValidation = {
  createCourseSponsorship,
  queryCourseSponsorships,
  checkId,
  updateCourseSponsorship,
  approveCourseSponsorship,
  pauseCourseSponsorship,
  resumeCourseSponsorship,
  linkCourse,
  unlinkCourse
}
