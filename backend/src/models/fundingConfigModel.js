import Joi from 'joi'
import { GET_DB } from '~/config/mongodb'
import { ObjectId } from 'mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validator'
import { FUNDING_LEARNER_PAY_MODE } from '~/utils/constants'

const FUNDING_CONFIG_COLLECTION_NAME = 'funding_configs'
const FUNDING_CONFIG_COLLECTION_SCHEMA = Joi.object({
  courseId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  learner_pay_mode: Joi.string()
    .valid(...Object.values(FUNDING_LEARNER_PAY_MODE))
    .required()
    .messages({
      'any.only': 'Hình thức thanh toán không hợp lệ',
      'any.required': 'Hình thức thanh toán là bắt buộc'
    }),
  configs: Joi.object({
    depositAmount: Joi.number().integer().min(0).default(0),
    installmentCount: Joi.number().integer().min(0).default(0),
    installmentAmount: Joi.number().integer().min(0).default(0),
    isaPercentage: Joi.number().min(0).max(100).default(0),
    isaThreshold: Joi.number().integer().min(0).default(0),
    isaMaxCap: Joi.number().integer().min(0).default(0),
    isaDuration: Joi.number().integer().min(0).default(0)
  }).default({
    depositAmount: 0,
    installmentCount: 0,
    installmentAmount: 0,
    isaPercentage: 0,
    isaThreshold: 0,
    isaMaxCap: 0,
    isaDuration: 0
  }),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await FUNDING_CONFIG_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false, stripUnknown: true })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const result = await GET_DB().collection(FUNDING_CONFIG_COLLECTION_NAME).insertOne(validData)
    return result
  } catch (error) {
    throw error
  }
}

const findOneById = async (id) => {
  try {
    const result = await GET_DB().collection(FUNDING_CONFIG_COLLECTION_NAME).findOne({
      _id: new ObjectId(String(id)),
      _destroy: { $ne: true }
    })
    return result
  } catch (error) {
    throw error
  }
}

const findByCourse = async (courseId) => {
  try {
    const result = await GET_DB().collection(FUNDING_CONFIG_COLLECTION_NAME).findOne({
      courseId: String(courseId),
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
    const [configs, total] = await Promise.all([
      db.collection(FUNDING_CONFIG_COLLECTION_NAME)
        .find(matchCondition, { projection: { _destroy: 0 } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection(FUNDING_CONFIG_COLLECTION_NAME).countDocuments(matchCondition)
    ])
    return { configs, total }
  } catch (error) {
    throw error
  }
}

const update = async (id, updateData) => {
  try {
    const result = await GET_DB().collection(FUNDING_CONFIG_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(String(id)), _destroy: { $ne: true } },
      { $set: { ...updateData, updatedAt: Date.now() } },
      { returnDocument: 'after', projection: { _destroy: 0 } }
    )
    return result
  } catch (error) {
    throw error
  }
}

const updateByCourse = async (courseId, updateData) => {
  try {
    const result = await GET_DB().collection(FUNDING_CONFIG_COLLECTION_NAME).findOneAndUpdate(
      { courseId: String(courseId), _destroy: { $ne: true } },
      { $set: { ...updateData, updatedAt: Date.now() } },
      { returnDocument: 'after', projection: { _destroy: 0 } }
    )
    return result
  } catch (error) {
    throw error
  }
}

const softDelete = async (id) => {
  try {
    const result = await GET_DB().collection(FUNDING_CONFIG_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(String(id)), _destroy: { $ne: true } },
      { $set: { _destroy: true, updatedAt: Date.now() } },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) {
    throw error
  }
}

const softDeleteByCourse = async (courseId) => {
  try {
    const result = await GET_DB().collection(FUNDING_CONFIG_COLLECTION_NAME).findOneAndUpdate(
      { courseId: String(courseId), _destroy: { $ne: true } },
      { $set: { _destroy: true, updatedAt: Date.now() } },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) {
    throw error
  }
}

export const fundingConfigModel = {
  FUNDING_CONFIG_COLLECTION_NAME,
  FUNDING_CONFIG_COLLECTION_SCHEMA,
  validateBeforeCreate,
  createNew,
  findOneById,
  findByCourse,
  findByPaginate,
  update,
  updateByCourse,
  softDelete,
  softDeleteByCourse
}
