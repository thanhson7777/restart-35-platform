import Joi from 'joi'
import { GET_DB } from '~/config/mongodb'
import { ObjectId } from 'mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validator'
import { LEARNING_EVENT_TYPES } from '~/utils/constants'

const LEARNING_RECORD_COLLECTION_NAME = 'learning_records'
const LEARNING_RECORD_COLLECTION_SCHEMA = Joi.object({
  enrollmentId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  userId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  courseId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  event_type: Joi.string()
    .valid(...Object.values(LEARNING_EVENT_TYPES))
    .required()
    .messages({
      'any.only': 'Loại sự kiện học tập không hợp lệ',
      'any.required': 'Loại sự kiện là bắt buộc'
    }),
  metadata: Joi.object({
    videoId: Joi.string().allow('', null),
    videoDuration: Joi.number().integer().min(0).allow(null),
    watchedDuration: Joi.number().integer().min(0).allow(null),
    quizId: Joi.string().allow('', null),
    quizTitle: Joi.string().allow('', null),
    score: Joi.number().min(0).max(100).allow(null),
    passed: Joi.boolean().allow(null),
    sessionId: Joi.string().allow('', null),
    sessionTitle: Joi.string().allow('', null),
    moduleId: Joi.string().allow('', null),
    moduleTitle: Joi.string().allow('', null),
    moduleIndex: Joi.number().integer().min(0).allow(null)
  }).default({}),
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(Date.now),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await LEARNING_RECORD_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false, stripUnknown: true })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const result = await GET_DB().collection(LEARNING_RECORD_COLLECTION_NAME).insertOne(validData)
    return result
  } catch (error) {
    throw error
  }
}

const findByEnrollment = async (enrollmentId) => {
  try {
    const result = await GET_DB().collection(LEARNING_RECORD_COLLECTION_NAME)
      .find({ enrollmentId: String(enrollmentId) })
      .sort({ createdAt: -1 })
      .toArray()
    return result
  } catch (error) {
    throw error
  }
}

const findByUser = async (userId, query = {}) => {
  try {
    const { event_type, from, to } = query
    const match = { userId: String(userId) }
    if (event_type) match.event_type = event_type
    if (from || to) {
      match.createdAt = {}
      if (from) match.createdAt.$gte = new Date(from)
      if (to) match.createdAt.$lte = new Date(to)
    }

    const result = await GET_DB().collection(LEARNING_RECORD_COLLECTION_NAME)
      .find(match)
      .sort({ createdAt: -1 })
      .toArray()
    return result
  } catch (error) {
    throw error
  }
}

const findByPaginate = async (matchCondition, skip, limit) => {
  try {
    const db = await GET_DB()
    const [records, total] = await Promise.all([
      db.collection(LEARNING_RECORD_COLLECTION_NAME)
        .find(matchCondition)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection(LEARNING_RECORD_COLLECTION_NAME).countDocuments(matchCondition)
    ])
    return { records, total }
  } catch (error) {
    throw error
  }
}

const getLastRecord = async (enrollmentId) => {
  try {
    const result = await GET_DB().collection(LEARNING_RECORD_COLLECTION_NAME)
      .find({ enrollmentId: String(enrollmentId) })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray()
    return result[0] || null
  } catch (error) {
    throw error
  }
}

const getRecordsByEventType = async (enrollmentId, eventType) => {
  try {
    const result = await GET_DB().collection(LEARNING_RECORD_COLLECTION_NAME)
      .find({
        enrollmentId: String(enrollmentId),
        event_type: eventType
      })
      .sort({ createdAt: -1 })
      .toArray()
    return result
  } catch (error) {
    throw error
  }
}

export const learningRecordModel = {
  LEARNING_RECORD_COLLECTION_NAME,
  LEARNING_RECORD_COLLECTION_SCHEMA,
  validateBeforeCreate,
  createNew,
  findByEnrollment,
  findByUser,
  findByPaginate,
  getLastRecord,
  getRecordsByEventType
}
