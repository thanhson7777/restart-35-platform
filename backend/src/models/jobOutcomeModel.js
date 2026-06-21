import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'

// ============ OUTCOME TYPES ============
/**
 * Outcome status for job applications
 * Track: applied → interviewed → hired/rejected
 */
export const OUTCOME_STATUS = {
  APPLIED: 'applied',           // User đã ứng tuyển
  REVIEWING: 'reviewing',       // Đang được xem xét
  INTERVIEWED: 'interviewed',   // Đã phỏng vấn
  OFFERED: 'offered',          // Được offer
  HIRED: 'hired',              // Được nhận
  REJECTED: 'rejected',         // Bị từ chối
  WITHDRAWN: 'withdrawn',      // User rút đơn
  EXPIRED: 'expired'            // Hết hạn
}

// ============ OUTCOME WEIGHTS (for ML) ============
/**
 * Weight for each outcome status
 * Used to calculate job quality and user success
 */
export const OUTCOME_WEIGHTS = {
  [OUTCOME_STATUS.HIRED]: 10.0,        // Best outcome
  [OUTCOME_STATUS.OFFERED]: 8.0,
  [OUTCOME_STATUS.INTERVIEWED]: 5.0,
  [OUTCOME_STATUS.REVIEWING]: 2.0,
  [OUTCOME_STATUS.APPLIED]: 1.0,
  [OUTCOME_STATUS.REJECTED]: -2.0,      // Negative signal
  [OUTCOME_STATUS.WITHDRAWN]: 0.0,
  [OUTCOME_STATUS.EXPIRED]: 0.0
}

// ============ FEEDBACK TYPES ============
export const FEEDBACK_TYPES = {
  POSITIVE: 'positive',         // User hài lòng
  NEUTRAL: 'neutral',          // Bình thường
  NEGATIVE: 'negative',        // Không hài lòng
  NO_SHOW: 'no_show'           // Không đến phỏng vấn
}

// ============ COLLECTION SCHEMA ============
const JOB_OUTCOME_COLLECTION_NAME = 'job_outcomes'
const JOB_OUTCOME_COLLECTION_SCHEMA = Joi.object({
  // User and Job IDs
  userId: Joi.string().required(),
  jobId: Joi.string().required(),
  interactionId: Joi.string().allow(null),  // Reference to interaction record

  // Job info (denormalized for easy query)
  jobTitle: Joi.string().allow('', null),
  companyName: Joi.string().allow('', null),
  jobCategory: Joi.string().allow('', null),

  // Outcome tracking
  status: Joi.string()
    .valid(...Object.values(OUTCOME_STATUS))
    .default(OUTCOME_STATUS.APPLIED),

  // Timeline
  appliedAt: Joi.date().timestamp('javascript').default(Date.now),
  statusUpdatedAt: Joi.date().timestamp('javascript').default(Date.now),
  outcomeDate: Joi.date().timestamp('javascript').allow(null),

  // User feedback
  rating: Joi.number().integer().min(1).max(5).allow(null),
  feedback: Joi.object({
    type: Joi.string()
      .valid(...Object.values(FEEDBACK_TYPES))
      .allow(null),
    comment: Joi.string().allow('', null),
    wouldApplyAgain: Joi.boolean().allow(null),
    recommendToOthers: Joi.boolean().allow(null),
    pros: Joi.array().items(Joi.string()).default([]),
    cons: Joi.array().items(Joi.string()).default([])
  }).default({}),

  // Interview details (if interviewed)
  interviewDetails: Joi.object({
    date: Joi.date().timestamp('javascript').allow(null),
    type: Joi.string().valid('in_person', 'online', 'phone').allow(null),
    result: Joi.string().valid('passed', 'failed', 'pending').allow(null),
    notes: Joi.string().allow('', null)
  }).default({}),

  // Salary negotiation
  salaryOffered: Joi.number().integer().allow(null),
  salaryNegotiated: Joi.boolean().default(false),

  // User preferences derived from this application
  derivedPreferences: Joi.object({
    preferredJobTypes: Joi.array().items(Joi.string()).default([]),
    preferredLocations: Joi.array().items(Joi.string()).default([]),
    preferredSalaryRange: Joi.object({
      min: Joi.number().integer().allow(null),
      max: Joi.number().integer().allow(null)
    }).allow(null),
    preferredCompanySizes: Joi.array().items(Joi.string()).default([])
  }).default({}),

  // Engagement metrics
  engagementMetrics: Joi.object({
    timeToApply: Joi.number().integer().min(0).default(0),        // ms từ view → apply
    viewCount: Joi.number().integer().min(0).default(0),         // Số lần xem job
    clickCount: Joi.number().integer().min(0).default(0)         // Số lần click
  }).default({}),

  // Success score (calculated)
  successScore: Joi.number().min(-10).max(10).default(0),

  // Timestamps
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(Date.now),

  // Soft delete
  _destroy: Joi.boolean().default(false)
})

