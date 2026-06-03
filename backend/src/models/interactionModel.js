import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'

// ============ INTERACTION TYPES ============
export const INTERACTION_TYPES = {
  CLICK: 'click',
  VIEW: 'view',
  APPLY: 'apply',
  BOOKMARK: 'bookmark',
  SKIP: 'skip',
  SAVE: 'save'
}

// ============ RECOMMENDATION METHODS ============
export const RECOMMENDATION_METHODS = {
  CF: 'cf',           // Collaborative Filtering
  CONTENT: 'content', // Content-based
  SEMANTIC: 'semantic', // Semantic search
  HYBRID: 'hybrid'   // Hybrid approach
}

// ============ TIME OF DAY ============
export const TIME_OF_DAY = {
  MORNING: 'morning',     // 5:00 - 11:59
  AFTERNOON: 'afternoon', // 12:00 - 17:59
  EVENING: 'evening',    // 18:00 - 21:59
  NIGHT: 'night'         // 22:00 - 4:59
}

// ============ DAY OF WEEK ============
export const DAY_OF_WEEK = {
  MONDAY: 'monday',
  TUESDAY: 'tuesday',
  WEDNESDAY: 'wednesday',
  THURSDAY: 'thursday',
  FRIDAY: 'friday',
  SATURDAY: 'saturday',
  SUNDAY: 'sunday'
}

// ============ ACTION WEIGHTS (for implicit feedback) ============
export const INTERACTION_WEIGHTS = {
  [INTERACTION_TYPES.APPLY]: 5.0,     // Strongest signal
  [INTERACTION_TYPES.BOOKMARK]: 4.0,
  [INTERACTION_TYPES.SAVE]: 4.0,
  [INTERACTION_TYPES.CLICK]: 2.0,
  [INTERACTION_TYPES.VIEW]: 1.0,
  [INTERACTION_TYPES.SKIP]: 0.0       // Negative signal
}

const INTERACTION_COLLECTION_NAME = 'user_interactions'

// ============ IMPLICIT FEEDBACK SCORING ============

/**
 * Tính implicit feedback score từ interaction data
 * Dùng để train ML models
 * 
 * Signal weights:
 * - apply: 5.0 (strongest positive)
 * - bookmark: 4.0
 * - click: 2.0
 * - view: 1.0
 * - skip: 0.0
 * 
 * Engagement modifiers:
 * - viewDuration > 30s: +0.5
 * - scrollDepth > 0.8: +0.3
 * - returnVisit: -0.2 (already seen, less valuable)
 * - high position (1-3): +0.1
 */
export const calculateImplicitFeedbackScore = (interaction) => {
  const baseScore = INTERACTION_WEIGHTS[interaction.action] || 0
  
  let modifier = 0
  
  // View duration modifier (more engagement = higher score)
  if (interaction.viewDuration > 60) {
    modifier += 0.5  // Very engaged
  } else if (interaction.viewDuration > 30) {
    modifier += 0.3  // Moderately engaged
  } else if (interaction.viewDuration > 10) {
    modifier += 0.1  // Light engagement
  }
  
  // Scroll depth modifier
  if (interaction.scrollDepth > 0.8) {
    modifier += 0.3  // Read most of job details
  } else if (interaction.scrollDepth > 0.5) {
    modifier += 0.1  // Partial read
  }
  
  // Return visit penalty (already seen = less valuable signal)
  if (interaction.returnVisit) {
    modifier -= 0.2
  }
  
  // Position modifier (top positions slightly more valuable)
  const position = interaction.recommendationPosition || interaction.context?.position || 10
  if (position <= 3) {
    modifier += 0.1
  }
  
  return Math.max(0, Math.min(5, baseScore + modifier))
}

/**
 * Tính engagement level từ interaction
 * Dùng để phân loại user engagement
 */
export const getEngagementLevel = (interaction) => {
  const score = calculateImplicitFeedbackScore(interaction)
  
  if (score >= 4) return 'high'
  if (score >= 2) return 'medium'
  return 'low'
}

/**
 * Xác định user intent từ interaction sequence
 */
