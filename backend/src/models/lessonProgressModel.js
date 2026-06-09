import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validator'

const LESSON_PROGRESS_COLLECTION_NAME = 'lesson_progress'

const LESSON_PROGRESS_COLLECTION_SCHEMA = Joi.object({
  enrollmentId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  lessonId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  courseId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  userId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),

  watchedSeconds: Joi.number().min(0).default(0),
  totalSeconds: Joi.number().min(0).default(0),
  percentComplete: Joi.number().min(0).max(100).default(0),
  completed: Joi.boolean().default(false),

  bookmarked: Joi.boolean().default(false),
  bookmarkNote: Joi.string().allow('', null).max(200).default(null),
  bookmarkedAt: Joi.date().timestamp('javascript').allow(null),

  firstWatchedAt: Joi.date().timestamp('javascript').default(Date.now),
  lastWatchedAt: Joi.date().timestamp('javascript').default(Date.now),
  completedAt: Joi.date().timestamp('javascript').allow(null),

  quizScore: Joi.number().min(0).max(100).allow(null),
  quizAttempts: Joi.number().integer().min(0).default(0),

  _destroy: Joi.boolean().default(false),
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(Date.now)
})

const validateBeforeCreate = async (data) => {
  return await LESSON_PROGRESS_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
    stripUnknown: true
  })
}

// ============ CREATE ============
const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const result = await GET_DB().collection(LESSON_PROGRESS_COLLECTION_NAME).insertOne(validData)
    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ READ ============
const findOneById = async (id) => {
  try {
    return await GET_DB().collection(LESSON_PROGRESS_COLLECTION_NAME).findOne({
      _id: new ObjectId(id),
      _destroy: { $ne: true }
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const findOneByEnrollmentAndLesson = async (enrollmentId, lessonId) => {
  try {
    return await GET_DB().collection(LESSON_PROGRESS_COLLECTION_NAME).findOne({
      enrollmentId: String(enrollmentId),
      lessonId: String(lessonId),
      _destroy: { $ne: true }
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const findByEnrollment = async (enrollmentId) => {
  try {
    return await GET_DB().collection(LESSON_PROGRESS_COLLECTION_NAME)
      .find({
        enrollmentId: String(enrollmentId),
        _destroy: { $ne: true }
      })
      .toArray()
  } catch (error) {
    throw new Error(error.message)
  }
}

const findBookmarksByLessonAndUser = async (lessonId, userId) => {
  try {
    return await GET_DB().collection(LESSON_PROGRESS_COLLECTION_NAME)
      .find({
        lessonId: String(lessonId),
        userId: String(userId),
        bookmarked: true,
        _destroy: { $ne: true }
      })
      .sort({ bookmarkedAt: -1 })
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
    const result = await GET_DB().collection(LESSON_PROGRESS_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ UPSERT ============
const upsertProgress = async (enrollmentId, lessonId, userId, courseId, progressData) => {
  try {
    const existing = await findOneByEnrollmentAndLesson(enrollmentId, lessonId)

    if (existing) {
      const updateData = {
        watchedSeconds: progressData.watchedSeconds,
        totalSeconds: progressData.totalSeconds,
        percentComplete: progressData.percentComplete,
        lastWatchedAt: Date.now(),
        updatedAt: Date.now()
      }

      if (progressData.percentComplete >= 90 && !existing.completed) {
        updateData.completed = true
        updateData.completedAt = Date.now()
      }

      const result = await GET_DB().collection(LESSON_PROGRESS_COLLECTION_NAME).findOneAndUpdate(
        { _id: existing._id },
        { $set: updateData },
        { returnDocument: 'after' }
      )
      return result
    } else {
      const isCompleted = progressData.percentComplete >= 90
      const newProgress = {
        enrollmentId: String(enrollmentId),
        lessonId: String(lessonId),
        courseId: String(courseId),
        userId: String(userId),
        watchedSeconds: progressData.watchedSeconds,
        totalSeconds: progressData.totalSeconds,
        percentComplete: progressData.percentComplete,
        completed: isCompleted,
        firstWatchedAt: Date.now(),
        lastWatchedAt: Date.now(),
        completedAt: isCompleted ? Date.now() : null,
        quizScore: null,
        quizAttempts: 0
      }
      const validData = await validateBeforeCreate(newProgress)
      const insertResult = await GET_DB().collection(LESSON_PROGRESS_COLLECTION_NAME).insertOne(validData)
      return {
        _id: insertResult.insertedId,
        ...validData
      }
    }
  } catch (error) {
    throw new Error(error.message)
  }
}

export const lessonProgressModel = {
  LESSON_PROGRESS_COLLECTION_NAME,
  createNew,
  findOneById,
  findOneByEnrollmentAndLesson,
  findByEnrollment,
  findBookmarksByLessonAndUser,
  update,
  upsertProgress
}
