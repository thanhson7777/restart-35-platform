import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'

const NOTIFICATION_COLLECTION_NAME = 'notifications'

const NOTIFICATION_COLLECTION_SCHEMA = Joi.object({
  recipientId: Joi.string().required().custom((value, helpers) => {
    if (!ObjectId.isValid(value)) return helpers.message('Invalid ObjectId for recipientId')
    return value
  }),
  senderId: Joi.string().allow(null, '').custom((value, helpers) => {
    if (value && !ObjectId.isValid(value)) return helpers.message('Invalid ObjectId for senderId')
    return value
  }),
  type: Joi.string().required().trim(),
  entityType: Joi.string().allow(null, '').trim(),
  entityId: Joi.string().allow(null, '').custom((value, helpers) => {
    if (value && !ObjectId.isValid(value)) return helpers.message('Invalid ObjectId for entityId')
    return value
  }),
  title: Joi.string().required().trim().max(255),
  message: Joi.string().required().trim(),
  link: Joi.string().allow(null, '').trim(),
  isRead: Joi.boolean().default(false),
  
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(Date.now),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await NOTIFICATION_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
    stripUnknown: true
  })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    
    // Transform string to ObjectId
    validData.recipientId = new ObjectId(validData.recipientId)
    if (validData.senderId) validData.senderId = new ObjectId(validData.senderId)
    if (validData.entityId) validData.entityId = new ObjectId(validData.entityId)

    const createdResult = await GET_DB().collection(NOTIFICATION_COLLECTION_NAME).insertOne(validData)
    return await findOneById(createdResult.insertedId.toString())
  } catch (error) {
    throw new Error(error.message)
  }
}

const findOneById = async (id) => {
  try {
    return await GET_DB().collection(NOTIFICATION_COLLECTION_NAME).findOne({
      _id: new ObjectId(id),
      _destroy: { $ne: true }
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const findByUserId = async (userId, page = 1, limit = 20) => {
  try {
    const query = {
      recipientId: new ObjectId(userId),
      _destroy: { $ne: true }
    }
    
    const skip = (page - 1) * limit
    
    const [notifications, total] = await Promise.all([
      GET_DB().collection(NOTIFICATION_COLLECTION_NAME)
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      GET_DB().collection(NOTIFICATION_COLLECTION_NAME).countDocuments(query)
    ])
    
    const unreadCount = await GET_DB().collection(NOTIFICATION_COLLECTION_NAME).countDocuments({
      ...query,
      isRead: false
    })

    return {
      notifications,
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  } catch (error) {
    throw new Error(error.message)
  }
}

const markAsRead = async (id, userId) => {
  try {
    const result = await GET_DB().collection(NOTIFICATION_COLLECTION_NAME).findOneAndUpdate(
      { 
        _id: new ObjectId(id), 
        recipientId: new ObjectId(userId),
        _destroy: { $ne: true } 
      },
      { 
        $set: { 
          isRead: true, 
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

const markAllAsRead = async (userId) => {
  try {
    const result = await GET_DB().collection(NOTIFICATION_COLLECTION_NAME).updateMany(
      { 
        recipientId: new ObjectId(userId),
        isRead: false,
        _destroy: { $ne: true } 
      },
      { 
        $set: { 
          isRead: true, 
          updatedAt: Date.now() 
        } 
      }
    )
    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

export const notificationModel = {
  NOTIFICATION_COLLECTION_NAME,
  NOTIFICATION_COLLECTION_SCHEMA,
  createNew,
  findOneById,
  findByUserId,
  markAsRead,
  markAllAsRead
}
