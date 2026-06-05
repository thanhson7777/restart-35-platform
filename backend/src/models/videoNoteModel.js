import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validator'

const VIDEO_NOTE_COLLECTION_NAME = 'video_notes'

const VIDEO_NOTE_COLLECTION_SCHEMA = Joi.object({
  enrollmentId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  lessonId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  userId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),

  timestamp: Joi.number().min(0).required(),
  content: Joi.string().required().trim().max(5000),
  tags: Joi.array().items(Joi.string().max(50)).default([]),
  color: Joi.string().valid('yellow', 'green', 'blue').default('yellow'),

  _destroy: Joi.boolean().default(false),
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(Date.now)
})

const validateBeforeCreate = async (data) => {
  return await VIDEO_NOTE_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
    stripUnknown: true
  })
}

// ============ CREATE ============
const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const result = await GET_DB().collection(VIDEO_NOTE_COLLECTION_NAME).insertOne(validData)
    return {
      _id: result.insertedId,
      ...validData
    }
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ READ ============
const findOneById = async (id) => {
  try {
    return await GET_DB().collection(VIDEO_NOTE_COLLECTION_NAME).findOne({
      _id: new ObjectId(id),
      _destroy: { $ne: true }
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const findByEnrollment = async (enrollmentId) => {
  try {
    return await GET_DB().collection(VIDEO_NOTE_COLLECTION_NAME)
      .find({
        enrollmentId: String(enrollmentId),
        _destroy: { $ne: true }
      })
      .sort({ timestamp: 1 })
      .toArray()
  } catch (error) {
    throw new Error(error.message)
  }
}

const findByUserAndLesson = async (userId, lessonId) => {
  try {
    return await GET_DB().collection(VIDEO_NOTE_COLLECTION_NAME)
      .find({
        userId: String(userId),
        lessonId: String(lessonId),
        _destroy: { $ne: true }
      })
      .sort({ timestamp: 1 })
      .toArray()
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ UPDATE ============
const update = async (id, data) => {
  try {
    const updateData = {
      ...data,
      updatedAt: Date.now()
    }

    // We don't allow changing enrollmentId, lessonId, userId or timestamp on update
    delete updateData.enrollmentId
    delete updateData.lessonId
    delete updateData.userId

    const result = await GET_DB().collection(VIDEO_NOTE_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ DELETE ============
const deleteNote = async (id) => {
  try {
    const result = await GET_DB().collection(VIDEO_NOTE_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { _destroy: true, updatedAt: Date.now() } },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

export const videoNoteModel = {
  VIDEO_NOTE_COLLECTION_NAME,
  createNew,
  findOneById,
  findByEnrollment,
  findByUserAndLesson,
  update,
  deleteNote
}
