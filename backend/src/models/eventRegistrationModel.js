import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'

const EVENT_REGISTRATION_COLLECTION_NAME = 'event_registrations'
const EVENT_REGISTRATION_COLLECTION_SCHEMA = Joi.object({
  eventId: Joi.string().required(),
  userId: Joi.string().required(),
  createdAt: Joi.date().timestamp('javascript').default(() => Date.now()),
  updatedAt: Joi.date().timestamp('javascript').default(() => Date.now())
})

const validateBeforeCreate = async (data) => {
  return await EVENT_REGISTRATION_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const insertData = {
      ...validData,
      eventId: new ObjectId(validData.eventId),
      userId: new ObjectId(validData.userId)
    }
    const created = await GET_DB().collection(EVENT_REGISTRATION_COLLECTION_NAME).insertOne(insertData)
    return created
  } catch (error) {
    throw new Error(error)
  }
}

const findOne = async (eventId, userId) => {
  try {
    const result = await GET_DB().collection(EVENT_REGISTRATION_COLLECTION_NAME).findOne({
      eventId: new ObjectId(eventId),
      userId: new ObjectId(userId)
    })
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const countDocuments = async (query) => {
  try {
    return await GET_DB().collection(EVENT_REGISTRATION_COLLECTION_NAME).countDocuments(query)
  } catch (error) {
    throw new Error(error)
  }
}

const findByEventId = async (eventId, skip, limit) => {
  try {
    const result = await GET_DB().collection(EVENT_REGISTRATION_COLLECTION_NAME).aggregate([
      { $match: { eventId: new ObjectId(eventId) } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          'user.password': 0,
          'user.createdAt': 0,
          'user.updatedAt': 0
        }
      }
    ]).toArray()
    return result
  } catch (error) {
    throw new Error(error)
  }
}

export const eventRegistrationModel = {
  EVENT_REGISTRATION_COLLECTION_NAME,
  EVENT_REGISTRATION_COLLECTION_SCHEMA,
  createNew,
  findOne,
  countDocuments,
  findByEventId
}
