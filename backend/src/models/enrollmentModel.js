import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import {
  ENROLLMENT_STATUS,
  COMPLETION_STATUS,
  ENROLLMENT_SOURCE,
  SCHOLARSHIP_COVERAGE
} from '~/utils/constants'

const ENROLLMENT_COLLECTION_NAME = 'enrollments'
const ENROLLMENT_COLLECTION_SCHEMA = Joi.object({
  userId: Joi.string().required(),
  courseId: Joi.string().required(),
  scheduleId: Joi.string().allow(null, ''),

  status: Joi.string()
    .valid(...Object.values(ENROLLMENT_STATUS))
    .default(ENROLLMENT_STATUS.PENDING),

  progress: Joi.object({
    percentage: Joi.number().min(0).max(100).default(0),
    completionStatus: Joi.string()
      .valid(...Object.values(COMPLETION_STATUS))
      .default(COMPLETION_STATUS.NOT_STARTED),
    currentLesson: Joi.number().integer().min(0).default(0),
    totalLessons: Joi.number().integer().min(0).default(0)
  }),

  attendance: Joi.object({
    present: Joi.number().integer().min(0).default(0),
    absent: Joi.number().integer().min(0).default(0),
    late: Joi.number().integer().min(0).default(0),
    totalSessions: Joi.number().integer().min(0).default(0)
  }),

  assessments: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      score: Joi.number().min(0).max(100).allow(null),
      passed: Joi.boolean().allow(null),
      date: Joi.date().timestamp().allow(null)
    })
  ).default([]),

  fee: Joi.object({
    total: Joi.number().integer().min(0).default(0),
    paid: Joi.number().integer().min(0).default(0),
    pending: Joi.number().integer().min(0).default(0)
  }),

  scholarship: Joi.object({
    scholarshipId: Joi.string().allow(null),
    coverage: Joi.string()
      .valid(...Object.values(SCHOLARSHIP_COVERAGE))
      .default(SCHOLARSHIP_COVERAGE.NONE),
    fundedAmount: Joi.number().integer().min(0).default(0)
  }),

  enrolledAt: Joi.date().timestamp('javascript').default(Date.now()),
  startDate: Joi.date().timestamp('javascript').allow(null),
  endDate: Joi.date().timestamp('javascript').allow(null),
  completedAt: Joi.date().timestamp('javascript').allow(null),

  motivation: Joi.string().max(1000).allow('', null),
  dropReason: Joi.string().max(1000).allow('', null),
  notes: Joi.string().max(2000).allow('', null),

  source: Joi.string()
    .valid(...Object.values(ENROLLMENT_SOURCE))
    .default(ENROLLMENT_SOURCE.DIRECT),

  waitlistPosition: Joi.number().integer().min(1).allow(null),

  updatedBy: Joi.string().allow(null),
  createdAt: Joi.date().timestamp('javascript').default(Date.now()),
  updatedAt: Joi.date().timestamp('javascript').default(Date.now()),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await ENROLLMENT_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
    stripUnknown: true
  })
}

