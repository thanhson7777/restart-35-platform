import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { courseModel } from '~/models/courseModel'
import { partnershipModel } from '~/models/partnershipModel'
import { userModel } from '~/models/userModel'
import {
  ENROLLMENT_STATUS_V2,
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
    .valid(...Object.values(ENROLLMENT_STATUS_V2))
    .default(ENROLLMENT_STATUS_V2.ACTIVE),

  payment_status: Joi.string()
    .valid(...Object.values(ENROLLMENT_PAYMENT_STATUS))
    .default(ENROLLMENT_PAYMENT_STATUS.PENDING),

  progress: Joi.object({
    percentage: Joi.number().min(0).max(100).default(0),
    completionStatus: Joi.string()
      .valid(...Object.values(COMPLETION_STATUS))
      .default(COMPLETION_STATUS.NOT_STARTED),
    currentLesson: Joi.number().integer().min(0).default(0),
    totalLessons: Joi.number().integer().min(0).default(0),
    byDelivery: Joi.object({
      video: Joi.number().min(0).max(100).default(0),
      live: Joi.number().min(0).max(100).default(0),
      offline: Joi.number().min(0).max(100).default(0)
    }).default({ video: 0, live: 0, offline: 0 })
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

  partnershipId: Joi.string().allow(null, ''),
  enterpriseId: Joi.string().allow(null, ''),
  sponsorships: Joi.array().items(
    Joi.object({
      sponsorshipId: Joi.string().required(),
      sponsorType: Joi.string().required(),
      fundedAmount: Joi.number().integer().min(0).default(0),
      disbursedAmount: Joi.number().integer().min(0).default(0),
      clawbackAmount: Joi.number().integer().min(0).default(0),
      coverage: Joi.string()
        .valid(...Object.values(SCHOLARSHIP_COVERAGE))
        .default(SCHOLARSHIP_COVERAGE.PARTIAL),
      status: Joi.string().valid('matched', 'approved', 'disbursed', 'clawback').default('matched'),
      disbursements: Joi.array().items(Joi.object()).default([]),
      matchedAt: Joi.date().timestamp('javascript').default(Date.now)
    })
  ).default([]),

  waitlistPosition: Joi.number().integer().min(1).allow(null),

  dropout_risk: Joi.object({
    score: Joi.number().min(0).max(100).default(0),
    level: Joi.string().valid('low', 'medium', 'high').default('low'),
    reasons: Joi.array().items(Joi.string()).default([]),
    last_calculated_at: Joi.date().timestamp('javascript').allow(null),
    interventions_sent: Joi.array().items(
      Joi.object({
        type: Joi.string().required(),
        sent_at: Joi.date().timestamp('javascript').default(Date.now)
      })
    ).default([])
  }).default({
    score: 0,
    level: 'low',
    reasons: [],
    last_calculated_at: null,
    interventions_sent: []
  }),

  isa: Joi.object({
    contract_signed_at: Joi.date().timestamp('javascript').allow(null),
    income_threshold: Joi.number().integer().min(0).default(0),
    repayment_rate: Joi.number().min(0).max(1).default(0.10),
    max_repayment: Joi.number().integer().min(0).default(0),
    total_repaid: Joi.number().integer().min(0).default(0),
    current_status: Joi.string().valid('active', 'completed', 'defaulted').default('active'),
    installments: Joi.array().items(
      Joi.object({
        period: Joi.string().required(),
        income_reported: Joi.number().integer().min(0).required(),
        repayment_amount: Joi.number().integer().min(0).required(),
        status: Joi.string().valid('pending', 'paid', 'skipped', 'waived').default('pending'),
        due_date: Joi.date().timestamp('javascript').required(),
        paid_at: Joi.date().timestamp('javascript').allow(null)
      })
    ).default([])
  }).allow(null),

  certificateId: Joi.string().allow(null, ''),

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
      _destroy: { $ne: true }
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const findByUser = async (userId, skip = 0, limit = 10, filters = {}) => {
  try {
    const query = {
      userId: userId,
      _destroy: { $ne: true },
      ...filters
    }

    const enrollments = await GET_DB().collection(ENROLLMENT_COLLECTION_NAME)
      .find(query)
      .sort({ enrolledAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    // #region agent debug log
    fetch('http://127.0.0.1:7657/ingest/50723660-d880-4eec-a288-d8347939a202',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1e17d2'},body:JSON.stringify({sessionId:'1e17d2',location:'enrollmentModel.js:findByUser',message:'findByUser raw courseIds',data:{userId,total:enrollments.length,courseIds:enrollments.map(e=>e.courseId)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

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
      _destroy: { $ne: true },
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
      status: ENROLLMENT_STATUS_V2.COMPLETED,
      _destroy: { $ne: true }
    }).toArray()
  } catch (error) {
    throw new Error(error.message)
  }
}

const findAll = async (skip = 0, limit = 10, filters = {}) => {
  try {
    const query = {
      _destroy: { $ne: true },
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

const findActivePartnershipByEnterpriseAndCourse = async (enterpriseId, courseId) => {
  try {
    return await GET_DB().collection(ENROLLMENT_COLLECTION_NAME).findOne({
      enterpriseId,
      courseId,
      status: { $in: [ENROLLMENT_STATUS_V2.ACTIVE, ENROLLMENT_STATUS_V2.IN_PROGRESS, ENROLLMENT_STATUS_V2.COMPLETED] },
      partnershipId: { $ne: null },
      _destroy: { $ne: true }
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const resolveActivePartnershipForCourse = async (courseId) => {
  try {
    return await partnershipModel.findActiveByCourse(courseId)
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

    if (status === ENROLLMENT_STATUS_V2.ACTIVE) {
      if (!additionalData.startDate) {
        updateData.startDate = Date.now()
      }
    }

    if (status === ENROLLMENT_STATUS_V2.COMPLETED) {
      updateData.completedAt = Date.now()
      updateData['progress.completionStatus'] = COMPLETION_STATUS.COMPLETED
      updateData['progress.percentage'] = 100
    }

    if (status === ENROLLMENT_STATUS_V2.DROPPED) {
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
        status: ENROLLMENT_STATUS_V2.SUSPENDED,
        _destroy: { $ne: true }
      },
      {
        $set: {
          status: ENROLLMENT_STATUS_V2.ACTIVE,
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
          status: ENROLLMENT_STATUS_V2.DROPPED,
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
          _destroy: { $ne: true }
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
          _destroy: { $ne: true }
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
      if (stat._id === ENROLLMENT_STATUS_V2.COMPLETED) {
        result.completed = stat.count
      }
      if (stat._id === ENROLLMENT_STATUS_V2.ACTIVE) {
        result.inProgress = stat.count
      }
    })

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const getOverallStats = async (trainerId = null) => {
  try {
    const db = GET_DB()
    const pipeline = []

    let courseIds = null
    if (trainerId) {
      // Find all courses owned by this trainer
      const courses = await db.collection(courseModel.COURSE_COLLECTION_NAME).find({
        providerId: trainerId,
        _destroy: { $ne: true }
      }).toArray()
      courseIds = courses.map(c => c._id.toString())

      pipeline.push({
        $match: {
          courseId: { $in: courseIds },
          _destroy: { $ne: true }
        }
      })
    } else {
      pipeline.push({
        $match: {
          _destroy: { $ne: true }
        }
      })
    }

    pipeline.push({
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    })

    const stats = await db.collection(ENROLLMENT_COLLECTION_NAME).aggregate(pipeline).toArray()

    const result = {
      total: 0,
      byStatus: {}
    }

    stats.forEach(stat => {
      result.byStatus[stat._id] = stat.count
      result.total += stat.count
    })

    // Retrieve recent enrollments for dashboard compatibility
    const matchQuery = { _destroy: { $ne: true } }
    if (courseIds) {
      matchQuery.courseId = { $in: courseIds }
    }

    const enrollments = await db.collection(ENROLLMENT_COLLECTION_NAME)
      .find(matchQuery)
      .sort({ enrolledAt: -1 })
      .limit(5)
      .toArray()

    const recentEnrollments = await Promise.all(
      enrollments.map(async (enrollment) => {
        const course = await courseModel.findOneById(enrollment.courseId)
        const user = await userModel.findOneById(enrollment.userId)
        return {
          enrollmentId: enrollment._id,
          userId: enrollment.userId,
          userName: user?.displayName || 'N/A',
          userEmail: user?.email || 'N/A',
          userAvatar: user?.avatar || null,
          courseId: enrollment.courseId,
          courseTitle: course?.title || 'N/A',
          enrolledAt: enrollment.enrolledAt,
          status: enrollment.status,
          progress: enrollment.progress?.percentage || 0
        }
      })
    )

    // Retrieve monthly enrollment trend (last 12 months)
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - 12)
    const trendMatchQuery = {
      _destroy: { $ne: true },
      enrolledAt: { $gte: startDate }
    }
    if (courseIds) {
      trendMatchQuery.courseId = { $in: courseIds }
    }

    const monthlyTrend = await db.collection(ENROLLMENT_COLLECTION_NAME).aggregate([
      { $match: trendMatchQuery },
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
    ]).toArray()

    const trendData = monthlyTrend.map(item => {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const label = `${monthNames[item._id.month - 1]} ${item._id.year}`
      return {
        month: label,
        count: item.count
      }
    })

    result.recentEnrollments = recentEnrollments
    result.monthlyTrend = trendData

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ ADMIN STATS ============
const getAdminStats = async () => {
  try {
    const db = GET_DB()
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Total enrollments
    const totalEnrollments = await db.collection(ENROLLMENT_COLLECTION_NAME).countDocuments({ _destroy: { $ne: true } })

    // Revenue this month
    const monthlyRevenueResult = await db.collection(ENROLLMENT_COLLECTION_NAME).aggregate([
      {
        $match: {
          _destroy: { $ne: true },
          enrolledAt: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$fee.paid' }
        }
      }
    ]).toArray()
    const revenueThisMonth = monthlyRevenueResult[0]?.total || 0

    // Dropout rate
    const droppedCount = await db.collection(ENROLLMENT_COLLECTION_NAME).countDocuments({
      status: 'dropped',
      _destroy: { $ne: true }
    })
    const dropoutRate = totalEnrollments > 0 ? Math.round((droppedCount / totalEnrollments) * 1000) / 10 : 0

    // Pending courses count
    const pendingCourses = await db.collection('courses').countDocuments({
      status: 'pending',
      _destroy: { $ne: true }
    })

    // Top courses
    const topCoursesPipeline = [
      { $match: { _destroy: { $ne: true } } },
      { $group: { _id: '$courseId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]
    const topCourses = await db.collection(ENROLLMENT_COLLECTION_NAME).aggregate(topCoursesPipeline).toArray()
    const topCoursesWithDetails = await Promise.all(
      topCourses.map(async (item) => {
        const course = await db.collection('courses').findOne({ _id: new ObjectId(item._id) })
        return {
          courseId: item._id,
          title: course?.title || 'Unknown',
          enrollments: item.count
        }
      })
    )

    // Recent enrollments
    const recentEnrollmentsRaw = await db.collection(ENROLLMENT_COLLECTION_NAME)
      .find({ _destroy: { $ne: true } })
      .sort({ enrolledAt: -1 })
      .limit(5)
      .toArray()
    const recentEnrollments = await Promise.all(
      recentEnrollmentsRaw.map(async (item) => {
        const user = await db.collection('users').findOne({ _id: new ObjectId(item.userId) })
        const course = await db.collection('courses').findOne({ _id: new ObjectId(item.courseId) })
        return {
          _id: item._id,
          userId: item.userId,
          userName: user?.displayName || 'N/A',
          userEmail: user?.email || 'N/A',
          userAvatar: user?.avatar || null,
          courseId: item.courseId,
          courseTitle: course?.title || 'N/A',
          enrolledAt: item.enrolledAt,
          status: item.status,
          progress: item.progress?.percentage || 0
        }
      })
    )

    // Revenue by month (12 months)
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
    const monthlyRevenueTrend = await db.collection(ENROLLMENT_COLLECTION_NAME).aggregate([
      {
        $match: {
          _destroy: { $ne: true },
          enrolledAt: { $gte: twelveMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$enrolledAt' },
            month: { $month: '$enrolledAt' }
          },
          amount: { $sum: '$fee.paid' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]).toArray()

    const revenueByMonth = monthlyRevenueTrend.map(item => {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const label = `${monthNames[item._id.month - 1]} ${item._id.year}`
      return {
        month: label,
        amount: item.amount
      }
    })

    // For compatibility with Phase 2 tests
    const statusCounts = await db.collection(ENROLLMENT_COLLECTION_NAME).aggregate([
      { $match: { _destroy: { $ne: true } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray()
    const byStatus = {}
    statusCounts.forEach(item => {
      byStatus[item._id] = item.count
    })

    return {
      totalEnrollments,
      revenueThisMonth,
      dropoutRate,
      pendingCourses,
      recentEnrollments,
      topCourses: topCoursesWithDetails,
      revenueByMonth,
      // Compatibility fields
      total: totalEnrollments,
      byStatus
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
          _destroy: { $ne: true },
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
    const query = { _destroy: { $ne: true }, ...filters }

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
  findActivePartnershipByEnterpriseAndCourse,
  resolveActivePartnershipForCourse,

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
