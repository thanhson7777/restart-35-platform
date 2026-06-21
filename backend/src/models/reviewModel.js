import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'

const REVIEW_COLLECTION_NAME = 'reviews'

// ============ REVIEW STATUS ============
export const REVIEW_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  FLAGGED: 'flagged',
  REJECTED: 'rejected'
}

const REVIEW_COLLECTION_SCHEMA = Joi.object({
  courseId: Joi.string().required(),
  userId: Joi.string().required(),

  rating: Joi.object({
    overall: Joi.number().integer().min(1).max(5).required(),
    content: Joi.number().integer().min(1).max(5),
    instructor: Joi.number().integer().min(1).max(5),
    materials: Joi.number().integer().min(1).max(5),
    support: Joi.number().integer().min(1).max(5)
  }).required(),

  title: Joi.string().required().max(255),
  content: Joi.string().required(),

  workerProfile: Joi.object({
    industry: Joi.string().allow(null, ''),
    age: Joi.number().integer().min(18).max(100),
    previousJob: Joi.string().allow(null, '')
  }),

  response: Joi.object({
    content: Joi.string().allow(null, ''),
    respondedAt: Joi.date().timestamp('javascript'),
    respondedBy: Joi.string().allow(null, '')
  }),

  helpful: Joi.object({
    count: Joi.number().integer().min(0).default(0),
    voters: Joi.array().items(Joi.string()).default([])
  }),

  status: Joi.string()
    .valid(...Object.values(REVIEW_STATUS))
    .default(REVIEW_STATUS.PENDING),
  flaggedReason: Joi.string().allow(null, ''),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(Date.now),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await REVIEW_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
    stripUnknown: true
  })
}

// ============ CREATE ============
const createNew = async (data, skipValidation = false) => {
  try {
    const validData = skipValidation
      ? data
      : await validateBeforeCreate(data)

    return await GET_DB().collection(REVIEW_COLLECTION_NAME).insertOne(validData)
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ READ ============
const findOneById = async (reviewId) => {
  try {
    const objectId = new ObjectId(reviewId)
    return await GET_DB().collection(REVIEW_COLLECTION_NAME).findOne({
      _id: objectId,
      _destroy: { $ne: true }
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const findByCourse = async (courseId, queryParams = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = REVIEW_STATUS.APPROVED,
      sortBy = 'createdAt',
      order = 'desc',
      rating
    } = queryParams

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const sortOrder = order === 'asc' ? 1 : -1

    const matchStage = {
      courseId: courseId,
      _destroy: { $ne: true }
    }

    if (status) {
      matchStage.status = status
    }

    if (rating) {
      matchStage['rating.overall'] = parseInt(rating)
    }

    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'users',
          let: { userId: '$userId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', { $toObjectId: '$$userId' }] } } }
          ],
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'workerProfiles',
          let: { userId: '$userId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$userId', '$$userId'] } } }
          ],
          as: 'workerProfileData'
        }
      },
      { $unwind: { path: '$workerProfileData', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          courseId: 1,
          rating: 1,
          title: 1,
          content: 1,
          workerProfile: 1,
          response: 1,
          helpful: 1,
          status: 1,
          createdAt: 1,
          'user._id': 1,
          'user.displayName': 1,
          'user.avatar': 1,
          'workerProfileData.industry': 1
        }
      },
      { $sort: { [sortBy]: sortOrder } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]

    const reviews = await GET_DB().collection(REVIEW_COLLECTION_NAME).aggregate(pipeline).toArray()

    const total = await GET_DB().collection(REVIEW_COLLECTION_NAME).countDocuments(matchStage)

    return { reviews, total }
  } catch (error) {
    throw new Error(error.message)
  }
}