// ============ CREATE ============
const createNew = async (data, skipValidation = false) => {
  try {
    const validData = skipValidation
      ? data
      : await validateBeforeCreate(data)

    return await GET_DB().collection(ENROLLMENT_COLLECTION_NAME).insertOne(validData)
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ READ ============
const findOneById = async (enrollmentId) => {
  try {
    const objectId = new ObjectId(enrollmentId)
    return await GET_DB().collection(ENROLLMENT_COLLECTION_NAME).findOne({
      _id: objectId,
      _destroy: false
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const findOneByUserAndCourse = async (userId, courseId) => {
  try {
    return await GET_DB().collection(ENROLLMENT_COLLECTION_NAME).findOne({
      userId: userId,
      courseId: courseId,
      _destroy: false
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const findByUser = async (userId, skip = 0, limit = 10, filters = {}) => {
  try {
    const query = {
      userId: userId,
      _destroy: false,
      ...filters
    }

    const enrollments = await GET_DB().collection(ENROLLMENT_COLLECTION_NAME)
      .find(query)
      .sort({ enrolledAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const totalEnrollments = await GET_DB().collection(ENROLLMENT_COLLECTION_NAME).countDocuments(query)

    return { enrollments, totalEnrollments }
  } catch (error) {
    throw new Error(error.message)
  }
}

const findByCourse = async (courseId, skip = 0, limit = 10, filters = {}) => {
  try {
    const query = {
      courseId: courseId,
      _destroy: false,
      ...filters
    }

    const enrollments = await GET_DB().collection(ENROLLMENT_COLLECTION_NAME)
      .find(query)
      .sort({ enrolledAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const totalEnrollments = await GET_DB().collection(ENROLLMENT_COLLECTION_NAME).countDocuments(query)

    return { enrollments, totalEnrollments }
  } catch (error) {
    throw new Error(error.message)
  }
}

const findCompletedByUser = async (userId) => {
  try {
    return await GET_DB().collection(ENROLLMENT_COLLECTION_NAME).find({
      userId: userId,
      status: ENROLLMENT_STATUS.COMPLETED,
      _destroy: false
    }).toArray()
  } catch (error) {
    throw new Error(error.message)
  }
}

const findAll = async (skip = 0, limit = 10, filters = {}) => {
  try {
    const query = {
      _destroy: false,
      ...filters
    }

    const enrollments = await GET_DB().collection(ENROLLMENT_COLLECTION_NAME)
      .find(query)
      .sort({ enrolledAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const totalEnrollments = await GET_DB().collection(ENROLLMENT_COLLECTION_NAME).countDocuments(query)

    return { enrollments, totalEnrollments }
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ UPDATE ============
const update = async (enrollmentId, data) => {
  try {
    const objectId = new ObjectId(enrollmentId)
    const updateData = {
      ...data,
      updatedAt: Date.now()
    }

    const result = await GET_DB().collection(ENROLLMENT_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const updateProgress = async (enrollmentId, progressData) => {
  try {
    const objectId = new ObjectId(enrollmentId)

    let updateData = {
      'progress.percentage': progressData.percentage,
      'progress.currentLesson': progressData.currentLesson || 0,
      'progress.totalLessons': progressData.totalLessons || 0,
      updatedAt: Date.now()
    }

    if (progressData.percentage >= 100) {
      updateData['progress.completionStatus'] = COMPLETION_STATUS.COMPLETED
    } else if (progressData.percentage > 0) {
      updateData['progress.completionStatus'] = COMPLETION_STATUS.IN_PROGRESS
    }

    if (progressData.assessments) {
      updateData.assessments = progressData.assessments
    }

    if (progressData.notes) {
      updateData.notes = progressData.notes
    }

    const result = await GET_DB().collection(ENROLLMENT_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const updateAttendance = async (enrollmentId, attendanceData) => {
  try {
    const objectId = new ObjectId(enrollmentId)

    const updateData = {
      attendance: attendanceData,
      updatedAt: Date.now()
    }

    const result = await GET_DB().collection(ENROLLMENT_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const updateStatus = async (enrollmentId, status, additionalData = {}) => {
  try {
    const objectId = new ObjectId(enrollmentId)

    const updateData = {
      status: status,
      updatedAt: Date.now(),
      ...additionalData
    }

    if (status === ENROLLMENT_STATUS.ENROLLED || status === ENROLLMENT_STATUS.IN_PROGRESS) {
      if (!additionalData.startDate) {
        updateData.startDate = Date.now()
      }
    }

    if (status === ENROLLMENT_STATUS.COMPLETED) {
      updateData.completedAt = Date.now()
      updateData['progress.completionStatus'] = COMPLETION_STATUS.COMPLETED
      updateData['progress.percentage'] = 100
    }

    if (status === ENROLLMENT_STATUS.DROPPED || status === ENROLLMENT_STATUS.CANCELLED) {
      updateData.dropReason = additionalData.dropReason || null
    }

    const result = await GET_DB().collection(ENROLLMENT_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const promoteFromWaitlist = async (courseId) => {
  try {
    const result = await GET_DB().collection(ENROLLMENT_COLLECTION_NAME).findOneAndUpdate(
      {
        courseId: courseId,
        status: ENROLLMENT_STATUS.WAITLIST,
        _destroy: false
      },
      {
        $set: {
          status: ENROLLMENT_STATUS.ENROLLED,
          startDate: Date.now(),
          updatedAt: Date.now()
        }
      },
      {
        sort: { waitlistPosition: 1 },
        returnDocument: 'after'
      }
    )

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ DELETE ============
const deleteEnrollment = async (enrollmentId) => {
  try {
    const objectId = new ObjectId(enrollmentId)
    return await GET_DB().collection(ENROLLMENT_COLLECTION_NAME).updateOne(
      { _id: objectId },
      {
        $set: {
          _destroy: true,
          status: ENROLLMENT_STATUS.CANCELLED,
          updatedAt: Date.now()
        }
      }
    )
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ AGGREGATE ============
const getStatsByCourse = async (courseId) => {
  try {
    const pipeline = [
      {
        $match: {
          courseId: courseId,
          _destroy: false
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]

    const stats = await GET_DB().collection(ENROLLMENT_COLLECTION_NAME).aggregate(pipeline).toArray()

    const result = {
      total: 0,
      byStatus: {}
    }

    stats.forEach(stat => {
      result.byStatus[stat._id] = stat.count
      result.total += stat.count
    })

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const getStatsByUser = async (userId) => {
  try {
    const pipeline = [
      {
        $match: {
          userId: userId,
          _destroy: false
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]

    const stats = await GET_DB().collection(ENROLLMENT_COLLECTION_NAME).aggregate(pipeline).toArray()

    const result = {
      total: 0,
      completed: 0,
      inProgress: 0,
      byStatus: {}
    }

    stats.forEach(stat => {
      result.byStatus[stat._id] = stat.count
      result.total += stat.count
      if (stat._id === ENROLLMENT_STATUS.COMPLETED) {
        result.completed = stat.count
      }
      if (stat._id === ENROLLMENT_STATUS.IN_PROGRESS) {
        result.inProgress = stat.count
      }
    })

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const getOverallStats = async () => {
  try {
    const pipeline = [
      {
        $match: {
          _destroy: false
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]

    const stats = await GET_DB().collection(ENROLLMENT_COLLECTION_NAME).aggregate(pipeline).toArray()

    const result = {
      total: 0,
      byStatus: {}
    }

    stats.forEach(stat => {
      result.byStatus[stat._id] = stat.count
      result.total += stat.count
    })

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

export const enrollmentModel = {
  ENROLLMENT_COLLECTION_NAME,
  ENROLLMENT_COLLECTION_SCHEMA,

  // Create
  createNew,

  // Read
  findOneById,
  findOneByUserAndCourse,
  findByUser,
  findByCourse,
  findCompletedByUser,
  findAll,

  // Update
  update,
  updateProgress,
  updateAttendance,
  updateStatus,
  promoteFromWaitlist,

  // Delete
  deleteEnrollment,

  // Aggregate
  getStatsByCourse,
  getStatsByUser,
  getOverallStats
}
