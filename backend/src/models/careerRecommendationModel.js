import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'

const CAREER_RECOMMENDATION_COLLECTION_NAME = 'career_recommendations'
const CAREER_RECOMMENDATION_COLLECTION_SCHEMA = Joi.object({
  userId: Joi.string().required(),
  profileSnapshot: Joi.object({
    age: Joi.number().integer().min(35).max(65),
    currentRole: Joi.string().allow(''),
    currentIndustry: Joi.string().allow(''),
    experiences: Joi.array().items(Joi.object({
      role: Joi.string().allow(''),
      industry: Joi.string().allow(''),
      years: Joi.number().integer().min(0),
      skills: Joi.array().items(Joi.string())
    })),
    skills: Joi.array().items(Joi.string()),
    barriers: Joi.object({
      health: Joi.boolean(),
      family: Joi.boolean(),
      techGap: Joi.boolean(),
      location: Joi.boolean(),
      other: Joi.boolean(),
      otherDescription: Joi.string().allow('')
    }),
    targetSalary: Joi.number().integer().min(0)
  }),
  careerPath: Joi.object({
    management_track: Joi.array(),
    age_transition: Joi.array(),
    skill_upgrades: Joi.array(),
    user_profile: Joi.object()
  }),
  careerTransitions: Joi.array().items(Joi.object({
    from: Joi.string(),
    to: Joi.string(),
    description: Joi.string(),
    score: Joi.number(),
    barriers: Joi.array(),
    recommendations: Joi.array()
  })),
  // RAG-based recommendations (from AI Service with RAG)
  ragRecommendations: Joi.object({
    intro_message: Joi.string().allow('').allow(null),
    best_fits: Joi.array().items(Joi.object({
      job_title: Joi.string().allow(''),
      match_score: Joi.number().min(0).max(1),
      salary_range: Joi.string().allow(''),
      learning_path: Joi.array().items(Joi.string()),
      timeline: Joi.string().allow(''),
      sources: Joi.array().items(Joi.string())
    })),
    income_boost: Joi.array().items(Joi.object()),
    progression: Joi.array().items(Joi.object()),
    salary_context: Joi.string().allow('').allow(null),
    trends_context: Joi.string().allow('').allow(null),
    sources: Joi.array().items(Joi.string())
  }).allow(null),
  // RAG metadata
  ragSources: Joi.array().items(Joi.string()).default([]),
  ragGeneratedAt: Joi.date().timestamp('javascript').allow(null),
  ragRefreshCount: Joi.number().integer().min(0).default(0),
  scoringMethod: Joi.string().valid('rule_based', 'llm_scored', 'hybrid', 'rag').default('rule_based'),
  generatedAt: Joi.date().timestamp('javascript').default(Date.now),
  expiresAt: Joi.date().timestamp('javascript'),
  status: Joi.string().valid('active', 'stale', 'generating').default('active'),
  version: Joi.number().integer().min(1).default(1),
  profileHash: Joi.string().allow(null).default(null),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await CAREER_RECOMMENDATION_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
    stripUnknown: true
  })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    return await GET_DB().collection(CAREER_RECOMMENDATION_COLLECTION_NAME).insertOne(validData)
  } catch (error) {
    throw new Error(error.message)
  }
}