export const inferUserIntent = (interactionSequence) => {
  if (!interactionSequence || interactionSequence.length === 0) {
    return 'unknown'
  }
  
  const lastAction = interactionSequence[interactionSequence.length - 1].action
  
  switch (lastAction) {
    case 'apply':
      return 'ready_to_apply'
    case 'click':
      return 'researching'
    case 'bookmark':
      return 'comparing'
    case 'skip':
      return 'not_interested'
    case 'view':
      return 'browsing'
    default:
      return 'unknown'
  }
}
const INTERACTION_COLLECTION_SCHEMA = Joi.object({
  userId: Joi.string().required(),
  jobId: Joi.string().required(),
  jobTitle: Joi.string().allow('', null),
  companyName: Joi.string().allow('', null),
  action: Joi.string().valid(...Object.values(INTERACTION_TYPES)).required(),
  weight: Joi.number().default(1.0),

  // Context data
  context: Joi.object({
    page: Joi.string().allow(''),
    position: Joi.number().integer().min(0),
    sessionId: Joi.string().allow('', null),
    referrer: Joi.string().allow('', null)
  }).default({}),

  // Duration tracking (for view time) - in seconds
  viewDuration: Joi.number().integer().min(0).default(0),

  // === IMPLICIT FEEDBACK SIGNALS (ML Features) ===
  
  // Scroll depth: 0-1 (how far user scrolled)
  scrollDepth: Joi.number().min(0).max(1).default(0),
  
  // Hover duration: seconds user hovered on job card
  hoverDuration: Joi.number().integer().min(0).default(0),
  
  // Return visit: user viewed this job before
  returnVisit: Joi.boolean().default(false),
  
  // Search refine: user changed search after seeing this job
  searchRefine: Joi.boolean().default(false),

  // === ENHANCED CONTEXT (ML Features) ===
  
  // Time context
  timeOfDay: Joi.string().valid(
    TIME_OF_DAY.MORNING,
    TIME_OF_DAY.AFTERNOON,
    TIME_OF_DAY.EVENING,
    TIME_OF_DAY.NIGHT
  ).default('morning'),
  
  dayOfWeek: Joi.string().valid(
    DAY_OF_WEEK.MONDAY,
    DAY_OF_WEEK.TUESDAY,
    DAY_OF_WEEK.WEDNESDAY,
    DAY_OF_WEEK.THURSDAY,
    DAY_OF_WEEK.FRIDAY,
    DAY_OF_WEEK.SATURDAY,
    DAY_OF_WEEK.SUNDAY
  ).default('monday'),
  
  // Session context
  sessionDuration: Joi.number().integer().min(0).default(0),
  previousInteractionsCount: Joi.number().integer().min(0).default(0),

  // === FEATURE FLAGS (A/B Testing & Experimentation) ===
  
  // Position in recommendation list (1-50)
  recommendationPosition: Joi.number().integer().min(1).max(50).default(1),
  
  // How this job was recommended
  recommendationMethod: Joi.string().valid(
    RECOMMENDATION_METHODS.CF,
    RECOMMENDATION_METHODS.CONTENT,
    RECOMMENDATION_METHODS.SEMANTIC,
    RECOMMENDATION_METHODS.HYBRID
  ).default(RECOMMENDATION_METHODS.CONTENT),
  
  // A/B test variant identifier
  experimentVariant: Joi.string().allow('', null).default(null),

  // === METADATA ===
  metadata: Joi.object({
    jobCategory: Joi.string().allow('', null),
    jobLocation: Joi.string().allow('', null),
    salaryMin: Joi.number().allow(null),
    salaryMax: Joi.number().allow(null),
    jobType: Joi.string().allow('', null)
  }).default({}),

  // === DEVICE INFO ===
  device: Joi.object({
    platform: Joi.string().allow('', null),
    browser: Joi.string().allow('', null),
    mobile: Joi.boolean().default(false)
  }).default({}),

  // === OUTCOME TRACKING (nullable - fill later) ===
  // These fields are filled when outcome is known
  appliedAt: Joi.date().timestamp('javascript').allow(null).default(null),
  interviewedAt: Joi.date().timestamp('javascript').allow(null).default(null),
  hiredAt: Joi.date().timestamp('javascript').allow(null).default(null),
  rejectedAt: Joi.date().timestamp('javascript').allow(null).default(null),

  // Timestamps
  createdAt: Joi.date().timestamp('javascript').default(Date.now()),
  updatedAt: Joi.date().timestamp('javascript').default(Date.now()),

  // Soft delete
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await INTERACTION_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
    stripUnknown: true
  })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)

    // Set weight based on action type
    if (!validData.weight && INTERACTION_WEIGHTS[validData.action]) {
      validData.weight = INTERACTION_WEIGHTS[validData.action]
    }

    const result = await GET_DB().collection(INTERACTION_COLLECTION_NAME).insertOne(validData)
    return { ...validData, _id: result.insertedId }
  } catch (error) {
    throw new Error(error.message)
  }
}

