import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { RECRUITMENT_OFFER_STATUS } from '~/utils/constants'

const OFFER_COLLECTION_NAME = 'recruitment_offers'
const OFFER_COLLECTION_SCHEMA = Joi.object({
  // References
  applicationId: Joi.string().required(),
  jobId: Joi.string().required(),
  workerId: Joi.string().required(),
  enterpriseId: Joi.string().required(),

  // Offer Details
  salary: Joi.object({
    amount: Joi.number().integer().min(0).required(),
    currency: Joi.string().default('VND'),
    paymentType: Joi.string()
      .valid('monthly', 'hourly', 'project')
      .default('monthly')
  }).required(),

  position: Joi.string().required().max(255),
  startDate: Joi.date().timestamp('javascript').required(),
  probationPeriod: Joi.object({
    months: Joi.number().integer().min(0).max(12).default(2),
    salaryDuringProbation: Joi.number().integer().min(0).allow(null)
  }).default({}),

  benefits: Joi.array().items(Joi.string()).default([]),
  workingHours: Joi.string().allow('', null),
  location: Joi.string().allow('', null),
  terms: Joi.string().max(2000).allow('', null),

  // Status
  status: Joi.string()
    .valid(...Object.values(RECRUITMENT_OFFER_STATUS))
    .default(RECRUITMENT_OFFER_STATUS.PENDING),

  // Expiration
  expiresAt: Joi.date().timestamp('javascript').required(),

  // Response
  respondedAt: Joi.date().timestamp('javascript').allow(null),
  responseNote: Joi.string().max(1000).allow('', null),

  // Timestamps
  createdAt: Joi.date().timestamp('javascript').default(Date.now()),
  updatedAt: Joi.date().timestamp('javascript').default(Date.now()),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await OFFER_COLLECTION_SCHEMA.validateAsync(data, {
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

    return await GET_DB().collection(OFFER_COLLECTION_NAME).insertOne(validData)
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ READ ============
const findOneById = async (offerId) => {
  try {
    const objectId = new ObjectId(offerId)
    return await GET_DB().collection(OFFER_COLLECTION_NAME).findOne({
      _id: objectId,
      _destroy: { $ne: true }
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const findOneByIdAndWorker = async (offerId, workerId) => {
  try {
    const objectId = new ObjectId(offerId)
    return await GET_DB().collection(OFFER_COLLECTION_NAME).findOne({
      _id: objectId,
      workerId: workerId,
      _destroy: { $ne: true }
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const findOneByIdAndEnterprise = async (offerId, enterpriseId) => {
  try {
    const objectId = new ObjectId(offerId)
    return await GET_DB().collection(OFFER_COLLECTION_NAME).findOne({
      _id: objectId,
      enterpriseId: enterpriseId,
      _destroy: { $ne: true }
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const findByApplication = async (applicationId) => {
  try {
    return await GET_DB().collection(OFFER_COLLECTION_NAME).findOne({
      applicationId: applicationId,
      _destroy: { $ne: true }
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const findByWorker = async (workerId, skip = 0, limit = 10, filters = {}) => {
  try {
    const query = {
      workerId: workerId,
      _destroy: { $ne: true },
      ...filters
    }

    const offers = await GET_DB().collection(OFFER_COLLECTION_NAME)
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const total = await GET_DB().collection(OFFER_COLLECTION_NAME).countDocuments(query)

    return { offers, total }
  } catch (error) {
    throw new Error(error.message)
  }
}

const findByEnterprise = async (enterpriseId, skip = 0, limit = 10, filters = {}) => {
  try {
    const query = {
      enterpriseId: enterpriseId,
      _destroy: { $ne: true },
      ...filters
    }

    const offers = await GET_DB().collection(OFFER_COLLECTION_NAME)
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const total = await GET_DB().collection(OFFER_COLLECTION_NAME).countDocuments(query)

    return { offers, total }
  } catch (error) {
    throw new Error(error.message)
  }
}

const findPendingOffers = async (workerId) => {
  try {
    const now = new Date()
    const offers = await GET_DB().collection(OFFER_COLLECTION_NAME)
      .find({
        workerId: workerId,
        status: RECRUITMENT_OFFER_STATUS.PENDING,
        expiresAt: { $gte: now },
        _destroy: { $ne: true }
      })
      .sort({ expiresAt: 1 })
      .toArray()

    return offers
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ UPDATE ============
const update = async (offerId, data) => {
  try {
    const objectId = new ObjectId(offerId)
    const updateData = {
      ...data,
      updatedAt: Date.now()
    }

    const result = await GET_DB().collection(OFFER_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const acceptOffer = async (offerId, workerId, responseNote = null) => {
  try {
    const objectId = new ObjectId(offerId)
    const offer = await findOneByIdAndWorker(offerId, workerId)

    if (!offer) {
      throw new Error('Không tìm thấy offer')
    }

    if (offer.status !== RECRUITMENT_OFFER_STATUS.PENDING) {
      throw new Error('Offer không còn ở trạng thái chờ phản hồi')
    }

    if (new Date() > new Date(offer.expiresAt)) {
      throw new Error('Offer đã hết hạn')
    }

    const result = await GET_DB().collection(OFFER_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          status: RECRUITMENT_OFFER_STATUS.ACCEPTED,
          respondedAt: Date.now(),
          responseNote: responseNote,
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

const rejectOffer = async (offerId, workerId, reason = null) => {
  try {
    const objectId = new ObjectId(offerId)
    const offer = await findOneByIdAndWorker(offerId, workerId)

    if (!offer) {
      throw new Error('Không tìm thấy offer')
    }

    if (offer.status !== RECRUITMENT_OFFER_STATUS.PENDING) {
      throw new Error('Offer không còn ở trạng thái chờ phản hồi')
    }

    const result = await GET_DB().collection(OFFER_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          status: RECRUITMENT_OFFER_STATUS.REJECTED,
          respondedAt: Date.now(),
          responseNote: reason,
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

const withdrawOffer = async (offerId, enterpriseId) => {
  try {
    const objectId = new ObjectId(offerId)
    const offer = await findOneByIdAndEnterprise(offerId, enterpriseId)

    if (!offer) {
      throw new Error('Không tìm thấy offer')
    }

    if (offer.status === RECRUITMENT_OFFER_STATUS.ACCEPTED) {
      throw new Error('Không thể thu hồi offer đã được chấp nhận')
    }

    const result = await GET_DB().collection(OFFER_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          status: RECRUITMENT_OFFER_STATUS.WITHDRAWN,
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

const expireOffers = async () => {
  try {
    const now = new Date()
    const result = await GET_DB().collection(OFFER_COLLECTION_NAME).updateMany(
      {
        status: RECRUITMENT_OFFER_STATUS.PENDING,
        expiresAt: { $lt: now },
        _destroy: { $ne: true }
      },
      {
        $set: {
          status: RECRUITMENT_OFFER_STATUS.EXPIRED,
          updatedAt: Date.now()
        }
      }
    )

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ STATS ============
const getStatsByEnterprise = async (enterpriseId) => {
  try {
    const pipeline = [
      {
        $match: {
          enterpriseId: enterpriseId,
          _destroy: { $ne: true }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]

    const stats = await GET_DB().collection(OFFER_COLLECTION_NAME).aggregate(pipeline).toArray()

    const result = {
      total: 0,
      byStatus: {}
    }

    stats.forEach(stat => {
      result.byStatus[stat._id] = stat.count
      result.total += stat.count
    })

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ DELETE ============
const deleteOffer = async (offerId) => {
  try {
    const objectId = new ObjectId(offerId)
    return await GET_DB().collection(OFFER_COLLECTION_NAME).updateOne(
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

export const offerModel = {
  OFFER_COLLECTION_NAME,
  OFFER_COLLECTION_SCHEMA,
  RECRUITMENT_OFFER_STATUS,

  // Create
  createNew,

  // Read
  findOneById,
  findOneByIdAndWorker,
  findOneByIdAndEnterprise,
  findByApplication,
  findByWorker,
  findByEnterprise,
  findPendingOffers,

  // Update
  update,
  acceptOffer,
  rejectOffer,
  withdrawOffer,
  expireOffers,

  // Delete
  deleteOffer,

  // Stats
  getStatsByEnterprise,

  // Helpers
  validateBeforeCreate
}
