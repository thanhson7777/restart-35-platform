import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import {
  APPLICATION_STATUS,
  DOCUMENT_TYPES,
  DISBURSEMENT_STATUS,
  APPEAL_STATUS,
  SCHOLARSHIP_COVERAGE
} from '~/utils/constants'

const APPLICATION_COLLECTION_NAME = 'scholarship_applications'
const APPLICATION_COLLECTION_SCHEMA = Joi.object({
  // IDs
  userId: Joi.string().required(),
  scholarshipId: Joi.string().required(),
  enrollmentId: Joi.string().allow(null),
  courseId: Joi.string().required(),

  // Status
  status: Joi.string()
    .valid(...Object.values(APPLICATION_STATUS))
    .default(APPLICATION_STATUS.DRAFT),

  // Motivation & Documents
  motivationLetter: Joi.string().max(2000).allow('', null),
  documents: Joi.array().items(
    Joi.object({
      type: Joi.string().valid(...Object.values(DOCUMENT_TYPES)),
      url: Joi.string().required(),
      verified: Joi.boolean().default(false),
      verifiedAt: Joi.date().timestamp('javascript').allow(null)
    })
  ).default([]),

  // Review Info
  reviewedBy: Joi.string().allow(null),
  reviewedAt: Joi.date().timestamp('javascript').allow(null),
  reviewNotes: Joi.string().max(2000).allow('', null),
  rejectionReason: Joi.string().max(1000).allow('', null),

  // Funding
  requestedAmount: Joi.number().integer().min(0).required(),
  approvedAmount: Joi.number().integer().min(0).allow(null),
  coverage: Joi.string()
    .valid(...Object.values(SCHOLARSHIP_COVERAGE))
    .allow(null),

  // Disbursements
  disbursements: Joi.array().items(
    Joi.object({
      amount: Joi.number().integer().min(0).required(),
      date: Joi.date().timestamp('javascript').default(Date.now()),
      status: Joi.string().valid(...Object.values(DISBURSEMENT_STATUS)),
      note: Joi.string().max(500).allow('', null)
    })
  ).default([]),
  totalDisbursed: Joi.number().integer().min(0).default(0),

  // Appeals
  appeals: Joi.array().items(
    Joi.object({
      reason: Joi.string().max(1000).required(),
      submittedAt: Joi.date().timestamp('javascript').default(Date.now()),
      status: Joi.string().valid(...Object.values(APPEAL_STATUS)),
      response: Joi.string().max(2000).allow('', null)
    })
  ).default([]),

  // Timeline
  submittedAt: Joi.date().timestamp('javascript').allow(null),
  approvedAt: Joi.date().timestamp('javascript').allow(null),
  expiresAt: Joi.date().timestamp('javascript').allow(null),

  // Metadata
  createdAt: Joi.date().timestamp('javascript').default(Date.now()),
  updatedAt: Joi.date().timestamp('javascript').default(Date.now()),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await APPLICATION_COLLECTION_SCHEMA.validateAsync(data, {
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

    return await GET_DB().collection(APPLICATION_COLLECTION_NAME).insertOne(validData)
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ READ ============
const findOneById = async (applicationId) => {
  try {
    const objectId = new ObjectId(applicationId)
    return await GET_DB().collection(APPLICATION_COLLECTION_NAME).findOne({
      _id: objectId,
      _destroy: { $ne: true }
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const findOneByUserAndScholarship = async (userId, scholarshipId) => {
  try {
    return await GET_DB().collection(APPLICATION_COLLECTION_NAME).findOne({
      userId: userId,
      scholarshipId: scholarshipId,
      _destroy: { $ne: true }
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const findByUser = async (userId, skip = 0, limit = 10, filters = {}) => {
  try {
    const query = {
      userId: userId,
      _destroy: { $ne: true },
      ...filters
    }

    const applications = await GET_DB().collection(APPLICATION_COLLECTION_NAME)
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const totalApplications = await GET_DB().collection(APPLICATION_COLLECTION_NAME).countDocuments(query)

    return { applications, totalApplications }
  } catch (error) {
    throw new Error(error.message)
  }
}

const findByScholarship = async (scholarshipId, skip = 0, limit = 10, filters = {}) => {
  try {
    const query = {
      scholarshipId: scholarshipId,
      _destroy: { $ne: true },
      ...filters
    }

    const applications = await GET_DB().collection(APPLICATION_COLLECTION_NAME)
      .find(query)
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const totalApplications = await GET_DB().collection(APPLICATION_COLLECTION_NAME).countDocuments(query)

    return { applications, totalApplications }
  } catch (error) {
    throw new Error(error.message)
  }
}

const findPendingByScholarship = async (scholarshipId, skip = 0, limit = 10) => {
  try {
    const query = {
      scholarshipId: scholarshipId,
      status: { $in: [APPLICATION_STATUS.SUBMITTED, APPLICATION_STATUS.REVIEWING] },
      _destroy: { $ne: true }
    }

    const applications = await GET_DB().collection(APPLICATION_COLLECTION_NAME)
      .find(query)
      .sort({ submittedAt: 1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const totalApplications = await GET_DB().collection(APPLICATION_COLLECTION_NAME).countDocuments(query)

    return { applications, totalApplications }
  } catch (error) {
    throw new Error(error.message)
  }
}

const findAll = async (skip = 0, limit = 10, filters = {}) => {
  try {
    const query = {
      _destroy: { $ne: true },
      ...filters
    }

    const applications = await GET_DB().collection(APPLICATION_COLLECTION_NAME)
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const totalApplications = await GET_DB().collection(APPLICATION_COLLECTION_NAME).countDocuments(query)

    return { applications, totalApplications }
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ UPDATE ============
const update = async (applicationId, data) => {
  try {
    const objectId = new ObjectId(applicationId)
    const updateData = {
      ...data,
      updatedAt: Date.now()
    }

    const result = await GET_DB().collection(APPLICATION_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const updateStatus = async (applicationId, status, additionalData = {}) => {
  try {
    const objectId = new ObjectId(applicationId)
    const updateData = {
      status: status,
      updatedAt: Date.now(),
      ...additionalData
    }

    if (status === APPLICATION_STATUS.SUBMITTED) {
      updateData.submittedAt = Date.now()
    }

    if (status === APPLICATION_STATUS.APPROVED) {
      updateData.approvedAt = Date.now()
    }

    if (status === APPLICATION_STATUS.REJECTED) {
      updateData.reviewedAt = Date.now()
    }

    const result = await GET_DB().collection(APPLICATION_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const addDocument = async (applicationId, document) => {
  try {
    const objectId = new ObjectId(applicationId)

    const result = await GET_DB().collection(APPLICATION_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $push: {
          documents: document
        },
        $set: {
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

const verifyDocument = async (applicationId, documentIndex, verified = true) => {
  try {
    const objectId = new ObjectId(applicationId)

    const result = await GET_DB().collection(APPLICATION_COLLECTION_NAME).findOneAndUpdate(
      {
        _id: objectId,
        [`documents.${documentIndex}`]: { $exists: true }
      },
      {
        $set: {
          [`documents.${documentIndex}.verified`]: verified,
          [`documents.${documentIndex}.verifiedAt`]: verified ? Date.now() : null,
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

const addDisbursement = async (applicationId, disbursement) => {
  try {
    const objectId = new ObjectId(applicationId)

    const result = await GET_DB().collection(APPLICATION_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $push: {
          disbursements: disbursement
        },
        $inc: {
          totalDisbursed: disbursement.amount
        },
        $set: {
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

const addAppeal = async (applicationId, appeal) => {
  try {
    const objectId = new ObjectId(applicationId)

    const result = await GET_DB().collection(APPLICATION_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $push: {
          appeals: appeal
        },
        $set: {
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

const updateAppealStatus = async (applicationId, appealIndex, status, response = null) => {
  try {
    const objectId = new ObjectId(applicationId)

    const updateData = {
      [`appeals.${appealIndex}.status`]: status,
      updatedAt: Date.now()
    }

    if (response) {
      updateData[`appeals.${appealIndex}.response`] = response
    }

    const result = await GET_DB().collection(APPLICATION_COLLECTION_NAME).findOneAndUpdate(
      {
        _id: objectId,
        [`appeals.${appealIndex}`]: { $exists: true }
      },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const linkEnrollment = async (applicationId, enrollmentId) => {
  try {
    const objectId = new ObjectId(applicationId)

    const result = await GET_DB().collection(APPLICATION_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          enrollmentId: enrollmentId,
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

// ============ DELETE ============
const deleteApplication = async (applicationId) => {
  try {
    const objectId = new ObjectId(applicationId)
    return await GET_DB().collection(APPLICATION_COLLECTION_NAME).updateOne(
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

// ============ AGGREGATE ============
const getStatsByScholarship = async (scholarshipId) => {
  try {
    const pipeline = [
      {
        $match: {
          scholarshipId: scholarshipId,
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

    const stats = await GET_DB().collection(APPLICATION_COLLECTION_NAME).aggregate(pipeline).toArray()

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

const getStatsByUser = async (userId) => {
  try {
    const pipeline = [
      {
        $match: {
          userId: userId,
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

    const stats = await GET_DB().collection(APPLICATION_COLLECTION_NAME).aggregate(pipeline).toArray()

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

const getOverallStats = async () => {
  try {
    const pipeline = [
      {
        $match: {
          _destroy: { $ne: true }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalDisbursed: { $sum: '$totalDisbursed' }
        }
      }
    ]

    const stats = await GET_DB().collection(APPLICATION_COLLECTION_NAME).aggregate(pipeline).toArray()

    const result = {
      total: 0,
      byStatus: {},
      totalDisbursed: 0
    }

    stats.forEach(stat => {
      result.byStatus[stat._id] = stat.count
      result.total += stat.count
      result.totalDisbursed += stat.totalDisbursed
    })

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

export const scholarshipApplicationModel = {
  APPLICATION_COLLECTION_NAME,
  APPLICATION_COLLECTION_SCHEMA,

  // Create
  createNew,

  // Read
  findOneById,
  findOneByUserAndScholarship,
  findByUser,
  findByScholarship,
  findPendingByScholarship,
  findAll,

  // Update
  update,
  updateStatus,
  addDocument,
  verifyDocument,
  addDisbursement,
  addAppeal,
  updateAppealStatus,
  linkEnrollment,

  // Delete
  deleteApplication,

  // Aggregate
  getStatsByScholarship,
  getStatsByUser,
  getOverallStats
}