const createMany = async (interactions) => {
  try {
    const validInteractions = await Promise.all(
      interactions.map(async (interaction) => {
        const valid = await validateBeforeCreate(interaction)
        if (!valid.weight && INTERACTION_WEIGHTS[valid.action]) {
          valid.weight = INTERACTION_WEIGHTS[valid.action]
        }
        return valid
      })
    )

    const result = await GET_DB().collection(INTERACTION_COLLECTION_NAME).insertMany(validInteractions)
    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const findByUserId = async (userId, options = {}) => {
  try {
    const { action, limit = 50, skip = 0, sort = { createdAt: -1 } } = options

    const query = { userId: userId, _destroy: { $ne: true } }
    if (action) {
      query.action = action
    }

    const interactions = await GET_DB().collection(INTERACTION_COLLECTION_NAME)
      .find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray()

    return interactions
  } catch (error) {
    throw new Error(error.message)
  }
}

const findByJobId = async (jobId, options = {}) => {
  try {
    const { action, limit = 50, skip = 0, sort = { createdAt: -1 } } = options

    const query = { jobId: jobId, _destroy: { $ne: true } }
    if (action) {
      query.action = action
    }

    const interactions = await GET_DB().collection(INTERACTION_COLLECTION_NAME)
      .find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray()

    return interactions
  } catch (error) {
    throw new Error(error.message)
  }
}

const getUserJobInteractions = async (userId, jobId) => {
  try {
    return await GET_DB().collection(INTERACTION_COLLECTION_NAME)
      .find({
        userId: userId,
        jobId: jobId,
        _destroy: { $ne: true }
      })
      .sort({ createdAt: -1 })
      .toArray()
  } catch (error) {
    throw new Error(error.message)
  }
}

const getUserEngagementScore = async (userId) => {
  try {
    const pipeline = [
      { $match: { userId: userId, _destroy: { $ne: true } } },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
          totalWeight: { $sum: '$weight' }
        }
      }
    ]

    const result = await GET_DB().collection(INTERACTION_COLLECTION_NAME).aggregate(pipeline).toArray()

    let totalScore = 0
    let totalInteractions = 0

    result.forEach(item => {
      totalScore += item.totalWeight
      totalInteractions += item.count
    })

    return {
      totalScore,
      totalInteractions,
      actionBreakdown: result,
      avgScorePerInteraction: totalInteractions > 0 ? totalScore / totalInteractions : 0
    }
  } catch (error) {
    throw new Error(error.message)
  }
}

const getJobPopularityScore = async (jobId) => {
  try {
    const pipeline = [
      { $match: { jobId: jobId, _destroy: { $ne: true } } },
      {
        $group: {
          _id: null,
          totalInteractions: { $sum: 1 },
          totalWeight: { $sum: '$weight' },
          clicks: {
            $sum: { $cond: [{ $eq: ['$action', 'click'] }, 1, 0] }
          },
          applies: {
            $sum: { $cond: [{ $eq: ['$action', 'apply'] }, 1, 0] }
          },
          bookmarks: {
            $sum: { $cond: [{ $eq: ['$action', 'bookmark'] }, 1, 0] }
          }
        }
      }
    ]

    const result = await GET_DB().collection(INTERACTION_COLLECTION_NAME).aggregate(pipeline).toArray()

    if (result.length === 0) {
      return {
        totalInteractions: 0,
        totalWeight: 0,
        clicks: 0,
        applies: 0,
        bookmarks: 0,
        popularityScore: 0
      }
    }

    const data = result[0]
    return {
      ...data,
      popularityScore: data.totalWeight
    }
  } catch (error) {
    throw new Error(error.message)
  }
}

