import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validator'
import { CERTIFICATE_TYPES } from '~/utils/constants'

const CERTIFICATE_COLLECTION_NAME = 'certificates'
const CERTIFICATE_COLLECTION_SCHEMA = Joi.object({
  enrollmentId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  userId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  courseId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  type: Joi.string()
    .valid(...Object.values(CERTIFICATE_TYPES))
    .required()
    .messages({
      'any.only': 'Loại chứng chỉ không hợp lệ',
      'any.required': 'Loại chứng chỉ là bắt buộc'
    }),
  certificateNumber: Joi.string().required().trim(),
  issuedDate: Joi.date().timestamp('javascript').default(Date.now),
  expiryDate: Joi.date().timestamp('javascript').allow(null),
  score: Joi.number().min(0).max(100).allow(null),
  skills: Joi.array().items(Joi.string().trim()).default([]),
  verificationCode: Joi.string().required().trim(),
  credentialUrl: Joi.string().allow('', null),
  issuedBy: Joi.string().allow(null),
  status: Joi.string().valid('active', 'revoked').default('active'),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await CERTIFICATE_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false, stripUnknown: true })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const result = await GET_DB().collection(CERTIFICATE_COLLECTION_NAME).insertOne(validData)
    return result
  } catch (error) {
    throw error
  }
}

const findOneById = async (id) => {
  try {
    const result = await GET_DB().collection(CERTIFICATE_COLLECTION_NAME).findOne({
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

    const [certificates, total] = await Promise.all([
      db.collection(CERTIFICATE_COLLECTION_NAME)
        .find(matchCondition)
        .sort({ issuedDate: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection(CERTIFICATE_COLLECTION_NAME).countDocuments(matchCondition)
    ])
    return { certificates, total }
  } catch (error) {
    throw error
  }
}

const update = async (id, updateData) => {
  try {
    const result = await GET_DB().collection(CERTIFICATE_COLLECTION_NAME).findOneAndUpdate(
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
    const result = await GET_DB().collection(CERTIFICATE_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(id), _destroy: { $ne: true } },
      { $set: { _destroy: true, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) {
    throw error
  }
}

const findByEnrollment = async (enrollmentId) => {
  try {
    const result = await GET_DB().collection(CERTIFICATE_COLLECTION_NAME)
        .find({ enrollmentId: String(enrollmentId), _destroy: { $ne: true } })
      .toArray()
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

    const [certificates, total] = await Promise.all([
      GET_DB().collection(CERTIFICATE_COLLECTION_NAME)
        .find({ userId: String(userId), _destroy: { $ne: true } })
        .sort({ issuedDate: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      GET_DB().collection(CERTIFICATE_COLLECTION_NAME).countDocuments({ userId: String(userId), _destroy: { $ne: true } })
    ])
    return { certificates, total }
  } catch (error) {
    throw error
  }
}

const findByVerificationCode = async (code) => {
  try {
    const result = await GET_DB().collection(CERTIFICATE_COLLECTION_NAME)
      .findOne({ verificationCode: code, _destroy: { $ne: true } })
    return result
  } catch (error) {
    throw error
  }
}

const isCertificateExistsForEnrollment = async (enrollmentId) => {
  try {
    const existing = await GET_DB().collection(CERTIFICATE_COLLECTION_NAME).findOne({
      enrollmentId: String(enrollmentId),
      status: 'active',
      _destroy: { $ne: true }
    })
    return !!existing
  } catch (error) {
    throw error
  }
}

export const certificateModel = {
  CERTIFICATE_COLLECTION_NAME,
  CERTIFICATE_COLLECTION_SCHEMA,
  validateBeforeCreate,
  createNew,
  findOneById,
  findByPaginate,
  update,
  softDelete,
  findByEnrollment,
  findByUser,
  findByVerificationCode,
  isCertificateExistsForEnrollment
}
