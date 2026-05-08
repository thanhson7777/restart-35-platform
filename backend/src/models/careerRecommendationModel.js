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
  scoringMethod: Joi.string().valid('rule_based', 'llm_scored', 'hybrid'),
  generatedAt: Joi.date().timestamp('javascript').default(Date.now),
  expiresAt: Joi.date().timestamp('javascript'),
  status: Joi.string().valid('active', 'stale', 'generating').default('active'),
  version: Joi.number().integer().min(1).default(1),
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
      _destroy: false,
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
      _destroy: false
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
    const existingRecord = await findByUserId(userId)

    if (existingRecord) {
      return await updateByUserId(userId, {
        ...data,
        version: (existingRecord.version || 1) + 1
      })
    } else {
      const newRecord = {
        ...data,
        userId: userId,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      const result = await GET_DB().collection(CAREER_RECOMMENDATION_COLLECTION_NAME).insertOne(newRecord)
      return { ...newRecord, _id: result.insertedId }
    }
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
  cleanupExpired
}
