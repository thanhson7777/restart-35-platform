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

  address: Joi.string().optional().allow(null, ''),

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
      _destroy: false
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
    return await GET_DB().collection(USER_COLLECTION_NAME).countDocuments({ role: 'customer' })
  } catch (error) { throw error }
}

export const userModel = {
  USER_COLLECTION_NAME,
  USER_COLLECTION_SCHEMA,
  createNew,
  findOneById,
  findOneByEmail,
  update,
  countUsersByRole,
  getUsers,
  updateUserStatus,
  countTotalUsers
}

