import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'

const COMMENT_COLLECTION_NAME = 'forum_comments'

const COMMENT_COLLECTION_SCHEMA = Joi.object({
  postId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  authorId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  content: Joi.string().required(),
  likes: Joi.number().integer().min(0).default(0),
  
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await COMMENT_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
    stripUnknown: true
  })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    validData.postId = new ObjectId(validData.postId)
    validData.authorId = new ObjectId(validData.authorId)

    return await GET_DB().collection(COMMENT_COLLECTION_NAME).insertOne(validData)
  } catch (error) {
    throw new Error(error.message)
  }
}

const getCommentsByPostId = async (postId) => {
  try {
    const db = await GET_DB()
    const comments = await db.collection(COMMENT_COLLECTION_NAME)
      .aggregate([
        { $match: { postId: new ObjectId(postId), _destroy: { $ne: true } } },
        { $sort: { createdAt: 1 } },
        {
          $lookup: {
            from: 'users',
            localField: 'authorId',
            foreignField: '_id',
            as: 'author'
          }
        },
        { $unwind: '$author' },
        {
          $project: {
            'author.password': 0,
            'author.verifyToken': 0,
            'author.resetPasswordToken': 0
          }
        }
      ]).toArray()
    
    return comments
  } catch (error) {
    throw new Error(error.message)
  }
}

export const commentModel = {
  COMMENT_COLLECTION_NAME,
  COMMENT_COLLECTION_SCHEMA,
  createNew,
  getCommentsByPostId
}
