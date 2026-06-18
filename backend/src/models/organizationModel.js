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
  
  // Quota & Service Package Fields
  currentPackageId: Joi.string().allow('', null),
  subscriptionStartDate: Joi.date().timestamp('javascript').allow(null),
  subscriptionEndDate: Joi.date().timestamp('javascript').allow(null),
  monthlyJobQuota: Joi.number().integer().min(0).default(0),
  currentMonthUsedJobQuota: Joi.number().integer().min(0).default(0),
  quotaMonth: Joi.string().pattern(/^\d{4}-\d{2}$/).allow('', null),
  
  // Legacy quota field (kept for backward compatibility, optionally remove later)
  quota: Joi.number().integer().min(0).default(0),
  logo: Joi.string().allow('', null),
  taxCode: Joi.string().max(50).trim().allow('', null),
  
  // Các trường bổ sung cho Enterprise, Trainer, NGO
  trainerType: Joi.string().valid('organization', 'individual').allow('', null),
  identityNumber: Joi.string().max(50).trim().allow('', null),
  size: Joi.string().allow('', null),
  focusAreas: Joi.array().items(Joi.string()).default([]),
  operatingRegions: Joi.array().items(Joi.string()).default([]),
  trainingCategories: Joi.array().items(Joi.string()).default([]),

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

const resetAndIncrementQuota = async (organizationId, newMonth) => {
  try {
    const result = await GET_DB().collection(ORGANIZATION_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(String(organizationId)), _destroy: { $ne: true } },
      { 
        $set: { 
          currentMonthUsedJobQuota: 1, 
          quotaMonth: newMonth,
          updatedAt: Date.now() 
        } 
      },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) {
    throw error
  }
}

const incrementQuotaUsage = async (organizationId) => {
  try {
    const result = await GET_DB().collection(ORGANIZATION_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(String(organizationId)), _destroy: { $ne: true } },
      { 
        $inc: { currentMonthUsedJobQuota: 1 },
        $set: { updatedAt: Date.now() } 
      },
      { returnDocument: 'after' }
    )
    return result
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
  countMembers,
  resetAndIncrementQuota,
  incrementQuotaUsage
}