const findByUser = async (userId, queryParams = {}) => {
  try {
    const { page = 1, limit = 10 } = queryParams
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const reviews = await GET_DB().collection(REVIEW_COLLECTION_NAME)
      .aggregate([
        { $match: { userId: userId, _destroy: { $ne: true } } },
        {
          $lookup: {
            from: 'courses',
            let: { courseId: { $toObjectId: '$courseId' } },
            pipeline: [
              { $match: { $expr: { $eq: ['$_id', '$$courseId'] } } }
            ],
            as: 'course'
          }
        },
        { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            courseId: 1,
            rating: 1,
            title: 1,
            content: 1,
            status: 1,
            response: 1,
            helpful: 1,
            createdAt: 1,
            'course.title': 1,
            'course.slug': 1,
            'course.thumbnail': 1
          }
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: parseInt(limit) }
      ])
      .toArray()

    const total = await GET_DB().collection(REVIEW_COLLECTION_NAME).countDocuments({
      userId: userId,
      _destroy: { $ne: true }
    })

    return { reviews, total }
  } catch (error) {
    throw new Error(error.message)
  }
}

const findByUserAndCourse = async (userId, courseId) => {
  try {
    return await GET_DB().collection(REVIEW_COLLECTION_NAME).findOne({
      userId: userId,
      courseId: courseId,
      _destroy: { $ne: true }
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const findPending = async (queryParams = {}) => {
  try {
    const { page = 1, limit = 10 } = queryParams
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const reviews = await GET_DB().collection(REVIEW_COLLECTION_NAME)
      .aggregate([
        {
          $match: {
            status: REVIEW_STATUS.PENDING,
            _destroy: { $ne: true }
          }
        },
        {
          $lookup: {
            from: 'users',
            let: { userId: '$userId' },
            pipeline: [
              { $match: { $expr: { $eq: ['$_id', { $toObjectId: '$$userId' }] } } }
            ],
            as: 'user'
          }
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'courses',
            let: { courseId: { $toObjectId: '$courseId' } },
            pipeline: [
              { $match: { $expr: { $eq: ['$_id', '$$courseId'] } } }
            ],
            as: 'course'
          }
        },
        { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            courseId: 1,
            rating: 1,
            title: 1,
            content: 1,
            status: 1,
            createdAt: 1,
            'user.displayName': 1,
            'course.title': 1
          }
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: parseInt(limit) }
      ])
      .toArray()

    const total = await GET_DB().collection(REVIEW_COLLECTION_NAME).countDocuments({
      status: REVIEW_STATUS.PENDING,
      _destroy: { $ne: true }
    })

    return { reviews, total }
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ UPDATE ============
const update = async (reviewId, data) => {
  try {
    const objectId = new ObjectId(reviewId)
    const updateData = {
      ...data,
      updatedAt: Date.now(),
      status: REVIEW_STATUS.PENDING
    }

    const result = await GET_DB().collection(REVIEW_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const approveReview = async (reviewId) => {
  try {
    const objectId = new ObjectId(reviewId)
    return await GET_DB().collection(REVIEW_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          status: REVIEW_STATUS.APPROVED,
          updatedAt: Date.now()
        }
      },
      { returnDocument: 'after' }
    )
  } catch (error) {
    throw new Error(error.message)
  }
}

const rejectReview = async (reviewId, reason) => {
  try {
    const objectId = new ObjectId(reviewId)
    return await GET_DB().collection(REVIEW_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          status: REVIEW_STATUS.REJECTED,
          flaggedReason: reason,
          updatedAt: Date.now()
        }
      },
      { returnDocument: 'after' }
    )
  } catch (error) {
    throw new Error(error.message)
  }
}

const flagReview = async (reviewId, reason) => {
  try {
    const objectId = new ObjectId(reviewId)
    return await GET_DB().collection(REVIEW_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          status: REVIEW_STATUS.FLAGGED,
          flaggedReason: reason,
          updatedAt: Date.now()
        }
      },
      { returnDocument: 'after' }
    )
  } catch (error) {
    throw new Error(error.message)
  }
}

const addResponse = async (reviewId, responseData) => {
  try {
    const objectId = new ObjectId(reviewId)
    return await GET_DB().collection(REVIEW_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          response: {
            content: responseData.content,
            respondedAt: Date.now(),
            respondedBy: responseData.respondedBy
          },
          updatedAt: Date.now()
        }
      },
      { returnDocument: 'after' }
    )
  } catch (error) {
    throw new Error(error.message)
  }
}