// ============ VALIDATION ============
const validateBeforeCreate = async (data) => {
  return await JOB_OUTCOME_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
    stripUnknown: true
  })
}

const validateBeforeUpdate = async (data) => {
  const updateSchema = JOB_OUTCOME_COLLECTION_SCHEMA.fork(
    ['userId', 'jobId'],
    (schema) => schema.forbidden()
  )
  return await updateSchema.validateAsync(data, {
    abortEarly: false,
    stripUnknown: true
  })
}

// ============ CRUD OPERATIONS ============

/**
 * Create a new outcome record
 * Called when user applies to a job
 */
const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)

    // Calculate success score based on outcome
    if (OUTCOME_WEIGHTS[validData.status]) {
      validData.successScore = OUTCOME_WEIGHTS[validData.status]
    }

    const result = await GET_DB().collection(JOB_OUTCOME_COLLECTION_NAME).insertOne(validData)
    return { ...validData, _id: result.insertedId }
  } catch (error) {
    throw new Error(error.message)
  }
}

/**
 * Create outcome with interaction reference
 * Links outcome to interaction record
 */
const createFromInteraction = async (interactionData) => {
  try {
    const data = {
      userId: interactionData.userId,
      jobId: interactionData.jobId,
      interactionId: interactionData._id?.toString() || interactionData.interactionId,
      jobTitle: interactionData.jobTitle || '',
      companyName: interactionData.companyName || '',
      jobCategory: interactionData.metadata?.jobCategory || '',
      status: OUTCOME_STATUS.APPLIED,
      appliedAt: interactionData.createdAt || new Date(),
      engagementMetrics: {
        timeToApply: interactionData.viewDuration || 0,
        viewCount: 1,
        clickCount: 1
      }
    }

    return await createNew(data)
  } catch (error) {
    throw new Error(error.message)
  }
}

/**
 * Update outcome status
 */
