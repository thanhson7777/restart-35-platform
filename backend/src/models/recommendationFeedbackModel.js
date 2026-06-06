import Joi from 'joi'
import { GET_DB } from '~/config/mongodb'

const FEEDBACK_COLLECTION_NAME = 'recommendation_feedback'
const FEEDBACK_COLLECTION_SCHEMA = Joi.object({
  userId: Joi.string().required(),
  courseId: Joi.string().required(),
  courseTitle: Joi.string().allow('', null).default(''),
  jobId: Joi.string().allow(null, '').default(null),
  jobTitle: Joi.string().allow('', null).default(''),
  skillGaps: Joi.array().items(
    Joi.object({
      skill_name: Joi.string().allow(''),
      priority: Joi.string().allow('')
    })
  ).default([]),

  action: Joi.string()
    .valid('view', 'click', 'enroll', 'complete', 'dismiss', 'thumbs_up', 'thumbs_down')
    .required(),

  recommendationScore: Joi.number().min(0).max(1).allow(null).default(null),

  sessionId: Joi.string().allow(null, '').default(null),
  userAgent: Joi.string().allow('', null).default(null),
  timestamp: Joi.date().timestamp('javascript').default(Date.now)
})

// ---- CRUD ----

const createNew = async ({ userId, courseId, courseTitle, jobId, jobTitle, skillGaps,
                          action, recommendationScore, sessionId, userAgent }) => {
  try {
    const db = GET_DB()
    const result = await db.collection(FEEDBACK_COLLECTION_NAME).insertOne({
      userId,
      courseId,
      courseTitle: courseTitle || '',
      jobId: jobId || null,
      jobTitle: jobTitle || '',
      skillGaps: skillGaps || [],
      action,
      recommendationScore: recommendationScore ?? null,
      sessionId: sessionId || null,
      userAgent: userAgent || '',
      timestamp: new Date()
    })
    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const findByUser = async (userId, { page = 1, limit = 50 } = {}) => {
  try {
    const db = GET_DB()
    const skip = (page - 1) * limit
    const [feedbacks, total] = await Promise.all([
      db.collection(FEEDBACK_COLLECTION_NAME)
        .find({ userId })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection(FEEDBACK_COLLECTION_NAME).countDocuments({ userId })
    ])
    return { feedbacks, total, page, limit }
  } catch (error) {
    throw new Error(error.message)
  }
}

const findByCourse = async (courseId) => {
  try {
    const db = GET_DB()
    return db.collection(FEEDBACK_COLLECTION_NAME)
      .find({ courseId })
      .sort({ timestamp: -1 })
      .toArray()
  } catch (error) {
    throw new Error(error.message)
  }
}

const getAggregatedMetrics = async (startDate, endDate) => {
  try {
    const db = GET_DB()
    const matchStage = { timestamp: { $gte: new Date(startDate), $lte: new Date(endDate) } }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total_impressions: {
            $sum: { $cond: [{ $in: ['$action', ['view', 'click']] }, 1, 0] }
          },
          total_clicks: {
            $sum: { $cond: [{ $eq: ['$action', 'click'] }, 1, 0] }
          },
          total_enrolls: {
            $sum: { $cond: [{ $eq: ['$action', 'enroll'] }, 1, 0] }
          },
          total_completes: {
            $sum: { $cond: [{ $eq: ['$action', 'complete'] }, 1, 0] }
          },
          total_dismiss: {
            $sum: { $cond: [{ $in: ['$action', ['dismiss', 'thumbs_down']] }, 1, 0] }
          },
          total_thumbs_up: {
            $sum: { $cond: [{ $eq: ['$action', 'thumbs_up'] }, 1, 0] }
          },
          total_records: { $sum: 1 }
        }
      }
    ]

    const [result] = await db.collection(FEEDBACK_COLLECTION_NAME).aggregate(pipeline).toArray()
    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const getTimelineMetrics = async (startDate, endDate) => {
  try {
    const db = GET_DB()
    const pipeline = [
      {
        $match: {
          timestamp: { $gte: new Date(startDate), $lte: new Date(endDate) }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          views: { $sum: { $cond: [{ $eq: ['$action', 'view'] }, 1, 0] } },
          clicks: { $sum: { $cond: [{ $eq: ['$action', 'click'] }, 1, 0] } },
          enrolls: { $sum: { $cond: [{ $eq: ['$action', 'enroll'] }, 1, 0] } },
          completes: { $sum: { $cond: [{ $eq: ['$action', 'complete'] }, 1, 0] } },
          dismisses: { $sum: { $cond: [{ $in: ['$action', ['dismiss', 'thumbs_down']] }, 1, 0] } },
          thumbs_up: { $sum: { $cond: [{ $eq: ['$action', 'thumbs_up'] }, 1, 0] } },
          total: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]

    return db.collection(FEEDBACK_COLLECTION_NAME).aggregate(pipeline).toArray()
  } catch (error) {
    throw new Error(error.message)
  }
}

const getTopCourses = async (startDate, endDate, limit = 10) => {
  try {
    const db = GET_DB()
    const pipeline = [
      {
        $match: {
          timestamp: { $gte: new Date(startDate), $lte: new Date(endDate) }
        }
      },
      {
        $group: {
          _id: { courseId: '$courseId', courseTitle: '$courseTitle' },
          impressions: { $sum: { $cond: [{ $in: ['$action', ['view', 'click']] }, 1, 0] } },
          enrolls: { $sum: { $cond: [{ $eq: ['$action', 'enroll'] }, 1, 0] } },
          thumbs_up: { $sum: { $cond: [{ $eq: ['$action', 'thumbs_up'] }, 1, 0] } },
          thumbs_down: { $sum: { $cond: [{ $eq: ['$action', 'thumbs_down'] }, 1, 0] } },
          dismisses: { $sum: { $cond: [{ $eq: ['$action', 'dismiss'] }, 1, 0] } },
          total: { $sum: 1 }
        }
      },
      {
        $addFields: {
          enrollment_rate: {
            $cond: [
              { $gt: ['$impressions', 0] },
              { $divide: ['$enrolls', '$impressions'] },
              0
            ]
          }
        }
      },
      { $sort: { impressions: -1 } },
      { $limit: limit }
    ]

    return db.collection(FEEDBACK_COLLECTION_NAME).aggregate(pipeline).toArray()
  } catch (error) {
    throw new Error(error.message)
  }
}

export const recommendationFeedbackModel = {
  FEEDBACK_COLLECTION_NAME,
  FEEDBACK_COLLECTION_SCHEMA,

  createNew,
  findByUser,
  findByCourse,
  getAggregatedMetrics,
  getTimelineMetrics,
  getTopCourses
}