const getUserUserSimilarity = async (userId1, userId2) => {
  try {
    // Get all interactions for both users
    const [interactions1, interactions2] = await Promise.all([
      findByUserId(userId1, { limit: 1000 }),
      findByUserId(userId2, { limit: 1000 })
    ])

    // Create job sets with weights
    const jobWeights1 = {}
    const jobWeights2 = {}

    interactions1.forEach(i => {
      jobWeights1[i.jobId] = (jobWeights1[i.jobId] || 0) + i.weight
    })

    interactions2.forEach(i => {
      jobWeights2[i.jobId] = (jobWeights2[i.jobId] || 0) + i.weight
    })

    // Get all unique job IDs
    const allJobIds = new Set([...Object.keys(jobWeights1), ...Object.keys(jobWeights2)])

    // Calculate cosine similarity
    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0

    allJobIds.forEach(jobId => {
      const w1 = jobWeights1[jobId] || 0
      const w2 = jobWeights2[jobId] || 0

      dotProduct += w1 * w2
      norm1 += w1 * w1
      norm2 += w2 * w2
    })

    const similarity = norm1 > 0 && norm2 > 0
      ? dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
      : 0

    return {
      similarity,
      commonJobs: Object.keys(jobWeights1).filter(id => jobWeights2[id]),
      user1JobCount: Object.keys(jobWeights1).length,
      user2JobCount: Object.keys(jobWeights2).length
    }
  } catch (error) {
    throw new Error(error.message)
  }
}

const getSimilarUsers = async (userId, limit = 10) => {
  try {
    // Get current user's interactions
    const userInteractions = await findByUserId(userId, { limit: 500 })

    if (userInteractions.length < 3) {
      return [] // Not enough data for similarity
    }

    // Get all other users who interacted with same jobs
    const jobIds = [...new Set(userInteractions.map(i => i.jobId))]

    const similarUsersData = await GET_DB().collection(INTERACTION_COLLECTION_NAME).aggregate([
      {
        $match: {
          userId: { $ne: userId },
          jobId: { $in: jobIds },
          _destroy: { $ne: true }
        }
      },
      {
        $group: {
          _id: '$userId',
          interactions: { $push: { jobId: '$jobId', weight: '$weight' } }
        }
      }
    ]).toArray()

    // Calculate similarity for each user
    const userJobWeights = {}
    userInteractions.forEach(i => {
      userJobWeights[i.jobId] = (userJobWeights[i.jobId] || 0) + i.weight
    })

    const similarities = []
    const norm1 = Math.sqrt(
      Object.values(userJobWeights).reduce((sum, w) => sum + w * w, 0)
    )

    for (const otherUser of similarUsersData) {
      const otherJobWeights = {}
      otherUser.interactions.forEach(i => {
        otherJobWeights[i.jobId] = (otherJobWeights[i.jobId] || 0) + i.weight
      })

      let dotProduct = 0
      let norm2 = 0

      jobIds.forEach(jobId => {
        const w1 = userJobWeights[jobId] || 0
        const w2 = otherJobWeights[jobId] || 0
        dotProduct += w1 * w2
      })

      const norm2Sum = Object.values(otherJobWeights).reduce((sum, w) => sum + w * w, 0)
      norm2 = Math.sqrt(norm2Sum)

      const similarity = norm1 > 0 && norm2 > 0 ? dotProduct / (norm1 * norm2) : 0

      similarities.push({
        userId: otherUser._id,
        similarity,
        commonJobs: otherUser.interactions.length
      })
    }

    // Sort by similarity and return top N
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
  } catch (error) {
    throw new Error(error.message)
  }
}

