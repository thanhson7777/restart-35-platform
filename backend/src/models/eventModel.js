import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'

const EVENT_COLLECTION_NAME = 'events'
const EVENT_COLLECTION_SCHEMA = Joi.object({
  title: Joi.string().required().trim().strict(),
  coverImage: Joi.string().default('https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop'),
  eventDate: Joi.date().timestamp('javascript').required(),
  location: Joi.string().required().trim().strict(),
  description: Joi.string().required().trim().strict(),
  organizerId: Joi.string().required(),
  status: Joi.string().valid('draft', 'published').default('published'),
  participantCount: Joi.number().default(0),
  _destroy: Joi.boolean().default(false),
  createdAt: Joi.date().timestamp('javascript').default(() => Date.now()),
  updatedAt: Joi.date().timestamp('javascript').default(() => Date.now())
})

const validateBeforeCreate = async (data) => {
  return await EVENT_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const insertData = {
      ...validData,
      organizerId: new ObjectId(validData.organizerId)
    }
    const createdEvent = await GET_DB().collection(EVENT_COLLECTION_NAME).insertOne(insertData)
    return createdEvent
  } catch (error) {
    throw new Error(error)
  }
}

const findOneById = async (id) => {
  try {
    const result = await GET_DB().collection(EVENT_COLLECTION_NAME).findOne({
      _id: new ObjectId(id)
    })
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const countDocuments = async (query) => {
  try {
    return await GET_DB().collection(EVENT_COLLECTION_NAME).countDocuments(query)
  } catch (error) {
    throw new Error(error)
  }
}

const findByQuery = async (query, skip, limit) => {
  try {
    const result = await GET_DB().collection(EVENT_COLLECTION_NAME).aggregate([
      { $match: query },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'organizerId',
          foreignField: '_id',
          as: 'organizer'
        }
      },
      {
        $unwind: {
          path: '$organizer',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          'organizer.password': 0,
          'organizer.createdAt': 0,
          'organizer.updatedAt': 0
        }
      }
    ]).toArray()
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const getDetails = async (id) => {
  try {
    const result = await GET_DB().collection(EVENT_COLLECTION_NAME).aggregate([
      { $match: { _id: new ObjectId(id), _destroy: false } },
      {
        $lookup: {
          from: 'users',
          localField: 'organizerId',
          foreignField: '_id',
          as: 'organizer'
        }
      },
      {
        $unwind: {
          path: '$organizer',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          'organizer.password': 0
        }
      }
    ]).toArray()
    return result[0] || null
  } catch (error) {
    throw new Error(error)
  }
}

const incrementParticipantCount = async (id) => {
  try {
    const result = await GET_DB().collection(EVENT_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $inc: { participantCount: 1 } },
      { returnDocument: 'after' }
    )
    return result.value
  } catch (error) {
    throw new Error(error)
  }
}

export const eventModel = {
  EVENT_COLLECTION_NAME,
  EVENT_COLLECTION_SCHEMA,
  createNew,
  findOneById,
  countDocuments,
  findByQuery,
  getDetails,
  incrementParticipantCount
}
