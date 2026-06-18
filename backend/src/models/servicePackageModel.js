import Joi from 'joi'
import { GET_DB } from '~/config/mongodb'
import { ObjectId } from 'mongodb'

const SERVICE_PACKAGE_COLLECTION_NAME = 'service_packages'
const SERVICE_PACKAGE_COLLECTION_SCHEMA = Joi.object({
  name: Joi.string().required().min(3).max(100).trim().strict(),
  description: Joi.string().max(1000).allow('', null),
  price: Joi.number().integer().min(0).required(),
  durationMonths: Joi.number().integer().min(1).max(120).required(),
  monthlyJobQuota: Joi.number().integer().min(1).max(10000).required(),
  isActive: Joi.boolean().default(true),
  createdAt: Joi.date().timestamp('javascript').default(Date.now()),
  updatedAt: Joi.date().timestamp('javascript').default(Date.now()),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await SERVICE_PACKAGE_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false, stripUnknown: true })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const result = await GET_DB().collection(SERVICE_PACKAGE_COLLECTION_NAME).insertOne(validData)
    return result
  } catch (error) {
    throw error
  }
}

const findOneById = async (id) => {
  try {
    const result = await GET_DB().collection(SERVICE_PACKAGE_COLLECTION_NAME).findOne({
      _id: new ObjectId(String(id)),
      _destroy: { $ne: true }
    })
    return result
  } catch (error) {
    throw error
  }
}

const findAll = async (includeInactive = false) => {
  try {
    const query = { _destroy: { $ne: true } }
    if (!includeInactive) {
      query.isActive = true
    }
    const result = await GET_DB().collection(SERVICE_PACKAGE_COLLECTION_NAME).find(query).sort({ price: 1 }).toArray()
    return result
  } catch (error) {
    throw error
  }
}

const update = async (id, updateData) => {
  try {
    const result = await GET_DB().collection(SERVICE_PACKAGE_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(String(id)), _destroy: { $ne: true } },
      { $set: { ...updateData, updatedAt: Date.now() } },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) {
    throw error
  }
}

const softDelete = async (id) => {
  try {
    const result = await GET_DB().collection(SERVICE_PACKAGE_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(String(id)), _destroy: { $ne: true } },
      { $set: { _destroy: true, updatedAt: Date.now() } },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) {
    throw error
  }
}

export const servicePackageModel = {
  SERVICE_PACKAGE_COLLECTION_NAME,
  SERVICE_PACKAGE_COLLECTION_SCHEMA,
  createNew,
  findOneById,
  findAll,
  update,
  softDelete
}
