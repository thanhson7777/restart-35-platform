import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validator'
import { PARTNERSHIP_STATUS } from '~/utils/constants'

const PARTNERSHIP_COLLECTION_NAME = 'partnerships'

const RECRUITMENT_NEEDS_SCHEMA = Joi.object({
  jobTitle: Joi.string().trim().max(255).required(),
  jobQuantity: Joi.number().integer().min(1).required(),
  salaryRange: Joi.object({
    min: Joi.number().min(0).allow(null),
    max: Joi.number().min(0).allow(null),
    currency: Joi.string().trim().default('VND')
  }).default(null),
  requirements: Joi.array().items(Joi.string().trim()).default([]),
  targetSkills: Joi.array().items(Joi.string().trim()).default([]),
  employmentType: Joi.string().trim().allow('', null).default(null),
  categoryId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE).allow(null).default(null),
  deliveryType: Joi.string().valid('live', 'offline', 'video').allow(null).default(null)
}) // Bỏ .required() để cho phép Doanh nghiệp chỉ tài trợ mà không tuyển dụng

const AGREED_TERMS_SCHEMA = Joi.object({
  linkedCourseIds: Joi.array().items(
    Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
  ).default([]),
  tuitionFeePerLearner: Joi.number().min(0).allow(null).default(null),
  paymentTerms: Joi.string().trim().allow('', null).default(null),
  placementGuarantee: Joi.boolean().default(false),
  guaranteePeriodMonths: Joi.number().integer().min(0).allow(null).default(null),
  referralBonus: Joi.number().min(0).default(0)
}).default(null)

const PARTNERSHIP_COLLECTION_SCHEMA = Joi.object({
  enterpriseId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  trainerId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  requestedCourseIds: Joi.array().items(
    Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
  ).default([]),
  proposedCourseIds: Joi.array().items(
    Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
  ).default([]),
  linkedCourseIds: Joi.array().items(
    Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
  ).default([]),
  recruitmentNeeds: RECRUITMENT_NEEDS_SCHEMA.allow(null).default(null),
  agreedTerms: AGREED_TERMS_SCHEMA,
  proposedSponsorship: Joi.object({
    targetLearners: Joi.number().integer().min(1).default(1),
    coverageType: Joi.string().valid('FULL', 'PARTIAL', 'FIXED_AMOUNT').default('FULL'),
    budget: Joi.number().min(0).allow(null).default(null),
    fixedAmountPerLearner: Joi.number().min(0).allow(null).default(null)
  }).allow(null).default(null),
  status: Joi.string()
    .valid(...Object.values(PARTNERSHIP_STATUS))
    .default(PARTNERSHIP_STATUS.PENDING),
  referralBonus: Joi.number().min(0).default(0),
  tuitionFee: Joi.number().min(0).allow(null).default(null),
  notes: Joi.string().trim().allow('', null).default(null),
  message: Joi.string().trim().allow('', null).default(null),
  respondedAt: Joi.date().timestamp('javascript').allow(null).default(null),
  signedAt: Joi.date().timestamp('javascript').allow(null).default(null),
  expiresAt: Joi.date().timestamp('javascript').allow(null).default(null),
  stats: Joi.object({
    enrolledLearners: Joi.number().integer().min(0).default(0),
    completedLearners: Joi.number().integer().min(0).default(0),
    placedLearners: Joi.number().integer().min(0).default(0)
  }).default({
    enrolledLearners: 0,
    completedLearners: 0,
    placedLearners: 0
  }),
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(Date.now),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await PARTNERSHIP_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
    stripUnknown: true
  })
}

const createNew = async (data, skipValidation = false) => {
  try {
    const validData = skipValidation ? data : await validateBeforeCreate(data)
    return await GET_DB().collection(PARTNERSHIP_COLLECTION_NAME).insertOne(validData)
  } catch (error) {
    throw new Error(error.message)
  }
}

