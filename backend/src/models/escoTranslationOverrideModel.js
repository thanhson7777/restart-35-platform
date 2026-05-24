import Joi from 'joi'
import { GET_DB } from '~/config/mongodb'
import { ObjectId } from 'mongodb'

const ESCO_TRANSLATION_OVERRIDE_COLLECTION_NAME = 'esco_translation_overrides'
const ESCO_TRANSLATION_OVERRIDE_COLLECTION_SCHEMA = Joi.object({
  escoUri: Joi.string().required(),
  field: Joi.string().valid('title', 'description', 'alternativeLabel', 'skill').required(),
  language: Joi.string().valid('vi').default('vi'),

  originalText: Joi.string().required(),
  overrideText: Joi.string().required(),

  source: Joi.string().valid('manual', 'llm').default('llm'),
  llmModel: Joi.string().allow(''),
  reviewedBy: Joi.string().allow(''),
  isApproved: Joi.boolean().default(false),

  createdAt: Joi.date().timestamp('javascript').default(Date.now()),
  updatedAt: Joi.date().timestamp('javascript').default(Date.now())
})

const validateBeforeCreate = async (data) => {
  return await ESCO_TRANSLATION_OVERRIDE_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
    stripUnknown: true
  })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const result = await GET_DB().collection(ESCO_TRANSLATION_OVERRIDE_COLLECTION_NAME).insertOne(validData)
    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const findOne = async (query) => {
  try {
    return await GET_DB().collection(ESCO_TRANSLATION_OVERRIDE_COLLECTION_NAME).findOne({
      ...query,
      isApproved: true
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const findByOriginalText = async (originalText, language = 'vi') => {
  try {
    return await GET_DB().collection(ESCO_TRANSLATION_OVERRIDE_COLLECTION_NAME).findOne({
      originalText,
      language,
      isApproved: true
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const findByUri = async (escoUri) => {
  try {
    return await GET_DB().collection(ESCO_TRANSLATION_OVERRIDE_COLLECTION_NAME)
      .find({ escoUri, isApproved: true })
      .toArray()
  } catch (error) {
    throw new Error(error.message)
  }
}

const update = async (id, data) => {
  try {
    const objectId = new ObjectId(id)
    const result = await GET_DB().collection(ESCO_TRANSLATION_OVERRIDE_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          ...data,
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

const approve = async (id, reviewedBy) => {
  try {
    const objectId = new ObjectId(id)
    const result = await GET_DB().collection(ESCO_TRANSLATION_OVERRIDE_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          isApproved: true,
          reviewedBy,
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

const upsertByUriAndField = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const query = {
      escoUri: data.escoUri,
      field: data.field,
      language: data.language,
      originalText: data.originalText
    }

    const result = await GET_DB().collection(ESCO_TRANSLATION_OVERRIDE_COLLECTION_NAME).findOneAndUpdate(
      query,
      {
        $set: {
          ...validData,
          updatedAt: Date.now()
        }
      },
      { upsert: true, returnDocument: 'after' }
    )
    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const getPending = async (limit = 50) => {
  try {
    return await GET_DB().collection(ESCO_TRANSLATION_OVERRIDE_COLLECTION_NAME)
      .find({ isApproved: false })
      .limit(limit)
      .toArray()
  } catch (error) {
    throw new Error(error.message)
  }
}

const countByStatus = async () => {
  try {
    const [pending, approved] = await Promise.all([
      GET_DB().collection(ESCO_TRANSLATION_OVERRIDE_COLLECTION_NAME).countDocuments({ isApproved: false }),
      GET_DB().collection(ESCO_TRANSLATION_OVERRIDE_COLLECTION_NAME).countDocuments({ isApproved: true })
    ])
    return { pending, approved, total: pending + approved }
  } catch (error) {
    throw new Error(error.message)
  }
}

const createIndexes = async () => {
  try {
    const db = GET_DB()
    await Promise.all([
      db.collection(ESCO_TRANSLATION_OVERRIDE_COLLECTION_NAME).createIndex(
        { escoUri: 1, field: 1, language: 1 },
        { unique: true }
      ),
      db.collection(ESCO_TRANSLATION_OVERRIDE_COLLECTION_NAME).createIndex({ isApproved: 1 }),
      db.collection(ESCO_TRANSLATION_OVERRIDE_COLLECTION_NAME).createIndex({ originalText: 1, language: 1 })
    ])
  } catch (error) {
    throw new Error(error.message)
  }
}

export const escoTranslationOverrideModel = {
  ESCO_TRANSLATION_OVERRIDE_COLLECTION_NAME,
  createNew,
  findOne,
  findByOriginalText,
  findByUri,
  update,
  approve,
  upsertByUriAndField,
  getPending,
  countByStatus,
  createIndexes
}
