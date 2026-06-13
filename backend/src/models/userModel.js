import Joi from 'joi'
import { GET_DB } from '~/config/mongodb'
import { ObjectId } from 'mongodb'
import { EMAIL_RULE, EMAIL_RULE_MESSAGE, PHONE_RULE, PHONE_RULE_MESSAGE } from '~/utils/validator'
import { USER_ROLES } from '~/utils/constants'

const INVALID_UPDATE_FIELD = ['_id', 'email', 'username', 'createdAt']

const USER_COLLECTION_NAME = 'users'
const USER_COLLECTION_SCHEMA = Joi.object({
  email: Joi.string().required().pattern(EMAIL_RULE).message(EMAIL_RULE_MESSAGE),
  password: Joi.string().required(),
  username: Joi.string().required().min(3).max(50).trim().strict(),
  displayName: Joi.string().required().min(3).max(50).trim().strict(),
  phone: Joi.string().required().pattern(PHONE_RULE).message(PHONE_RULE_MESSAGE),
  avatar: Joi.string().default(null),
  role: Joi.string().valid(...Object.values(USER_ROLES)).default(USER_ROLES.WORKER),
  isActive: Joi.boolean().default(false),
  verifyToken: Joi.string(),
  resetPasswordToken: Joi.string().default(null),
  resetPasswordExpire: Joi.date().timestamp('javascript').default(null),

  // BasicInfo fields
  age: Joi.number().integer().min(35).max(65),
  gender: Joi.string().valid('male', 'female', 'other'),
  province: Joi.string().allow(''),
  district: Joi.string().allow(''),
  education: Joi.string().allow(''),
  maritalStatus: Joi.string().valid('single', 'married', 'divorced', 'widowed'),

  address: Joi.string().optional().allow(null, ''),
  organizationId: Joi.string().pattern(/^[a-f\d]{24}$/i).allow(null, ''),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await USER_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false, stripUnknown: true })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    // Check for duplicate email before insert
    const existing = await GET_DB().collection(USER_COLLECTION_NAME).findOne({
      email: validData.email,
      _destroy: { $ne: true }
    })
    if (existing) {
      throw new Error('Email đã được sử dụng')
    }
    const createdUser = await GET_DB().collection(USER_COLLECTION_NAME).insertOne(validData)
    return createdUser
  } catch (error) { throw error }
}

const findOneById = async (id) => {
  try {
    const result = await GET_DB().collection(USER_COLLECTION_NAME).findOne({ _id: new ObjectId(String(id)) })
    return result
  } catch (error) { throw error }
}

const findOneByEmail = async (emailValue) => {
  try {
    const result = await GET_DB().collection(USER_COLLECTION_NAME).findOne({
      email: emailValue,
      _destroy: { $ne: true }
    })
    return result
  } catch (error) { throw error }
}

const findOneByResetToken = async (resetToken) => {
  try {
    const result = await GET_DB().collection(USER_COLLECTION_NAME).findOne({
      resetPasswordToken: resetToken,
      resetPasswordExpire: { $gt: Date.now() },
      _destroy: { $ne: true }
    })
    return result
  } catch (error) { throw error }
}

const update = async (userId, updateData) => {
  try {
    Object.keys(updateData).forEach(fieldName => {
      if (INVALID_UPDATE_FIELD.includes(fieldName)) {
        delete updateData[fieldName]
      }
    })

    updateData.updatedAt = Date.now()

    const result = await GET_DB().collection(USER_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(String(userId)) },
      { $set: updateData },
      {
        returnDocument: 'after',
        projection: { password: 0 }
      }
    )

    return result
  } catch (error) { throw error }
}

const countUsersByRole = async (roleType) => {
  try {
    const result = await GET_DB().collection(USER_COLLECTION_NAME).countDocuments({ role: roleType })
    return result
  } catch (error) {
    throw error
  }
}

const getUsers = async (matchCondition, skip, limit) => {
  try {
    const db = await GET_DB()
    const [users, totalUsers] = await Promise.all([
      db.collection(USER_COLLECTION_NAME)
        .find(matchCondition, { projection: { password: 0 } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),

      db.collection(USER_COLLECTION_NAME).countDocuments(matchCondition)
    ])

    return { users, totalUsers }
  } catch (error) {
    throw error
  }
}

const updateUserStatus = async (userId, dataToUpdate) => {
  try {
    const db = await GET_DB()
    dataToUpdate.updatedAt = Date.now()
    const result = await db.collection(USER_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(String(userId)) },
      { $set: dataToUpdate },
      {
        returnDocument: 'after',
        projection: { password: 0 }
      }
    )

    return result.value || result
  } catch (error) {
    throw error
  }
}


const countTotalUsers = async () => {
  try {
    // Count all users except admin role
    return await GET_DB().collection(USER_COLLECTION_NAME).countDocuments({ role: { $ne: 'admin' } })
  } catch (error) { throw error }
}

const getUserStats = async () => {
  try {
    const db = await GET_DB()
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const roles = ['worker', 'enterprise', 'trainer', 'ngo', 'admin']
    const stats = {}

    for (const role of roles) {
      const [total, active, newThisMonth] = await Promise.all([
        db.collection(USER_COLLECTION_NAME).countDocuments({ role }),
        db.collection(USER_COLLECTION_NAME).countDocuments({ role, isActive: true }),
        db.collection(USER_COLLECTION_NAME).countDocuments({
          role,
          createdAt: { $gte: startOfMonth }
        })
      ])

      stats[role] = {
        total,
        active,
        inactive: total - active,
        newThisMonth
      }
    }

    // Calculate "all" stats
    const [allTotal, allActive, allNewThisMonth] = await Promise.all([
      db.collection(USER_COLLECTION_NAME).countDocuments({}),
      db.collection(USER_COLLECTION_NAME).countDocuments({ isActive: true }),
      db.collection(USER_COLLECTION_NAME).countDocuments({
        createdAt: { $gte: startOfMonth }
      })
    ])

    stats.all = {
      total: allTotal,
      active: allActive,
      inactive: allTotal - allActive,
      newThisMonth: allNewThisMonth
    }

    return stats
  } catch (error) {
    throw error
  }
}

export const userModel = {
  USER_COLLECTION_NAME,
  USER_COLLECTION_SCHEMA,
  createNew,
  findOneById,
  findOneByEmail,
  findOneByResetToken,
  update,
  countUsersByRole,
  getUsers,
  updateUserStatus,
  countTotalUsers,
  getUserStats
}

