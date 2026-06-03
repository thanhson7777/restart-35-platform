import Joi from 'joi'
import { GET_DB } from '~/config/mongodb'
import { ObjectId } from 'mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validator'
import { ORGANIZATION_TYPES } from '~/utils/constants'

const ORGANIZATION_COLLECTION_NAME = 'organizations'
const ORGANIZATION_COLLECTION_SCHEMA = Joi.object({
  name: Joi.string().required().min(3).max(255).trim().strict()
    .messages({
      'string.min': 'Tên tổ chức phải có ít nhất 3 ký tự',
      'string.max': 'Tên tổ chức không được quá 255 ký tự',
      'any.required': 'Tên tổ chức là bắt buộc'
    }),
  type: Joi.string().required().valid(...Object.values(ORGANIZATION_TYPES))
    .messages({
      'any.only': 'Loại tổ chức không hợp lệ',
      'any.required': 'Loại tổ chức là bắt buộc'
    }),
  industry: Joi.string().max(100).trim().allow('', null),
  address: Joi.string().max(500).trim().allow('', null),
  contactEmail: Joi.string().email().max(255).trim().lowercase().allow('', null)
    .messages({ 'string.email': 'Email liên hệ không hợp lệ' }),
  contactPhone: Joi.string().max(20).trim().allow('', null),
  quota: Joi.number().integer().min(0).default(0),
  logo: Joi.string().allow('', null),
  taxCode: Joi.string().max(50).trim().allow('', null),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await ORGANIZATION_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false, stripUnknown: true })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const result = await GET_DB().collection(ORGANIZATION_COLLECTION_NAME).insertOne(validData)
    return result
  } catch (error) {
    throw error
  }
}

const findOneById = async (id) => {
  try {
    const result = await GET_DB().collection(ORGANIZATION_COLLECTION_NAME).findOne({
      _id: new ObjectId(String(id)),
      _destroy: { $ne: true }
    })
    return result
  } catch (error) {
    throw error
  }
}

const findByPaginate = async (matchCondition, skip, limit) => {
  try {
    const db = await GET_DB()
    const [organizations, totalOrganizations] = await Promise.all([
      db.collection(ORGANIZATION_COLLECTION_NAME)
        .find(matchCondition, { projection: { _destroy: 0 } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection(ORGANIZATION_COLLECTION_NAME).countDocuments(matchCondition)
    ])
    return { organizations, totalOrganizations }
  } catch (error) {
    throw error
  }
}

const update = async (id, updateData) => {
  try {
    const result = await GET_DB().collection(ORGANIZATION_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(String(id)), _destroy: { $ne: true } },
      { $set: { ...updateData, updatedAt: Date.now() } },
      { returnDocument: 'after', projection: { _destroy: 0 } }
    )
    return result
  } catch (error) {
    throw error
  }
}

const softDelete = async (id) => {
  try {
    const result = await GET_DB().collection(ORGANIZATION_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(String(id)), _destroy: { $ne: true } },
      { $set: { _destroy: true, updatedAt: Date.now() } },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) {
    throw error
  }
}

const countMembers = async (organizationId) => {
  try {
    const db = await GET_DB()
    const total = await db.collection('users').countDocuments({
      organizationId: new ObjectId(String(organizationId)),
      _destroy: { $ne: true }
    })
    return total
  } catch (error) {
    throw error
  }
}

export const organizationModel = {
  ORGANIZATION_COLLECTION_NAME,
  ORGANIZATION_COLLECTION_SCHEMA,
  validateBeforeCreate,
  createNew,
  findOneById,
  findByPaginate,
  update,
  softDelete,
  countMembers
}