const findByUserId = async (userId) => {
  try {
    return await GET_DB().collection(CAREER_RECOMMENDATION_COLLECTION_NAME).findOne({
      userId: userId,
      status: 'active',
      _destroy: { $ne: true },
      expiresAt: { $gt: new Date() }
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const findOneById = async (recommendationId) => {
  try {
    const objectId = new ObjectId(recommendationId)
    return await GET_DB().collection(CAREER_RECOMMENDATION_COLLECTION_NAME).findOne({
      _id: objectId,
      _destroy: { $ne: true }
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const updateByUserId = async (userId, data) => {
  try {
    const updateData = {
      ...data,
      updatedAt: Date.now()
    }

    const result = await GET_DB().collection(CAREER_RECOMMENDATION_COLLECTION_NAME).findOneAndUpdate(
      { userId: userId },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const markAsStale = async (userId) => {
  try {
    const result = await GET_DB().collection(CAREER_RECOMMENDATION_COLLECTION_NAME).updateOne(
      { userId: userId },
      {
        $set: {
          status: 'stale',
          updatedAt: Date.now()
        }
      }
    )
    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const upsertByUserId = async (userId, data) => {
  try {
    // Sử dụng native upsert để tránh race condition
    const updateData = {
      ...data,
      userId: userId,
      updatedAt: Date.now()
    }

    const result = await GET_DB().collection(CAREER_RECOMMENDATION_COLLECTION_NAME).findOneAndUpdate(
      { userId: userId },
      {
        $set: updateData,
        $inc: { version: 1 },
        $setOnInsert: { createdAt: Date.now() }
      },
      {
        returnDocument: 'after',
        upsert: true
      }
    )
    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const updateStatus = async (userId, status) => {
  try {
    const result = await GET_DB().collection(CAREER_RECOMMENDATION_COLLECTION_NAME).findOneAndUpdate(
      { userId: userId },
      {
        $set: {
          status: status,
          updatedAt: Date.now()
        }
      },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const softDeleteByUserId = async (userId) => {
  try {
    const result = await GET_DB().collection(CAREER_RECOMMENDATION_COLLECTION_NAME).findOneAndUpdate(
      { userId: userId },
      {
        $set: {
          _destroy: true,
          status: 'stale',
          updatedAt: Date.now()
        }
      },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============================================================================
// RAG-specific Operations
// ============================================================================

/**
 * Update RAG recommendations for a user
 * @param {string} userId - User ID
 * @param {Object} ragData - RAG recommendation data
 * @returns {Promise<Object>} Updated document
 */
const updateRAGRecommendations = async (userId, ragData) => {
  try {
    const result = await GET_DB().collection(CAREER_RECOMMENDATION_COLLECTION_NAME).findOneAndUpdate(
      { userId: userId },
      {
        $set: {
          ragRecommendations: ragData,
          ragSources: ragData.sources || [],
          ragGeneratedAt: new Date(),
          ragRefreshCount: 1,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          status: 'active',
          updatedAt: Date.now()
        }
      },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

/**
 * Increment RAG refresh count
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Updated document
 */
const incrementRAGRefreshCount = async (userId) => {
  try {
    const result = await GET_DB().collection(CAREER_RECOMMENDATION_COLLECTION_NAME).findOneAndUpdate(
      { userId: userId },
      {
        $inc: { ragRefreshCount: 1 },
        $set: {
          ragGeneratedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          updatedAt: Date.now()
        }
      },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

/**
 * Get RAG recommendations only (for caching)
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} RAG recommendations
 */
const getRAGRecommendationsByUserId = async (userId) => {
  try {
    const doc = await GET_DB().collection(CAREER_RECOMMENDATION_COLLECTION_NAME).findOne(
      {
        userId: userId,
        _destroy: { $ne: true },
        status: 'active'
      },
      {
        projection: {
          ragRecommendations: 1,
          ragSources: 1,
          ragGeneratedAt: 1,
          ragRefreshCount: 1,
          expiresAt: 1,
          status: 1,
          profileHash: 1
        }
      }
    )
    return doc
  } catch (error) {
    throw new Error(error.message)
  }
}

const cleanupExpired = async () => {
  try {
    const result = await GET_DB().collection(CAREER_RECOMMENDATION_COLLECTION_NAME).deleteMany({
      expiresAt: { $lt: new Date() },
      _destroy: true
    })
    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

export const careerRecommendationModel = {
  CAREER_RECOMMENDATION_COLLECTION_NAME,
  createNew,
  findByUserId,
  findOneById,
  updateByUserId,
  markAsStale,
  upsertByUserId,
  updateStatus,
  softDeleteByUserId,
  cleanupExpired,
  // RAG-specific operations
  updateRAGRecommendations,
  incrementRAGRefreshCount,
  getRAGRecommendationsByUserId
}
