import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'

const POST_COLLECTION_NAME = 'forum_posts'

const POST_COLLECTION_SCHEMA = Joi.object({
  title: Joi.string().allow(null, '').max(255), // Optional title
  content: Joi.string().required(),
  authorId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  categoryId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).allow(null, ''),
  tags: Joi.array().items(Joi.string()).default([]),
  
  reactions: Joi.object({
    thumbsUp: Joi.number().integer().min(0).default(0),
    thumbsDown: Joi.number().integer().min(0).default(0),
  }).default({ thumbsUp: 0, thumbsDown: 0 }),
  
  likedBy: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).default([]),
  commentCount: Joi.number().integer().min(0).default(0),
  
  isPinned: Joi.boolean().default(false),
  
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await POST_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
    stripUnknown: true
  })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    validData.authorId = new ObjectId(validData.authorId)
    if (validData.categoryId) {
      validData.categoryId = new ObjectId(validData.categoryId)
    }

    return await GET_DB().collection(POST_COLLECTION_NAME).insertOne(validData)
  } catch (error) {
    throw new Error(error.message)
  }
}

const findOneById = async (postId) => {
  try {
    return await GET_DB().collection(POST_COLLECTION_NAME).findOne({
      _id: new ObjectId(postId),
      _destroy: { $ne: true }
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const getPosts = async (filter = {}, skip = 0, limit = 20) => {
  try {
    const db = await GET_DB()
    const query = { ...filter, _destroy: { $ne: true } }
    
    const [posts, total] = await Promise.all([
      db.collection(POST_COLLECTION_NAME)
        .aggregate([
          { $match: query },
          { $sort: { isPinned: -1, createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
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
            $lookup: {
              from: 'community_categories',
              localField: 'categoryId',
              foreignField: '_id',
              as: 'category'
            }
          },
          { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              'author.password': 0,
              'author.verifyToken': 0,
              'author.resetPasswordToken': 0
            }
          }
        ]).toArray(),
      db.collection(POST_COLLECTION_NAME).countDocuments(query)
    ])

    return { posts, total }
  } catch (error) {
    throw new Error(error.message)
  }
}

const getPostDetail = async (postId) => {
  try {
    const db = await GET_DB()
    const posts = await db.collection(POST_COLLECTION_NAME)
      .aggregate([
        { $match: { _id: new ObjectId(postId), _destroy: { $ne: true } } },
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
          $lookup: {
            from: 'community_categories',
            localField: 'categoryId',
            foreignField: '_id',
            as: 'category'
          }
        },
        { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            'author.password': 0,
            'author.verifyToken': 0,
            'author.resetPasswordToken': 0
          }
        }
      ]).toArray()
    
    return posts[0] || null
  } catch (error) {
    throw new Error(error.message)
  }
}

const toggleLike = async (postId, userId) => {
  try {
    const db = await GET_DB()
    const post = await findOneById(postId)
    if (!post) throw new Error('Bài viết không tồn tại')

    const likedByIndex = post.likedBy ? post.likedBy.findIndex(id => id.toString() === userId.toString()) : -1
    
    let updateOp = {}
    if (likedByIndex > -1) {
      // Unlike
      updateOp = {
        $pull: { likedBy: userId },
        $inc: { 'reactions.thumbsUp': -1 },
        $set: { updatedAt: Date.now() }
      }
    } else {
      // Like
      updateOp = {
        $addToSet: { likedBy: userId },
        $inc: { 'reactions.thumbsUp': 1 },
        $set: { updatedAt: Date.now() }
      }
    }

    const result = await db.collection(POST_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(postId) },
      updateOp,
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const updateCommentCount = async (postId, countDelta = 1) => {
  try {
    return await GET_DB().collection(POST_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(postId) },
      { $inc: { commentCount: countDelta } },
      { returnDocument: 'after' }
    )
  } catch (error) {
    throw new Error(error.message)
  }
}

const getMyPostsWithStats = async (authorId, skip = 0, limit = 20) => {
  try {
    const db = await GET_DB()
    const query = { authorId: new ObjectId(authorId), _destroy: { $ne: true } }
    
    const [posts, statsResult] = await Promise.all([
      db.collection(POST_COLLECTION_NAME)
        .aggregate([
          { $match: query },
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: 'community_categories',
              localField: 'categoryId',
              foreignField: '_id',
              as: 'category'
            }
          },
          { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } }
        ]).toArray(),
      
      db.collection(POST_COLLECTION_NAME).aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalPosts: { $sum: 1 },
            totalLikes: { $sum: '$reactions.thumbsUp' },
            totalComments: { $sum: '$commentCount' }
          }
        }
      ]).toArray()
    ])

    const stats = statsResult[0] || { totalPosts: 0, totalLikes: 0, totalComments: 0 }

    return { posts, stats }
  } catch (error) {
    throw new Error(error.message)
  }
}

const deletePost = async (postId, authorId) => {
  try {
    return await GET_DB().collection(POST_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(postId), authorId: new ObjectId(authorId), _destroy: { $ne: true } },
      { $set: { _destroy: true, updatedAt: Date.now() } },
      { returnDocument: 'after' }
    )
  } catch (error) {
    throw new Error(error.message)
  }
}

export const forumPostModel = {
  POST_COLLECTION_NAME,
  POST_COLLECTION_SCHEMA,
  createNew,
  findOneById,
  getPosts,
  getPostDetail,
  toggleLike,
  updateCommentCount,
  getMyPostsWithStats,
  deletePost
}