const findOneById = async (partnershipId) => {
  try {
    return await GET_DB().collection(PARTNERSHIP_COLLECTION_NAME).findOne({
      _id: new ObjectId(partnershipId),
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

    const [partnerships, total] = await Promise.all([
      GET_DB().collection(PARTNERSHIP_COLLECTION_NAME)
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray(),
      GET_DB().collection(PARTNERSHIP_COLLECTION_NAME).countDocuments(query)
    ])

    return { partnerships, total }
  } catch (error) {
    throw new Error(error.message)
  }
}

const findByEnterprise = async (enterpriseId, skip = 0, limit = 10, filters = {}) => {
  return await findByPaginate({ enterpriseId, ...filters }, skip, limit)
}

const findByTrainer = async (trainerId, skip = 0, limit = 10, filters = {}) => {
  return await findByPaginate({ trainerId, ...filters }, skip, limit)
}

const findActiveByCourse = async (courseId) => {
  try {
    return await GET_DB().collection(PARTNERSHIP_COLLECTION_NAME).findOne({
      linkedCourseIds: courseId,
      status: PARTNERSHIP_STATUS.ACTIVE,
      _destroy: { $ne: true }
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const update = async (partnershipId, data) => {
  try {
    const result = await GET_DB().collection(PARTNERSHIP_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(partnershipId), _destroy: { $ne: true } },
      {
        $set: {
          ...data,
          updatedAt: Date.now()
        }
      },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const respond = async (partnershipId, data = {}) => {
  const updateData = {
    status: data.status || PARTNERSHIP_STATUS.NEGOTIATING,
    proposedCourseIds: data.proposedCourseIds,
    tuitionFee: data.tuitionFee,
    message: data.message,
    respondedAt: Date.now()
  }
  return await update(partnershipId, updateData)
}

const updateNegotiation = async (partnershipId, data = {}) => {
  const updateData = {
    status: PARTNERSHIP_STATUS.NEGOTIATING,
    proposedCourseIds: data.proposedCourseIds,
    agreedTerms: data.agreedTerms,
    message: data.message
  }
  return await update(partnershipId, updateData)
}

const confirm = async (partnershipId, data = {}) => {
  const updateData = {
    status: PARTNERSHIP_STATUS.ACTIVE,
    agreedTerms: data.agreedTerms,
    linkedCourseIds: data.agreedTerms?.linkedCourseIds || data.linkedCourseIds || [],
    signedAt: data.signedAt || Date.now(),
    expiresAt: data.expiresAt || null
  }
  return await update(partnershipId, updateData)
}

const cancel = async (partnershipId, reason = null) => {
  return await update(partnershipId, {
    status: PARTNERSHIP_STATUS.CANCELLED,
    notes: reason
  })
}

const incrementStat = async (partnershipId, field, amount = 1) => {
  try {
    return await GET_DB().collection(PARTNERSHIP_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(partnershipId), _destroy: { $ne: true } },
      {
        $inc: { [`stats.${field}`]: amount },
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
      db.collection(PARTNERSHIP_COLLECTION_NAME).createIndex({ enterpriseId: 1, status: 1, createdAt: -1 }),
      db.collection(PARTNERSHIP_COLLECTION_NAME).createIndex({ trainerId: 1, status: 1, createdAt: -1 }),
      db.collection(PARTNERSHIP_COLLECTION_NAME).createIndex({ linkedCourseIds: 1 }),
      db.collection(PARTNERSHIP_COLLECTION_NAME).createIndex({ expiresAt: 1 })
    ])
  } catch (error) {
    console.error('Failed to create partnership indexes:', error.message)
  }
}

export const partnershipModel = {
  PARTNERSHIP_COLLECTION_NAME,
  PARTNERSHIP_COLLECTION_SCHEMA,
  validateBeforeCreate,
  createNew,
  findOneById,
  findByPaginate,
  findByEnterprise,
  findByTrainer,
  findActiveByCourse,
  update,
  respond,
  updateNegotiation,
  confirm,
  cancel,
  incrementStat,
  createIndexes
}
