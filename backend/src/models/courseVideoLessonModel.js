import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validator'

const COURSE_VIDEO_LESSON_COLLECTION_NAME = 'course_video_lessons'

const VIDEO_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  PROCESSING: 'processing',
  FAILED: 'failed'
}

const COURSE_VIDEO_LESSON_COLLECTION_SCHEMA = Joi.object({
  courseId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  weekNumber: Joi.number().integer().min(1).required(),
  moduleTitle: Joi.string().required().trim().max(255),

  // Video info
  title: Joi.string().required().trim().max(255),
  description: Joi.string().allow(''),
  videoUrl: Joi.string().uri().allow(null, ''),
  videoId: Joi.string().allow(null, ''),
  duration: Joi.number().integer().min(0).default(0), // seconds
  thumbnail: Joi.string().uri().allow(null, ''),

  // Ordering
  order: Joi.number().integer().min(0).default(0),

  // Content
  transcript: Joi.string().allow(''),
  slides: Joi.array().items(Joi.string().uri()).default([]),
  resources: Joi.array().items(
    Joi.object({
      title: Joi.string().required(),
      url: Joi.string().uri().required()
    })
  ).default([]),

  // Status
  status: Joi.string()
    .valid(...Object.values(VIDEO_STATUS))
    .default(VIDEO_STATUS.DRAFT),

  // Metadata
  createdBy: Joi.string().allow(null, ''),
  updatedBy: Joi.string().allow(null, ''),
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(Date.now),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await COURSE_VIDEO_LESSON_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
    stripUnknown: true
  })
}

// ============ CREATE ============
const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const result = await GET_DB().collection(COURSE_VIDEO_LESSON_COLLECTION_NAME).insertOne(validData)
    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const createMany = async (lessons) => {
  try {
    const validLessons = []
    for (const lesson of lessons) {
      const valid = await COURSE_VIDEO_LESSON_COLLECTION_SCHEMA.validateAsync(lesson, {
        abortEarly: false,
        stripUnknown: true
      })
      validLessons.push(valid)
    }
    const result = await GET_DB().collection(COURSE_VIDEO_LESSON_COLLECTION_NAME).insertMany(validLessons)
    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ READ ============
const findOneById = async (lessonId) => {
  try {
    const objectId = new ObjectId(lessonId)
    return await GET_DB().collection(COURSE_VIDEO_LESSON_COLLECTION_NAME).findOne({
      _id: objectId,
      _destroy: { $ne: true }
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const findByCourse = async (courseId) => {
  try {
    return await GET_DB().collection(COURSE_VIDEO_LESSON_COLLECTION_NAME)
      .find({
        courseId: String(courseId),
        _destroy: { $ne: true }
      })
      .sort({ weekNumber: 1, order: 1 })
      .toArray()
  } catch (error) {
    throw new Error(error.message)
  }
}

const findByCourseGrouped = async (courseId) => {
  try {
    const lessons = await GET_DB().collection(COURSE_VIDEO_LESSON_COLLECTION_NAME)
      .find({
        courseId: String(courseId),
        _destroy: { $ne: true }
      })
      .sort({ weekNumber: 1, order: 1 })
      .toArray()

    const grouped = {}
    for (const lesson of lessons) {
      const week = lesson.weekNumber
      if (!grouped[week]) {
        grouped[week] = {
          weekNumber: week,
          moduleTitle: lesson.moduleTitle,
          lessons: []
        }
      }
      grouped[week].lessons.push(lesson)
    }
    return Object.values(grouped)
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ UPDATE ============
const update = async (lessonId, data) => {
  try {
    const objectId = new ObjectId(lessonId)
    const updateData = {
      ...data,
      updatedAt: Date.now()
    }
    const result = await GET_DB().collection(COURSE_VIDEO_LESSON_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      { $set: updateData },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const updateStatus = async (lessonId, status) => {
  try {
    const objectId = new ObjectId(lessonId)
    return await GET_DB().collection(COURSE_VIDEO_LESSON_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          status,
          updatedAt: Date.now()
        }
      },
      { returnDocument: 'after' }
    )
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ DELETE ============
const deleteLesson = async (lessonId) => {
  try {
    const objectId = new ObjectId(lessonId)
    return await GET_DB().collection(COURSE_VIDEO_LESSON_COLLECTION_NAME).updateOne(
      { _id: objectId },
      {
        $set: {
          _destroy: true,
          updatedAt: Date.now()
        }
      }
    )
  } catch (error) {
    throw new Error(error.message)
  }
}

export const courseVideoLessonModel = {
  COURSE_VIDEO_LESSON_COLLECTION_NAME,
  VIDEO_STATUS,

  createNew,
  createMany,
  findOneById,
  findByCourse,
  findByCourseGrouped,
  update,
  updateStatus,
  deleteLesson
}
