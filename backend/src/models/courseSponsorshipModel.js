import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validator'
import {
  COURSE_SPONSORSHIP_STATUS,
  COURSE_SPONSORSHIP_MODEL,
  DISBURSEMENT_MODEL,
  ORGANIZATION_TYPES,
  SCHOLARSHIP_COVERAGE
} from '~/utils/constants'
import { normalize, normalizeList } from '~/utils/provinceMap'

const COURSE_SPONSORSHIP_COLLECTION_NAME = 'course_sponsorships'

const LINKED_COURSE_SCHEMA = Joi.object({
  courseId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  coverage: Joi.string()
    .valid(...Object.values(SCHOLARSHIP_COVERAGE))
    .default(SCHOLARSHIP_COVERAGE.PARTIAL),
  maxAmount: Joi.number().integer().min(0).allow(null).default(null)
})

const ELIGIBILITY_CRITERIA_SCHEMA = Joi.object({
  ageMin: Joi.number().integer().min(18).max(100).allow(null).default(null),
  ageMax: Joi.number().integer().min(18).max(100).allow(null).default(null),
  maxIncome: Joi.number().integer().min(0).allow(null).default(null),
  provinces: Joi.array().items(Joi.string()).default([]),
  targetSkills: Joi.array().items(Joi.string()).default([]),
  education: Joi.array().items(Joi.string()).default([]),
  employmentStatus: Joi.array().items(Joi.string()).default([])
}).default({
  ageMin: null,
  ageMax: null,
  maxIncome: null,
  provinces: [],
  targetSkills: [],
  education: [],
  employmentStatus: []
})

const COURSE_SPONSORSHIP_COLLECTION_SCHEMA = Joi.object({
  sponsorType: Joi.string()
    .valid(ORGANIZATION_TYPES.ENTERPRISE, ORGANIZATION_TYPES.NGO)
    .required(),
  sponsorId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  title: Joi.string().trim().max(255).required(),
  description: Joi.string().max(5000).allow('', null).default(null),
  fundingModel: Joi.string()
    .valid(...Object.values(COURSE_SPONSORSHIP_MODEL))
    .default(COURSE_SPONSORSHIP_MODEL.ENTERPRISE),
  linkedCourses: Joi.array().items(LINKED_COURSE_SCHEMA).min(1).required(),
  budget: Joi.number().integer().min(0).required(),
  targetLearners: Joi.number().integer().min(1).required(),
  spent: Joi.number().integer().min(0).default(0),
  remaining: Joi.number().integer().min(0).default(0),
  coverageType: Joi.string()
    .valid(...Object.values(SCHOLARSHIP_COVERAGE))
    .default(SCHOLARSHIP_COVERAGE.PARTIAL),
  maxAmountPerLearner: Joi.number().integer().min(0).allow(null).default(null),
  eligibilityCriteria: ELIGIBILITY_CRITERIA_SCHEMA,
  disbursementModel: Joi.string()
    .valid(...Object.values(DISBURSEMENT_MODEL))
    .default(DISBURSEMENT_MODEL.UPFRONT),
  status: Joi.string()
    .valid(...Object.values(COURSE_SPONSORSHIP_STATUS))
    .default(COURSE_SPONSORSHIP_STATUS.DRAFT),
  autoApprove: Joi.boolean().default(false),
  priorityRecruitment: Joi.boolean().default(false),
  linkedJobId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE).allow(null).default(null),
  guaranteedPlacements: Joi.number().integer().min(1).allow(null).default(null),
  autoApplyOnCompletion: Joi.boolean().default(true),
  clawbackPolicy: Joi.object({
    enabled: Joi.boolean().default(false),
    refundOnDrop: Joi.boolean().default(false),
    refundOnNoShow: Joi.boolean().default(false),
    notes: Joi.string().allow('', null).default(null)
  }).default({
    enabled: false,
    refundOnDrop: false,
    refundOnNoShow: false,
    notes: null
  }),
  disbursements: Joi.array().items(
    Joi.object({
      enrollmentId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE).allow(null),
      courseId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE).required(),
      amount: Joi.number().integer().min(0).required(),
      type: Joi.string().valid('disbursement', 'clawback').required(),
      status: Joi.string().valid('pending', 'completed', 'reversed').default('pending'),
      createdAt: Joi.date().timestamp('javascript').default(Date.now)
    })
  ).default([]),
  stats: Joi.object({
    approvedLearners: Joi.number().integer().min(0).default(0),
    activeLearners: Joi.number().integer().min(0).default(0),
    completedLearners: Joi.number().integer().min(0).default(0)
  }).default({
    approvedLearners: 0,
    activeLearners: 0,
    completedLearners: 0
  }),
  startsAt: Joi.date().timestamp('javascript').allow(null).default(null),
  expiresAt: Joi.date().timestamp('javascript').allow(null).default(null),
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(Date.now),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await COURSE_SPONSORSHIP_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
    stripUnknown: true
  })
}