const getRecommendedJobsFromCF = async (userId, limit = 10) => {
  try {
    // Get similar users
    const similarUsers = await getSimilarUsers(userId, 20)

    if (similarUsers.length === 0) {
      return { jobs: [], reason: 'not_enough_data' }
    }

    // Get jobs that similar users interacted with
    const similarUserIds = similarUsers.map(u => u.userId)

    const pipeline = [
      {
        $match: {
          userId: { $in: similarUserIds },
          action: { $in: ['click', 'bookmark', 'apply'] },
          _destroy: { $ne: true }
        }
      },
      {
        $lookup: {
          from: INTERACTION_COLLECTION_NAME,
          let: { jobId: '$jobId', userId: '$userId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$jobId', '$$jobId'] },
                    { $eq: ['$userId', userId] },
                    { $eq: ['$_destroy', false] }
                  ]
                }
              }
            }
          ],
          as: 'userInteraction'
        }
      },
      {
        $match: {
          userInteraction: { $size: 0 } // Jobs user hasn't interacted with
        }
      },
      {
        $group: {
          _id: '$jobId',
          jobTitle: { $first: '$jobTitle' },
          companyName: { $first: '$companyName' },
          totalWeight: { $sum: '$weight' },
          interactionCount: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' }
        }
      },
      {
        $addFields: {
          cfScore: {
            $divide: [
              '$totalWeight',
              { $pow: [{ $size: '$uniqueUsers' }, 0.5] }
            ]
          }
        }
      },
      { $sort: { cfScore: -1 } },
      { $limit: limit }
    ]

    const recommendedJobs = await GET_DB().collection(INTERACTION_COLLECTION_NAME).aggregate(pipeline).toArray()

    return {
      jobs: recommendedJobs,
      similarUsersCount: similarUsers.length,
      reason: 'collaborative_filtering'
    }
  } catch (error) {
    throw new Error(error.message)
  }
}

const getStats = async (options = {}) => {
  try {
    const { startDate, endDate } = options

    const matchStage = { _destroy: { $ne: true } }

    if (startDate || endDate) {
      matchStage.createdAt = {}
      if (startDate) matchStage.createdAt.$gte = new Date(startDate)
      if (endDate) matchStage.createdAt.$lte = new Date(endDate)
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: {
            action: '$action',
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          count: { $sum: 1 },
          totalWeight: { $sum: '$weight' }
        }
      },
      {
        $group: {
          _id: '$_id.action',
          dailyStats: {
            $push: {
              date: '$_id.date',
              count: '$count',
              weight: '$totalWeight'
            }
          },
          totalCount: { $sum: '$count' },
          totalWeight: { $sum: '$totalWeight' }
        }
      }
    ]

    return await GET_DB().collection(INTERACTION_COLLECTION_NAME).aggregate(pipeline).toArray()
  } catch (error) {
    throw new Error(error.message)
  }
}

const countByAction = async () => {
  try {
    return await GET_DB().collection(INTERACTION_COLLECTION_NAME).aggregate([
      { $match: { _destroy: { $ne: true } } },
      { $group: { _id: '$action', count: { $sum: 1 } } }
    ]).toArray()
  } catch (error) {
    throw new Error(error.message)
  }
}

const getTopJobs = async (action, limit = 10) => {
  try {
    const pipeline = [
      { $match: { action: action, _destroy: { $ne: true } } },
      {
        $group: {
          _id: '$jobId',
          jobTitle: { $first: '$jobTitle' },
          companyName: { $first: '$companyName' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: limit }
    ]

    return await GET_DB().collection(INTERACTION_COLLECTION_NAME).aggregate(pipeline).toArray()
  } catch (error) {
    throw new Error(error.message)
  }
}

const getActiveUsersCount = async (days = 7) => {
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    return await GET_DB().collection(INTERACTION_COLLECTION_NAME).distinct('userId', {
      createdAt: { $gte: startDate },
      _destroy: { $ne: true }
    }).then(users => users.length)
  } catch (error) {
    throw new Error(error.message)
  }
}

export const interactionModel = {
  INTERACTION_COLLECTION_NAME,
  INTERACTION_TYPES,
  INTERACTION_WEIGHTS,
  RECOMMENDATION_METHODS,
  TIME_OF_DAY,
  DAY_OF_WEEK,

  // Helper functions
  calculateImplicitFeedbackScore,
  getEngagementLevel,
  inferUserIntent,

  // CRUD operations
  createNew,
  createMany,
  findByUserId,
  findByJobId,
  getUserJobInteractions,
  getUserEngagementScore,
  getJobPopularityScore,
  getUserUserSimilarity,
  getSimilarUsers,
  getRecommendedJobsFromCF,
  getStats,
  countByAction,
  getTopJobs,
  getActiveUsersCount
}