const voteHelpful = async (reviewId, userId) => {
  try {
    const review = await findOneById(reviewId)
    if (!review) {
      throw new Error('Review not found')
    }

    const voters = review.helpful?.voters || []
    const hasVoted = voters.includes(userId)

    const objectId = new ObjectId(reviewId)

    if (hasVoted) {
      return await GET_DB().collection(REVIEW_COLLECTION_NAME).findOneAndUpdate(
        { _id: objectId },
        {
          $pull: { 'helpful.voters': userId },
          $inc: { 'helpful.count': -1 },
          $set: { updatedAt: Date.now() }
        },
        { returnDocument: 'after' }
      )
    } else {
      return await GET_DB().collection(REVIEW_COLLECTION_NAME).findOneAndUpdate(
        { _id: objectId },
        {
          $addToSet: { 'helpful.voters': userId },
          $inc: { 'helpful.count': 1 },
          $set: { updatedAt: Date.now() }
        },
        { returnDocument: 'after' }
      )
    }
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ DELETE ============
const deleteReview = async (reviewId) => {
  try {
    const objectId = new ObjectId(reviewId)
    return await GET_DB().collection(REVIEW_COLLECTION_NAME).updateOne(
      { _id: objectId },
      {
        $set: {
          _destroy: true,
          updatedAt: Date.now()
        }
      }
    )
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ STATS ============
const getCourseRatingStats = async (courseId) => {
  try {
    const pipeline = [
      {
        $match: {
          courseId: courseId,
          status: REVIEW_STATUS.APPROVED,
          _destroy: { $ne: true }
        }
      },
      {
        $group: {
          _id: '$courseId',
          totalReviews: { $sum: 1 },
          avgOverall: { $avg: '$rating.overall' },
          avgContent: { $avg: '$rating.content' },
          avgInstructor: { $avg: '$rating.instructor' },
          avgMaterials: { $avg: '$rating.materials' },
          avgSupport: { $avg: '$rating.support' },
          ratingDistribution: {
            $push: '$rating.overall'
          }
        }
      }
    ]

    const result = await GET_DB().collection(REVIEW_COLLECTION_NAME).aggregate(pipeline).toArray()

    if (result.length === 0) {
      return {
        totalReviews: 0,
        avgOverall: 0,
        avgContent: 0,
        avgInstructor: 0,
        avgMaterials: 0,
        avgSupport: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      }
    }

    const stats = result[0]

    const ratingDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    stats.ratingDistribution.forEach(r => {
      if (ratingDist[r]) ratingDist[r]++
    })

    return {
      totalReviews: stats.totalReviews,
      avgOverall: Math.round(stats.avgOverall * 10) / 10,
      avgContent: Math.round(stats.avgContent * 10) / 10,
      avgInstructor: Math.round(stats.avgInstructor * 10) / 10,
      avgMaterials: Math.round(stats.avgMaterials * 10) / 10,
      avgSupport: Math.round(stats.avgSupport * 10) / 10,
      ratingDistribution: ratingDist
    }
  } catch (error) {
    throw new Error(error.message)
  }
}

export const reviewModel = {
  REVIEW_COLLECTION_NAME,
  REVIEW_COLLECTION_SCHEMA,
  REVIEW_STATUS,

  // Create
  createNew,

  // Read
  findOneById,
  findByCourse,
  findByUser,
  findByUserAndCourse,
  findPending,

  // Update
  update,
  approveReview,
  rejectReview,
  flagReview,
  addResponse,
  voteHelpful,

  // Delete
  deleteReview,

  // Stats
  getCourseRatingStats
}
