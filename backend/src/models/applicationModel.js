import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import {
  RECRUITMENT_APPLICATION_STATUS,
  RECRUITMENT_APPLICATION_SOURCE
} from '~/utils/constants'

const APPLICATION_COLLECTION_NAME = 'recruitment_applications'
const APPLICATION_COLLECTION_SCHEMA = Joi.object({
  // References
  jobId: Joi.string().required(),
  workerId: Joi.string().required(),
  enterpriseId: Joi.string().required(),

  // Status
  status: Joi.string()
    .valid(...Object.values(RECRUITMENT_APPLICATION_STATUS))
    .default(RECRUITMENT_APPLICATION_STATUS.NEW),
  source: Joi.string()
    .valid(...Object.values(RECRUITMENT_APPLICATION_SOURCE))
    .default(RECRUITMENT_APPLICATION_SOURCE.DIRECT),

  // Content
  coverLetter: Joi.string().max(2000).allow('', null),
  notes: Joi.string().max(1000).allow('', null),
  internalNotes: Joi.string().max(2000).allow('', null),
  shortlistReason: Joi.string().max(500).allow('', null),

  // Linked Documents
  interviewId: Joi.string().allow(null),
  offerId: Joi.string().allow(null),

  // Status History
  statusHistory: Joi.array().items(
    Joi.object({
      status: Joi.string(),
      changedAt: Joi.date().timestamp('javascript').default(Date.now),
      changedBy: Joi.string().allow(null),
      note: Joi.string().allow('', null)
    })
  ).default([]),

  // Timestamps
  appliedAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(Date.now),
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

    // Add initial status history
    validData.statusHistory = [{
      status: validData.status,
      changedAt: Date.now(),
      changedBy: null,
      note: 'Đơn ứng tuyển được tạo'
    }]

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

const findOneByIdAndWorker = async (applicationId, workerId) => {
  try {
    const objectId = new ObjectId(applicationId)
    return await GET_DB().collection(APPLICATION_COLLECTION_NAME).findOne({
      _id: objectId,
      workerId: workerId,
      _destroy: { $ne: true }
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const findOneByIdAndEnterprise = async (applicationId, enterpriseId) => {
  try {
    const objectId = new ObjectId(applicationId)
    return await GET_DB().collection(APPLICATION_COLLECTION_NAME).findOne({
      _id: objectId,
      enterpriseId: enterpriseId,
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

    const applications = await GET_DB().collection(APPLICATION_COLLECTION_NAME)
      .find(query)
      .sort({ appliedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const total = await GET_DB().collection(APPLICATION_COLLECTION_NAME).countDocuments(query)

    return { applications, total }
  } catch (error) {
    throw new Error(error.message)
  }
}

const findByJob = async (jobId, enterpriseId, skip = 0, limit = 10, filters = {}) => {
  try {
    const query = {
      jobId: jobId,
      enterpriseId: enterpriseId,
      _destroy: { $ne: true },
      ...filters
    }

    const applications = await GET_DB().collection(APPLICATION_COLLECTION_NAME)
      .find(query)
      .sort({ appliedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const total = await GET_DB().collection(APPLICATION_COLLECTION_NAME).countDocuments(query)

    return { applications, total }
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

    const applications = await GET_DB().collection(APPLICATION_COLLECTION_NAME)
      .find(query)
      .sort({ appliedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const total = await GET_DB().collection(APPLICATION_COLLECTION_NAME).countDocuments(query)

    return { applications, total }
  } catch (error) {
    throw new Error(error.message)
  }
}

const checkExistingApplication = async (jobId, workerId) => {
  try {
    const existing = await GET_DB().collection(APPLICATION_COLLECTION_NAME).findOne({
      jobId: jobId,
      workerId: workerId,
      _destroy: { $ne: true },
      status: { $nin: [RECRUITMENT_APPLICATION_STATUS.REJECTED, RECRUITMENT_APPLICATION_STATUS.WITHDRAWN] }
    })

    return !!existing
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

const updateStatus = async (applicationId, newStatus, changedBy = null, note = null) => {
  try {
    const objectId = new ObjectId(applicationId)
    const application = await findOneById(applicationId)

    if (!application) {
      throw new Error('Không tìm thấy đơn ứng tuyển')
    }

    const result = await GET_DB().collection(APPLICATION_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          status: newStatus,
          updatedAt: Date.now()
        },
        $push: {
          statusHistory: {
            status: newStatus,
            changedAt: Date.now(),
            changedBy: changedBy,
            note: note
          }
        }
      },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const shortlist = async (applicationId, enterpriseId, reason = null) => {
  try {
    const objectId = new ObjectId(applicationId)
    const application = await findOneByIdAndEnterprise(applicationId, enterpriseId)

    if (!application) {
      throw new Error('Không tìm thấy đơn ứng tuyển')
    }

    const result = await GET_DB().collection(APPLICATION_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          status: RECRUITMENT_APPLICATION_STATUS.SHORTLISTED,
          shortlistReason: reason,
          updatedAt: Date.now()
        },
        $push: {
          statusHistory: {
            status: RECRUITMENT_APPLICATION_STATUS.SHORTLISTED,
            changedAt: Date.now(),
            changedBy: enterpriseId,
            note: reason || 'Ứng viên được chọn vào danh sách phỏng vấn'
          }
        }
      },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const rejectApplication = async (applicationId, enterpriseId, reason = null) => {
  try {
    const objectId = new ObjectId(applicationId)
    const application = await findOneByIdAndEnterprise(applicationId, enterpriseId)

    if (!application) {
      throw new Error('Không tìm thấy đơn ứng tuyển')
    }

    const result = await GET_DB().collection(APPLICATION_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          status: RECRUITMENT_APPLICATION_STATUS.REJECTED,
          internalNotes: reason ? `${application.internalNotes || ''}\n[Lý do từ chối]: ${reason}`.trim() : application.internalNotes,
          updatedAt: Date.now()
        },
        $push: {
          statusHistory: {
            status: RECRUITMENT_APPLICATION_STATUS.REJECTED,
            changedAt: Date.now(),
            changedBy: enterpriseId,
            note: reason || 'Đơn bị từ chối'
          }
        }
      },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const withdraw = async (applicationId, workerId) => {
  try {
    const objectId = new ObjectId(applicationId)
    const application = await findOneByIdAndWorker(applicationId, workerId)

    if (!application) {
      throw new Error('Không tìm thấy đơn ứng tuyển')
    }

    if (application.status === RECRUITMENT_APPLICATION_STATUS.HIRED) {
      throw new Error('Không thể rút đơn đã được nhận việc')
    }

    const result = await GET_DB().collection(APPLICATION_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          status: RECRUITMENT_APPLICATION_STATUS.WITHDRAWN,
          updatedAt: Date.now()
        },
        $push: {
          statusHistory: {
            status: RECRUITMENT_APPLICATION_STATUS.WITHDRAWN,
            changedAt: Date.now(),
            changedBy: workerId,
            note: 'Ứng viên rút đơn'
          }
        }
      },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const linkInterview = async (applicationId, interviewId) => {
  try {
    const objectId = new ObjectId(applicationId)
    const result = await GET_DB().collection(APPLICATION_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          interviewId: interviewId,
          status: RECRUITMENT_APPLICATION_STATUS.INTERVIEW_SCHEDULED,
          updatedAt: Date.now()
        },
        $push: {
          statusHistory: {
            status: RECRUITMENT_APPLICATION_STATUS.INTERVIEW_SCHEDULED,
            changedAt: Date.now(),
            changedBy: null,
            note: 'Lịch phỏng vấn đã được đặt'
          }
        }
      },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const linkOffer = async (applicationId, offerId) => {
  try {
    const objectId = new ObjectId(applicationId)
    const result = await GET_DB().collection(APPLICATION_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          offerId: offerId,
          status: RECRUITMENT_APPLICATION_STATUS.OFFERED,
          updatedAt: Date.now()
        },
        $push: {
          statusHistory: {
            status: RECRUITMENT_APPLICATION_STATUS.OFFERED,
            changedAt: Date.now(),
            changedBy: null,
            note: 'Offer đã được tạo'
          }
        }
      },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const markAsHired = async (applicationId) => {
  try {
    const objectId = new ObjectId(applicationId)
    const result = await GET_DB().collection(APPLICATION_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          status: RECRUITMENT_APPLICATION_STATUS.HIRED,
          updatedAt: Date.now()
        },
        $push: {
          statusHistory: {
            status: RECRUITMENT_APPLICATION_STATUS.HIRED,
            changedAt: Date.now(),
            changedBy: null,
            note: 'Ứng viên được nhận việc'
          }
        }
      },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ STATS ============
const getStatsByJob = async (jobId) => {
  try {
    const pipeline = [
      {
        $match: {
          jobId: jobId,
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

const getEnterpriseApplicationStats = async () => {
  try {
    const pipeline = [
      {
        $match: {
          _destroy: { $ne: true },
          enterpriseId: { $exists: true, $type: 'string', $regex: /^[0-9a-fA-F]{24}$/ }
        }
      },
      {
        $group: {
          _id: '$enterpriseId',
          totalApplications: { $sum: 1 },
          pendingApplications: {
            $sum: {
              $cond: [
                { $in: ['$status', [RECRUITMENT_APPLICATION_STATUS.NEW, RECRUITMENT_APPLICATION_STATUS.SHORTLISTED]] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $addFields: {
          enterpriseObjectId: { $toObjectId: '$_id' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'enterpriseObjectId',
          foreignField: '_id',
          as: 'enterpriseInfo'
        }
      },
      {
        $unwind: {
          path: '$enterpriseInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          enterpriseId: '$_id',
          enterpriseName: { $ifNull: ['$enterpriseInfo.displayName', 'Unknown Enterprise'] },
          enterpriseEmail: { $ifNull: ['$enterpriseInfo.email', ''] },
          totalApplications: 1,
          pendingApplications: 1
        }
      },
      { $sort: { totalApplications: -1 } }
    ]
    return await GET_DB().collection(APPLICATION_COLLECTION_NAME).aggregate(pipeline).toArray()
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
      .sort({ appliedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const totalApplications = await GET_DB().collection(APPLICATION_COLLECTION_NAME).countDocuments(query)

    return { applications, totalApplications }
  } catch (error) {
    throw new Error(error.message)
  }
}

export const applicationModel = {
  APPLICATION_COLLECTION_NAME,
  APPLICATION_COLLECTION_SCHEMA,
  RECRUITMENT_APPLICATION_STATUS,
  RECRUITMENT_APPLICATION_SOURCE,

  // Create
  createNew,

  // Read
  findOneById,
  findOneByIdAndWorker,
  findOneByIdAndEnterprise,
  findByWorker,
  findByJob,
  findByEnterprise,
  checkExistingApplication,
  findAll,

  // Update
  update,
  updateStatus,
  shortlist,
  rejectApplication,
  withdraw,
  linkInterview,
  linkOffer,
  markAsHired,

  // Stats
  getStatsByJob,
  getStatsByEnterprise,

  // Delete
  deleteApplication,

  // Delete
  deleteApplication,

  // Helpers
  validateBeforeCreate,
  
  getEnterpriseApplicationStats,
  findAll
}
