import Joi from 'joi'
import { GET_DB } from '~/config/mongodb'
import { ObjectId } from 'mongodb'

const ESCO_SKILL_COLLECTION_NAME = 'esco_skills'
const ESCO_SKILL_COLLECTION_SCHEMA = Joi.object({
  escoUri: Joi.string().required(),
  type: Joi.string().valid('skill', 'knowledge').default('skill'),
  titleEn: Joi.string().required(),
  descriptionEn: Joi.string().allow(''),

  // Vietnamese (translated)
  titleVi: Joi.string().allow(''),
  descriptionVi: Joi.string().allow(''),

  // For linking to occupations
  isEssentialFor: Joi.array().items(Joi.string()).default([]),
  isOptionalFor: Joi.array().items(Joi.string()).default([]),

  // Status
  translationStatus: Joi.string().valid('manual', 'llm', 'pending').default('pending'),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(Date.now)
})

const validateBeforeCreate = async (data) => {
  return await ESCO_SKILL_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
    stripUnknown: true
  })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const result = await GET_DB().collection(ESCO_SKILL_COLLECTION_NAME).insertOne(validData)
    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const createMany = async (dataArray) => {
  try {
    const validDataArray = await Promise.all(
      dataArray.map(data => validateBeforeCreate(data))
    )
    const result = await GET_DB().collection(ESCO_SKILL_COLLECTION_NAME).insertMany(validDataArray)
    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const findByUri = async (uri) => {
  try {
    return await GET_DB().collection(ESCO_SKILL_COLLECTION_NAME).findOne({
      escoUri: uri,
      _destroy: { $ne: true }
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const findByUris = async (uris) => {
  try {
    return await GET_DB().collection(ESCO_SKILL_COLLECTION_NAME)
      .find({ escoUri: { $in: uris } })
      .toArray()
  } catch (error) {
    throw new Error(error.message)
  }
}

const search = async (query, options = {}) => {
  try {
    const { lang = 'vi', limit = 20, offset = 0 } = options
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const searchRegex = new RegExp(escapedQuery, 'i')

    const searchQuery = {
      $or: [
        { titleEn: searchRegex },
        { titleVi: searchRegex }
      ]
    }

    const projection = lang === 'vi'
      ? { titleEn: 1, titleVi: 1, type: 1, escoUri: 1 }
      : { titleEn: 1, type: 1, escoUri: 1 }

    const [results, total] = await Promise.all([
      GET_DB().collection(ESCO_SKILL_COLLECTION_NAME)
        .find(searchQuery)
        .project(projection)
        .skip(offset)
        .limit(limit)
        .toArray(),
      GET_DB().collection(ESCO_SKILL_COLLECTION_NAME).countDocuments(searchQuery)
    ])

    return { results, total }
  } catch (error) {
    throw new Error(error.message)
  }
}

const getByOccupation = async (occupationUri, options = {}) => {
  try {
    const { essentialOnly = false, limit = 50 } = options

    let query = {
      $or: [
        { isEssentialFor: occupationUri },
        { isOptionalFor: occupationUri }
      ]
    }

    if (essentialOnly) {
      query = { isEssentialFor: occupationUri }
    }

    const [skills, total] = await Promise.all([
      GET_DB().collection(ESCO_SKILL_COLLECTION_NAME)
        .find(query)
        .limit(limit)
        .toArray(),
      GET_DB().collection(ESCO_SKILL_COLLECTION_NAME).countDocuments(query)
    ])

    // Separate essential and optional
    const essentialSkills = skills.filter(s => s.isEssentialFor?.includes(occupationUri))
    const optionalSkills = skills.filter(s => s.isOptionalFor?.includes(occupationUri))

    return {
      essentialSkills,
      optionalSkills,
      total,
      essentialCount: essentialSkills.length,
      optionalCount: optionalSkills.length
    }
  } catch (error) {
    throw new Error(error.message)
  }
}

const updateTranslation = async (uri, translationData) => {
  try {
    const result = await GET_DB().collection(ESCO_SKILL_COLLECTION_NAME).findOneAndUpdate(
      { escoUri: uri },
      {
        $set: {
          ...translationData,
          translationStatus: translationData.titleVi ? 'llm' : 'pending',
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

const upsertByUri = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const result = await GET_DB().collection(ESCO_SKILL_COLLECTION_NAME).findOneAndUpdate(
      { escoUri: data.escoUri },
      { $set: { ...validData, updatedAt: Date.now() } },
      { upsert: true, returnDocument: 'after' }
    )
    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const countAll = async () => {
  try {
    return await GET_DB().collection(ESCO_SKILL_COLLECTION_NAME).countDocuments({})
  } catch (error) {
    throw new Error(error.message)
  }
}

const createIndexes = async () => {
  try {
    const db = GET_DB()
    await db.collection(ESCO_SKILL_COLLECTION_NAME).createIndex({ escoUri: 1 }, { unique: true })
    await db.collection(ESCO_SKILL_COLLECTION_NAME).createIndex({ type: 1 })
    await db.collection(ESCO_SKILL_COLLECTION_NAME).createIndex({ isEssentialFor: 1 })
    await db.collection(ESCO_SKILL_COLLECTION_NAME).createIndex({ isOptionalFor: 1 })
  } catch (error) {
    // Ignore index errors - indexes may already exist
  }
}

export const escoSkillModel = {
  ESCO_SKILL_COLLECTION_NAME,
  createNew,
  createMany,
  findByUri,
  findByUris,
  search,
  getByOccupation,
  updateTranslation,
  upsertByUri,
  countAll,
  createIndexes
}
