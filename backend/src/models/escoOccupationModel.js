import Joi from 'joi'
import { GET_DB } from '~/config/mongodb'
import { ObjectId } from 'mongodb'

const ESCO_OCCUPATION_COLLECTION_NAME = 'esco_occupations'
const ESCO_OCCUPATION_COLLECTION_SCHEMA = Joi.object({
  escoUri: Joi.string().required(),
  code: Joi.string().allow(''),
  iscoGroup: Joi.string().allow(''),
  broaderUri: Joi.string().allow(''),

  // English (source)
  titleEn: Joi.string().required(),
  descriptionEn: Joi.string().allow(''),
  alternativeLabelsEn: Joi.array().items(Joi.string()).default([]),

  // Vietnamese (translated)
  titleVi: Joi.string().allow(''),
  descriptionVi: Joi.string().allow(''),
  alternativeLabelsVi: Joi.array().items(Joi.string()).default([]),

  // Skills references (URIs)
  essentialSkills: Joi.array().items(Joi.string()).default([]),
  optionalSkills: Joi.array().items(Joi.string()).default([]),

  // Metadata
  essentialSkillsCount: Joi.number().integer().default(0),
  optionalSkillsCount: Joi.number().integer().default(0),

  // Status
  translationStatus: Joi.string().valid('manual', 'llm', 'pending').default('pending'),
  popularity: Joi.number().integer().default(0),

  createdAt: Joi.date().timestamp('javascript').default(Date.now()),
  updatedAt: Joi.date().timestamp('javascript').default(Date.now())
})

const validateBeforeCreate = async (data) => {
  return await ESCO_OCCUPATION_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
    stripUnknown: true
  })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const result = await GET_DB().collection(ESCO_OCCUPATION_COLLECTION_NAME).insertOne(validData)
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
    const result = await GET_DB().collection(ESCO_OCCUPATION_COLLECTION_NAME).insertMany(validDataArray)
    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const findByUri = async (uri) => {
  try {
    return await GET_DB().collection(ESCO_OCCUPATION_COLLECTION_NAME).findOne({
      escoUri: uri,
      _destroy: { $ne: true }
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const findById = async (id) => {
  try {
    const objectId = new ObjectId(id)
    return await GET_DB().collection(ESCO_OCCUPATION_COLLECTION_NAME).findOne({
      _id: objectId
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const search = async (query, options = {}) => {
  try {
    const { lang = 'vi', limit = 20, offset = 0 } = options
    const searchRegex = new RegExp(query, 'i')

    const searchQuery = {
      $or: [
        { titleEn: searchRegex },
        { titleVi: searchRegex },
        { code: searchRegex },
        { alternativeLabelsEn: searchRegex },
        { alternativeLabelsVi: searchRegex }
      ]
    }

    const projection = lang === 'vi'
      ? { titleEn: 1, titleVi: 1, code: 1, escoUri: 1, popularity: 1 }
      : { titleEn: 1, code: 1, escoUri: 1, popularity: 1 }

    const [results, total] = await Promise.all([
      GET_DB().collection(ESCO_OCCUPATION_COLLECTION_NAME)
        .find(searchQuery)
        .project(projection)
        .sort({ popularity: -1 })
        .skip(offset)
        .limit(limit)
        .toArray(),
      GET_DB().collection(ESCO_OCCUPATION_COLLECTION_NAME).countDocuments(searchQuery)
    ])

    return { results, total }
  } catch (error) {
    throw new Error(error.message)
  }
}

const getPopular = async (limit = 10) => {
  try {
    return await GET_DB().collection(ESCO_OCCUPATION_COLLECTION_NAME)
      .find({})
      .sort({ popularity: -1 })
      .limit(limit)
      .project({ titleEn: 1, titleVi: 1, code: 1, escoUri: 1, popularity: 1 })
      .toArray()
  } catch (error) {
    throw new Error(error.message)
  }
}

const update = async (uri, data) => {
  try {
    const updateData = {
      ...data,
      updatedAt: Date.now()
    }
    const result = await GET_DB().collection(ESCO_OCCUPATION_COLLECTION_NAME).findOneAndUpdate(
      { escoUri: uri },
      { $set: updateData },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const updateTranslation = async (uri, translationData) => {
  try {
    const result = await GET_DB().collection(ESCO_OCCUPATION_COLLECTION_NAME).findOneAndUpdate(
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

const incrementPopularity = async (uri) => {
  try {
    await GET_DB().collection(ESCO_OCCUPATION_COLLECTION_NAME).updateOne(
      { escoUri: uri },
      {
        $inc: { popularity: 1 },
        $set: { updatedAt: Date.now() }
      }
    )
  } catch (error) {
    throw new Error(error.message)
  }
}

const upsertByUri = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const result = await GET_DB().collection(ESCO_OCCUPATION_COLLECTION_NAME).findOneAndUpdate(
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
    return await GET_DB().collection(ESCO_OCCUPATION_COLLECTION_NAME).countDocuments({})
  } catch (error) {
    throw new Error(error.message)
  }
}

const createIndexes = async () => {
  try {
    const db = GET_DB()
    await db.collection(ESCO_OCCUPATION_COLLECTION_NAME).createIndex({ escoUri: 1 }, { unique: true })
    await db.collection(ESCO_OCCUPATION_COLLECTION_NAME).createIndex({ code: 1 })
    await db.collection(ESCO_OCCUPATION_COLLECTION_NAME).createIndex({ popularity: -1 })
    await db.collection(ESCO_OCCUPATION_COLLECTION_NAME).createIndex({ translationStatus: 1 })
  } catch (error) {
    // Ignore index errors - indexes may already exist
  }
}

export const escoOccupationModel = {
  ESCO_OCCUPATION_COLLECTION_NAME,
  createNew,
  createMany,
  findByUri,
  findById,
  search,
  getPopular,
  update,
  updateTranslation,
  incrementPopularity,
  upsertByUri,
  countAll,
  createIndexes
}