const createNew = async (data, skipValidation = false) => {
  try {
    const normalizedData = {
      ...data,
      remaining: data.remaining ?? data.budget ?? 0
    }
    const validData = skipValidation ? normalizedData : await validateBeforeCreate(normalizedData)
    return await GET_DB().collection(COURSE_SPONSORSHIP_COLLECTION_NAME).insertOne(validData)
  } catch (error) {
    throw new Error(error.message)
  }
}

const findOneById = async (sponsorshipId) => {
  try {
    return await GET_DB().collection(COURSE_SPONSORSHIP_COLLECTION_NAME).findOne({
      _id: new ObjectId(sponsorshipId),
      _destroy: { $ne: true }
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const findByPaginate = async (matchCondition = {}, skip = 0, limit = 10, sort = { createdAt: -1 }) => {
  try {
    const query = {
      ...matchCondition,
      _destroy: { $ne: true }
    }

    const [sponsorships, total] = await Promise.all([
      GET_DB().collection(COURSE_SPONSORSHIP_COLLECTION_NAME)
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray(),
      GET_DB().collection(COURSE_SPONSORSHIP_COLLECTION_NAME).countDocuments(query)
    ])

    return { sponsorships, total }
  } catch (error) {
    throw new Error(error.message)
  }
}

const findBySponsor = async (sponsorId, sponsorType, skip = 0, limit = 10, filters = {}) => {
  return await findByPaginate({ sponsorId, sponsorType, ...filters }, skip, limit)
}

const findActiveByCourse = async (courseId) => {
  try {
    return await GET_DB().collection(COURSE_SPONSORSHIP_COLLECTION_NAME)
      .find({
        'linkedCourses.courseId': courseId,
        status: COURSE_SPONSORSHIP_STATUS.ACTIVE,
        _destroy: { $ne: true }
      })
      .sort({ createdAt: -1 })
      .toArray()
  } catch (error) {
    throw new Error(error.message)
  }
}

const update = async (sponsorshipId, data) => {
  try {
    return await GET_DB().collection(COURSE_SPONSORSHIP_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(sponsorshipId), _destroy: { $ne: true } },
      {
        $set: {
          ...data,
          updatedAt: Date.now()
        }
      },
      { returnDocument: 'after' }
    )
  } catch (error) {
    throw new Error(error.message)
  }
}

const updateStatus = async (sponsorshipId, status) => {
  return await update(sponsorshipId, { status })
}

const softDelete = async (sponsorshipId) => {
  return await update(sponsorshipId, {
    _destroy: true,
    status: COURSE_SPONSORSHIP_STATUS.CANCELLED
  })
}

const checkEligibility = async (profile, sponsorship) => {
  const criteria = sponsorship?.eligibilityCriteria || {}
  const basicInfo = profile?.basicInfo || {}
  const careerProfile = profile?.careerProfile || {}

  if (criteria.ageMin !== null && basicInfo.age && basicInfo.age < criteria.ageMin) {
    return { eligible: false, reason: 'Không đạt độ tuổi tối thiểu.' }
  }

  if (criteria.ageMax !== null && basicInfo.age && basicInfo.age > criteria.ageMax) {
    return { eligible: false, reason: 'Vượt quá độ tuổi tối đa.' }
  }

  if (criteria.maxIncome !== null && basicInfo.monthlyIncome && basicInfo.monthlyIncome > criteria.maxIncome) {
    return { eligible: false, reason: 'Thu nhập vượt quá mức cho phép.' }
  }

  if (criteria.provinces?.length && basicInfo.province) {
    const workerCode = normalize(basicInfo.province)
    const eligibleCodes = normalizeList(criteria.provinces)
    if (!eligibleCodes.includes(workerCode)) {
      return { eligible: false, reason: 'Địa phương không nằm trong phạm vi tài trợ.' }
    }
  }

  if (criteria.education?.length && basicInfo.education && !criteria.education.includes(basicInfo.education)) {
    return { eligible: false, reason: 'Trình độ học vấn không phù hợp.' }
  }

  if (criteria.employmentStatus?.length && careerProfile.currentStatus && !criteria.employmentStatus.includes(careerProfile.currentStatus)) {
    return { eligible: false, reason: 'Tình trạng việc làm không phù hợp.' }
  }

  return { eligible: true, reason: null }
}

const checkAvailability = async (sponsorship, amount = 0) => {
  if (!sponsorship) {
    return { available: false, reason: 'Không tìm thấy chương trình tài trợ.' }
  }

  if (sponsorship.status !== COURSE_SPONSORSHIP_STATUS.ACTIVE) {
    return { available: false, reason: 'Chương trình tài trợ chưa hoạt động.' }
  }

  if (sponsorship.remaining < amount) {
    return { available: false, reason: 'Ngân sách tài trợ không đủ.' }
  }

  return { available: true, reason: null }
}

const incrementSpent = async (sponsorshipId, amount) => {
  try {
    return await GET_DB().collection(COURSE_SPONSORSHIP_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(sponsorshipId), _destroy: { $ne: true } },
      {
        $inc: {
          spent: amount,
          remaining: -amount
        },
        $set: { updatedAt: Date.now() }
      },
      { returnDocument: 'after' }
    )
  } catch (error) {
    throw new Error(error.message)
  }
}

const addDisbursement = async (sponsorshipId, disbursement) => {
  try {
    return await GET_DB().collection(COURSE_SPONSORSHIP_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(sponsorshipId), _destroy: { $ne: true } },
      {
        $push: { disbursements: disbursement },
        $set: { updatedAt: Date.now() }
      },
      { returnDocument: 'after' }
    )
  } catch (error) {
    throw new Error(error.message)
  }
}

const addClawback = async (sponsorshipId, clawback) => {
  try {
    return await GET_DB().collection(COURSE_SPONSORSHIP_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(sponsorshipId), _destroy: { $ne: true } },
      {
        $push: {
          disbursements: {
            ...clawback,
            type: 'clawback'
          }
        },
        $inc: {
          spent: -(clawback.amount || 0),
          remaining: clawback.amount || 0
        },
        $set: { updatedAt: Date.now() }
      },
      { returnDocument: 'after' }
    )
  } catch (error) {
    throw new Error(error.message)
  }
}

const createIndexes = async () => {
  try {
    const db = GET_DB()
    await Promise.all([
      db.collection(COURSE_SPONSORSHIP_COLLECTION_NAME).createIndex({ sponsorType: 1, sponsorId: 1, status: 1 }),
      db.collection(COURSE_SPONSORSHIP_COLLECTION_NAME).createIndex({ 'linkedCourses.courseId': 1, status: 1 }),
      db.collection(COURSE_SPONSORSHIP_COLLECTION_NAME).createIndex({ status: 1, createdAt: -1 }),
      db.collection(COURSE_SPONSORSHIP_COLLECTION_NAME).createIndex({ expiresAt: 1 })
    ])
  } catch (error) {
    console.error('Failed to create course sponsorship indexes:', error.message)
  }
}

export const courseSponsorshipModel = {
  COURSE_SPONSORSHIP_COLLECTION_NAME,
  COURSE_SPONSORSHIP_COLLECTION_SCHEMA,
  validateBeforeCreate,
  createNew,
  findOneById,
  findByPaginate,
  findBySponsor,
  findActiveByCourse,
  update,
  updateStatus,
  softDelete,
  checkEligibility,
  checkAvailability,
  incrementSpent,
  addDisbursement,
  addClawback,
  createIndexes
}
