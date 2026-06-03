import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import courseModel from '~/models/courseModel'
import userModel from '~/models/userModel'
import {
  ENROLLMENT_STATUS,
  ENROLLMENT_PAYMENT_STATUS,
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

  payment_status: Joi.string()
    .valid(...Object.values(ENROLLMENT_PAYMENT_STATUS))
    .default(ENROLLMENT_PAYMENT_STATUS.PENDING),

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
    applicationId: Joi.string().allow(null),
    coverage: Joi.string()
      .valid(...Object.values(SCHOLARSHIP_COVERAGE))
      .default(SCHOLARSHIP_COVERAGE.NONE),
    fundedAmount: Joi.number().integer().min(0).default(0),
    disbursedAmount: Joi.number().integer().min(0).default(0),
    clawbackAmount: Joi.number().integer().min(0).default(0),
    disbursements: Joi.array().items(
      Joi.object({
        amount: Joi.number().integer().min(0).required(),
        date: Joi.date().timestamp('javascript').default(Date.now()),
        status: Joi.string().valid('pending', 'disbursed', 'clawback', 'refunded')
      })
    ).default([])
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
      _destroy: { $ne: true }
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

const updatePaymentStatus = async (enrollmentId, payment_status) => {
  try {
    const objectId = new ObjectId(enrollmentId)
    const result = await GET_DB().collection(ENROLLMENT_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      { $set: { payment_status, updatedAt: Date.now() } },
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

// ============ ADMIN STATS ============
const getAdminStats = async () => {
  try {
    // Total by status
    const statusPipeline = [
      { $match: { _destroy: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]
    const statusStats = await GET_DB().collection(ENROLLMENT_COLLECTION_NAME).aggregate(statusPipeline).toArray()

    const byStatus = {}
    let total = 0
    statusStats.forEach(stat => {
      byStatus[stat._id] = stat.count
      total += stat.count
    })

    // Revenue stats
    const revenuePipeline = [
      { $match: { _destroy: false } },
      { $group: {
        _id: null,
        totalFee: { $sum: '$fee.total' },
        totalPaid: { $sum: '$fee.paid' },
        totalPending: { $sum: '$fee.pending' }
      } }
    ]
    const revenueStats = await GET_DB().collection(ENROLLMENT_COLLECTION_NAME).aggregate(revenuePipeline).toArray()
    const revenue = revenueStats[0] || { totalFee: 0, totalPaid: 0, totalPending: 0 }

    // Top courses by enrollment count
    const topCoursesPipeline = [
      { $match: { _destroy: false } },
      { $group: { _id: '$courseId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]
    const topCourses = await GET_DB().collection(ENROLLMENT_COLLECTION_NAME).aggregate(topCoursesPipeline).toArray()

    // Get course details for top courses
    const topCoursesWithDetails = await Promise.all(
      topCourses.map(async (item) => {
        const course = await courseModel.findOneById(item._id)
        return {
          courseId: item._id,
          title: course?.title || 'Unknown',
          count: item.count
        }
      })
    )

    return {
      total,
      byStatus,
      revenue: {
        total: revenue.totalFee,
        paid: revenue.totalPaid,
        pending: revenue.totalPending
      },
      topCourses: topCoursesWithDetails
    }
  } catch (error) {
    throw new Error(error.message)
  }
}

const getMonthlyTrend = async (months = 6) => {
  try {
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - months)

    const pipeline = [
      {
        $match: {
          _destroy: false,
          enrolledAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$enrolledAt' },
            month: { $month: '$enrolledAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]

    const trend = await GET_DB().collection(ENROLLMENT_COLLECTION_NAME).aggregate(pipeline).toArray()

    return trend.map(item => ({
      year: item._id.year,
      month: item._id.month,
      count: item.count,
      label: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`
    }))
  } catch (error) {
    throw new Error(error.message)
  }
}

const getEnrollmentsForExport = async (filters = {}) => {
  try {
    const query = { _destroy: false, ...filters }

    const enrollments = await GET_DB().collection(ENROLLMENT_COLLECTION_NAME)
      .find(query)
      .sort({ enrolledAt: -1 })
      .toArray()

    const enrichedEnrollments = await Promise.all(
      enrollments.map(async (enrollment) => {
        const course = await courseModel.findOneById(enrollment.courseId)
        const user = await userModel.findOneById(enrollment.userId)
        return {
          enrollmentId: enrollment._id,
          userId: enrollment.userId,
          userName: user?.displayName || 'N/A',
          userEmail: user?.email || 'N/A',
          courseId: enrollment.courseId,
          courseTitle: course?.title || 'N/A',
          status: enrollment.status,
          progress: enrollment.progress?.percentage || 0,
          totalFee: enrollment.fee?.total || 0,
          paidFee: enrollment.fee?.paid || 0,
          pendingFee: enrollment.fee?.pending || 0,
          enrolledAt: enrollment.enrolledAt,
          startDate: enrollment.startDate,
          completedAt: enrollment.completedAt,
          source: enrollment.source
        }
      })
    )

    return enrichedEnrollments
  } catch (error) {
    throw new Error(error.message)
  }
}

export const enrollmentModel = {
  ENROLLMENT_COLLECTION_NAME,
  ENROLLMENT_COLLECTION_SCHEMA,
  ENROLLMENT_PAYMENT_STATUS,

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
  updatePaymentStatus,
  promoteFromWaitlist,

  // Delete
  deleteEnrollment,

  // Aggregate
  getStatsByCourse,
  getStatsByUser,
  getOverallStats,

  // Admin
  getAdminStats,
  getMonthlyTrend,
  getEnrollmentsForExport
}
