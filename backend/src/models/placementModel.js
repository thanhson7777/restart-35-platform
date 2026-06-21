import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validator'
import { PLACEMENT_STATUS, PLACEMENT_REFERRAL_SOURCE } from '~/utils/constants'

const PLACEMENT_COLLECTION_NAME = 'placements'
const PLACEMENT_COLLECTION_SCHEMA = Joi.object({
  enrollmentId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE).allow(null, ''),
  userId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  courseId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE).allow(null, ''),
  certificateId: Joi.string().allow(null, ''),
  status: Joi.string()
    .valid(...Object.values(PLACEMENT_STATUS))
    .default(PLACEMENT_STATUS.REFERRED),
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
  referralSource: Joi.string().valid(...Object.values(PLACEMENT_REFERRAL_SOURCE)).allow('', null),
  partnershipId: Joi.string().allow(null, ''),
  sponsorshipId: Joi.string().allow(null, ''),
  interviewDate: Joi.date().timestamp('javascript').allow(null),
  offerDetails: Joi.object({
    offeredDate: Joi.date().timestamp('javascript').allow(null),
    offeredSalary: Joi.number().min(0).allow(null),
    startDate: Joi.date().timestamp('javascript').allow(null)
  }).default({}),
  startedDate: Joi.date().timestamp('javascript').allow(null),
  resignationDate: Joi.date().timestamp('javascript').allow(null),
  resignationReason: Joi.string().allow('', null),
  feedback: Joi.object({
    rating: Joi.number().min(1).max(5).allow(null),
    comment: Joi.string().allow('', null),
    submittedAt: Joi.date().timestamp('javascript').allow(null)
  }).default(null),
  notes: Joi.string().allow('', null),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await PLACEMENT_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false, stripUnknown: true })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const result = await GET_DB().collection(PLACEMENT_COLLECTION_NAME).insertOne(validData)
    return result
  } catch (error) {
    throw error
  }
}

const findOneById = async (id) => {
  try {
    const result = await GET_DB().collection(PLACEMENT_COLLECTION_NAME).findOne({
      _id: new ObjectId(id),
      _destroy: { $ne: true }
    })
    return result
  } catch (error) {
    throw error
  }
}

const findByPaginate = async (matchCondition, skip, limit) => {
  try {
    const db = await GET_DB()
    matchCondition._destroy = { $ne: true }

    const [placements, total] = await Promise.all([
      db.collection(PLACEMENT_COLLECTION_NAME)
        .find(matchCondition)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection(PLACEMENT_COLLECTION_NAME).countDocuments(matchCondition)
    ])
    return { placements, total }
  } catch (error) {
    throw error
  }
}

const update = async (id, updateData) => {
  try {
    const result = await GET_DB().collection(PLACEMENT_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(id), _destroy: { $ne: true } },
      { $set: { ...updateData, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) {
    throw error
  }
}

const softDelete = async (id) => {
  try {
    const result = await GET_DB().collection(PLACEMENT_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(id), _destroy: { $ne: true } },
      { $set: { _destroy: true, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) {
    throw error
  }
}

const findByUser = async (userId, query = {}) => {
  try {
    const { page = 1, item_per_page = 10 } = query
    const skip = (page - 1) * item_per_page
    const limit = parseInt(item_per_page)

    const [placements, total] = await Promise.all([
      GET_DB().collection(PLACEMENT_COLLECTION_NAME)
        .find({ userId: String(userId), _destroy: { $ne: true } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      GET_DB().collection(PLACEMENT_COLLECTION_NAME).countDocuments({
        userId: String(userId),
        _destroy: { $ne: true }
      })
    ])
    return { placements, total }
  } catch (error) {
    throw error
  }
}

const isActivePlacementExistsForEnrollment = async (enrollmentId) => {
  try {
    const existing = await GET_DB().collection(PLACEMENT_COLLECTION_NAME).findOne({
      enrollmentId: String(enrollmentId),
      status: { $nin: [PLACEMENT_STATUS.RESIGNED] },
      _destroy: { $ne: true }
    })
    return !!existing
  } catch (error) {
    throw error
  }
}

export const placementModel = {
  PLACEMENT_COLLECTION_NAME,
  PLACEMENT_COLLECTION_SCHEMA,
  validateBeforeCreate,
  createNew,
  findOneById,
  findByPaginate,
  update,
  softDelete,
  findByUser,
  isActivePlacementExistsForEnrollment
}
