import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'

const COLLECTION_NAME = 'job_categories'

const COLLECTION_SCHEMA = Joi.object({
  name: Joi.string().required().trim().max(100),
  slug: Joi.string().allow(null, '').trim().lowercase().max(100),
  description: Joi.string().allow(null, '').max(500),
  icon: Joi.string().allow(null, '').max(255),
  order: Joi.number().integer().min(0).default(0),
  jobCount: Joi.number().integer().min(0).default(0),
  isActive: Joi.boolean().default(true),
  
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await COLLECTION_SCHEMA.validateAsync(data, {
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

    const slugExists = await GET_DB().collection(COLLECTION_NAME).findOne({
      slug: validData.slug,
      _destroy: { $ne: true }
    })

    if (slugExists) {
      validData.slug = `${validData.slug}-${Date.now()}`
    }

    return await GET_DB().collection(COLLECTION_NAME).insertOne(validData)
  } catch (error) {
    throw new Error(error.message)
  }
}

const findOneById = async (categoryId) => {
  try {
    return await GET_DB().collection(COLLECTION_NAME).findOne({
      _id: new ObjectId(categoryId),
      _destroy: { $ne: true }
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const findAll = async (includeInactive = false) => {
  try {
    const query = { _destroy: { $ne: true } }
    if (!includeInactive) {
      query.isActive = true
    }
    return await GET_DB().collection(COLLECTION_NAME)
      .find(query)
      .sort({ order: 1, createdAt: -1 })
      .toArray()
  } catch (error) {
    throw new Error(error.message)
  }
}

const update = async (id, data) => {
  try {
    const updateData = {
      ...data,
      updatedAt: Date.now()
    }
    
    // Validate string fields if they exist
    if (updateData.name && !updateData.slug) {
      updateData.slug = generateSlug(updateData.name)
    }

    const result = await GET_DB().collection(COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const updateJobCount = async (categoryId, incrementAmount = 1) => {
  try {
    if (!categoryId) return null
    return await GET_DB().collection(COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(categoryId) },
      { $inc: { jobCount: incrementAmount }, $set: { updatedAt: Date.now() } },
      { returnDocument: 'after' }
    )
  } catch (error) {
    throw new Error(error.message)
  }
}

const deleteItem = async (id) => {
  try {
    return await GET_DB().collection(COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { _destroy: true, updatedAt: Date.now() } },
      { returnDocument: 'after' }
    )
  } catch (error) {
    throw new Error(error.message)
  }
}

export const jobCategoryModel = {
  COLLECTION_NAME,
  COLLECTION_SCHEMA,
  createNew,
  findOneById,
  findAll,
  update,
  updateJobCount,
  deleteItem
}
