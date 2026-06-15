import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'

const CATEGORY_COLLECTION_NAME = 'community_categories'

const CATEGORY_COLLECTION_SCHEMA = Joi.object({
  name: Joi.string().required().trim().max(100),
  slug: Joi.string().allow(null, '').trim().lowercase().max(100),
  description: Joi.string().allow(null, '').max(500),
  type: Joi.string().valid('forum', 'event', 'group').default('forum'),
  order: Joi.number().integer().min(0).default(0),
  isActive: Joi.boolean().default(true),
  
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await CATEGORY_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
    stripUnknown: true
  })
}

const generateSlug = (name) => {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    
    if (!validData.slug) {
      validData.slug = generateSlug(validData.name)
    }

    const slugExists = await GET_DB().collection(CATEGORY_COLLECTION_NAME).findOne({
      slug: validData.slug,
      type: validData.type,
      _destroy: { $ne: true }
    })

    if (slugExists) {
      validData.slug = `${validData.slug}-${Date.now()}`
    }

    return await GET_DB().collection(CATEGORY_COLLECTION_NAME).insertOne(validData)
  } catch (error) {
    throw new Error(error.message)
  }
}

const findOneById = async (categoryId) => {
  try {
    return await GET_DB().collection(CATEGORY_COLLECTION_NAME).findOne({
      _id: new ObjectId(categoryId),
      _destroy: { $ne: true }
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const findAllByType = async (type = 'forum') => {
  try {
    return await GET_DB().collection(CATEGORY_COLLECTION_NAME)
      .find({
        type: type,
        isActive: true,
        _destroy: { $ne: true }
      })
      .sort({ order: 1, createdAt: -1 })
      .toArray()
  } catch (error) {
    throw new Error(error.message)
  }
}

export const communityCategoryModel = {
  CATEGORY_COLLECTION_NAME,
  CATEGORY_COLLECTION_SCHEMA,
  createNew,
  findOneById,
  findAllByType
}