const updateStatus = async (outcomeId, newStatus, additionalData = {}) => {
  try {
    const objectId = new ObjectId(outcomeId)

    const updateData = {
      status: newStatus,
      statusUpdatedAt: new Date(),
      updatedAt: new Date(),
      ...additionalData
    }

    // Recalculate success score
    if (OUTCOME_WEIGHTS[newStatus]) {
      updateData.successScore = OUTCOME_WEIGHTS[newStatus]
    }

    // Set outcome date for terminal states
    if ([OUTCOME_STATUS.HIRED, OUTCOME_STATUS.REJECTED, OUTCOME_STATUS.WITHDRAWN, OUTCOME_STATUS.EXPIRED].includes(newStatus)) {
      updateData.outcomeDate = new Date()
    }

    const result = await GET_DB().collection(JOB_OUTCOME_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

/**
 * Update feedback and rating
 */
const updateFeedback = async (outcomeId, feedbackData) => {
  try {
    const objectId = new ObjectId(outcomeId)

    const updateData = {
      feedback: feedbackData,
      updatedAt: new Date()
    }

    // Update rating if provided
    if (feedbackData.rating !== undefined) {
      updateData.rating = feedbackData.rating
    }

    const result = await GET_DB().collection(JOB_OUTCOME_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

/**
 * Find outcome by user and job
 */
const findByUserAndJob = async (userId, jobId) => {
  try {
    return await GET_DB().collection(JOB_OUTCOME_COLLECTION_NAME).findOne({
      userId: userId,
      jobId: jobId,
      _destroy: { $ne: true }
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

/**
 * Find outcome by ID
 */
const findById = async (outcomeId) => {
  try {
    const objectId = new ObjectId(outcomeId)
    return await GET_DB().collection(JOB_OUTCOME_COLLECTION_NAME).findOne({
      _id: objectId,
      _destroy: { $ne: true }
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

/**
 * Get all outcomes for a user
 */
const findByUserId = async (userId, options = {}) => {
  try {
    const { status, limit = 50, skip = 0, sort = { appliedAt: -1 } } = options

    const query = { userId: userId, _destroy: { $ne: true } }
    if (status) {
      query.status = status
    }

    const outcomes = await GET_DB().collection(JOB_OUTCOME_COLLECTION_NAME)
      .find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray()

    return outcomes
  } catch (error) {
    throw new Error(error.message)
  }
}

/**
 * Get all outcomes for a job
 */
const findByJobId = async (jobId, options = {}) => {
  try {
    const { status, limit = 50, skip = 0, sort = { appliedAt: -1 } } = options

    const query = { jobId: jobId, _destroy: { $ne: true } }
    if (status) {
      query.status = status
    }

    const outcomes = await GET_DB().collection(JOB_OUTCOME_COLLECTION_NAME)
      .find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray()

    return outcomes
  } catch (error) {
    throw new Error(error.message)
  }
}

/**
 * Get user success rate
 */
const getUserSuccessRate = async (userId) => {
  try {
    const pipeline = [
      { $match: { userId: userId, _destroy: { $ne: true } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgRating: { $avg: '$rating' }
        }
      }
    ]

    const result = await GET_DB().collection(JOB_OUTCOME_COLLECTION_NAME).aggregate(pipeline).toArray()

    const stats = {
      total: 0,
      hired: 0,
      interviewed: 0,
      rejected: 0,
      pending: 0,
      avgRating: 0,
      successRate: 0
    }

    let totalRating = 0
    let ratingCount = 0

    result.forEach(item => {
      stats.total += item.count
      if (item._id === OUTCOME_STATUS.HIRED) stats.hired = item.count
      if (item._id === OUTCOME_STATUS.INTERVIEWED) stats.interviewed = item.count
      if (item._id === OUTCOME_STATUS.REJECTED) stats.rejected = item.count
      if ([OUTCOME_STATUS.APPLIED, OUTCOME_STATUS.REVIEWING].includes(item._id)) {
        stats.pending += item.count
      }
      if (item.avgRating) {
        totalRating += item.avgRating * item.count
        ratingCount += item.count
      }
    })

    stats.avgRating = ratingCount > 0 ? totalRating / ratingCount : 0
    stats.successRate = stats.total > 0 ? (stats.hired / stats.total) * 100 : 0

    return stats
  } catch (error) {
    throw new Error(error.message)
  }
}

/**
 * Get user preferences from outcomes
 * Analyzes outcomes to derive user preferences
 */
const getUserPreferences = async (userId) => {
  try {
    const outcomes = await findByUserId(userId, { limit: 100 })

    const preferences = {
      preferredJobTypes: {},
      preferredLocations: {},
      preferredSalaryRanges: [],
      preferredCompanySizes: {},
      appliedJobCategories: {},
      successByCategory: {}
    }

    outcomes.forEach(outcome => {
      // Count job types
      if (outcome.derivedPreferences?.preferredJobTypes) {
        outcome.derivedPreferences.preferredJobTypes.forEach(type => {
          preferences.preferredJobTypes[type] = (preferences.preferredJobTypes[type] || 0) + 1
        })
      }

      // Count locations
      if (outcome.jobCategory) {
        preferences.preferredLocations[outcome.jobCategory] =
          (preferences.preferredLocations[outcome.jobCategory] || 0) + 1
      }

      // Track success by category
      if (outcome.jobCategory) {
        if (!preferences.successByCategory[outcome.jobCategory]) {
          preferences.successByCategory[outcome.jobCategory] = { total: 0, hired: 0 }
        }
        preferences.successByCategory[outcome.jobCategory].total++
        if (outcome.status === OUTCOME_STATUS.HIRED) {
          preferences.successByCategory[outcome.jobCategory].hired++
        }
      }
    })

    return preferences
  } catch (error) {
    throw new Error(error.message)
  }
}

/**
 * Get job success metrics
 */
const getJobSuccessMetrics = async (jobId) => {
  try {
    const pipeline = [
      { $match: { jobId: jobId, _destroy: { $ne: true } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgRating: { $avg: '$rating' },
          avgSalary: { $avg: '$salaryOffered' }
        }
      }
    ]

    const result = await GET_DB().collection(JOB_OUTCOME_COLLECTION_NAME).aggregate(pipeline).toArray()

    const metrics = {
      totalApplications: 0,
      hired: 0,
      interviewed: 0,
      rejected: 0,
      avgRating: 0,
      avgSalaryOffered: 0
    }

    let totalRating = 0
    let ratingCount = 0
    let totalSalary = 0
    let salaryCount = 0

    result.forEach(item => {
      metrics.totalApplications += item.count
      if (item._id === OUTCOME_STATUS.HIRED) metrics.hired = item.count
      if (item._id === OUTCOME_STATUS.INTERVIEWED) metrics.interviewed = item.count
      if (item._id === OUTCOME_STATUS.REJECTED) metrics.rejected = item.count
      if (item.avgRating) {
        totalRating += item.avgRating * item.count
        ratingCount += item.count
      }
      if (item.avgSalary) {
        totalSalary += item.avgSalary * item.count
        salaryCount += item.count
      }
    })

    metrics.avgRating = ratingCount > 0 ? totalRating / ratingCount : 0
    metrics.avgSalaryOffered = salaryCount > 0 ? totalSalary / salaryCount : 0

    // Calculate conversion rates
    if (metrics.totalApplications > 0) {
      metrics.interviewRate = (metrics.interviewed / metrics.totalApplications) * 100
      metrics.hireRate = (metrics.hired / metrics.totalApplications) * 100
    } else {
      metrics.interviewRate = 0
      metrics.hireRate = 0
    }

    return metrics
  } catch (error) {
    throw new Error(error.message)
  }
}

/**
 * Get aggregated stats (for ML training)
 */
const getAggregatedStats = async (options = {}) => {
  try {
    const { startDate, endDate } = options

    const matchStage = { _destroy: { $ne: true } }
    if (startDate || endDate) {
      matchStage.appliedAt = {}
      if (startDate) matchStage.appliedAt.$gte = new Date(startDate)
      if (endDate) matchStage.appliedAt.$lte = new Date(endDate)
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgRating: { $avg: '$rating' },
          avgSuccessScore: { $avg: '$successScore' }
        }
      }
    ]

    return await GET_DB().collection(JOB_OUTCOME_COLLECTION_NAME).aggregate(pipeline).toArray()
  } catch (error) {
    throw new Error(error.message)
  }
}

/**
 * Soft delete an outcome
 */
const softDelete = async (outcomeId) => {
  try {
    const objectId = new ObjectId(outcomeId)
    const result = await GET_DB().collection(JOB_OUTCOME_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      { $set: { _destroy: true, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ EXPORT ============
export const jobOutcomeModel = {
  JOB_OUTCOME_COLLECTION_NAME,
  OUTCOME_STATUS,
  OUTCOME_WEIGHTS,
  FEEDBACK_TYPES,

  createNew,
  createFromInteraction,
  updateStatus,
  updateFeedback,
  findByUserAndJob,
  findById,
  findByUserId,
  findByJobId,
  getUserSuccessRate,
  getUserPreferences,
  getJobSuccessMetrics,
  getAggregatedStats,
  softDelete
}
