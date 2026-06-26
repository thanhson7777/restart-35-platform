import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { INTERVIEW_MEETING_TYPE, RECRUITMENT_INTERVIEW_STATUS } from '~/utils/constants'

const INTERVIEW_COLLECTION_NAME = 'recruitment_interviews'
const INTERVIEW_COLLECTION_SCHEMA = Joi.object({
  // References
  applicationId: Joi.string().required(),
  jobId: Joi.string().required(),
  workerId: Joi.string().required(),
  enterpriseId: Joi.string().required(),

  // Schedule
  scheduledAt: Joi.date().timestamp('javascript').required(),
  duration: Joi.number().integer().min(15).max(180).default(60),

  // Meeting Info
  meetingType: Joi.string()
    .valid(...Object.values(INTERVIEW_MEETING_TYPE))
    .required(),
  meetingLink: Joi.string().allow('', null),
  officeAddress: Joi.string().allow('', null),

  // Interviewers
  enterpriseInterviewer: Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().allow('', null),
    phone: Joi.string().allow('', null),
    position: Joi.string().allow('', null)
  }).default({}),

  // Confirmations
  workerConfirmed: Joi.boolean().default(true),
  enterpriseConfirmed: Joi.boolean().default(true),

  // Status
  status: Joi.string()
    .valid(...Object.values(RECRUITMENT_INTERVIEW_STATUS))
    .default(RECRUITMENT_INTERVIEW_STATUS.CONFIRMED),

  // Reschedule
  rescheduleCount: Joi.number().integer().min(0).default(0),
  lastRescheduleAt: Joi.date().timestamp('javascript').allow(null),
  rescheduleReason: Joi.string().allow('', null),

  // Reminders
  reminders: Joi.array().items(
    Joi.object({
      type: Joi.string().valid('worker', 'enterprise'),
      sentAt: Joi.date().timestamp('javascript').allow(null),
      scheduledFor: Joi.date().timestamp('javascript').allow(null),
      template: Joi.string().allow('', null)
    })
  ).default([]),

  // Notes
  notes: Joi.string().max(2000).allow('', null),

  // Feedback
  feedback: Joi.object({
    workerRating: Joi.number().integer().min(1).max(5).allow(null),
    enterpriseRating: Joi.number().integer().min(1).max(5).allow(null),
    workerComment: Joi.string().max(1000).allow('', null),
    enterpriseComment: Joi.string().max(1000).allow('', null),
    enterpriseDecision: Joi.string()
      .valid('hire', 'reject')
      .allow(null),
    enterpriseSalary: Joi.number().integer().min(0).allow(null),
    enterpriseStartDate: Joi.date().timestamp('javascript').allow(null),
    submittedAt: Joi.date().timestamp('javascript').allow(null)
  }).default({}),

  // Timestamps
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(Date.now),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await INTERVIEW_COLLECTION_SCHEMA.validateAsync(data, {
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

    return await GET_DB().collection(INTERVIEW_COLLECTION_NAME).insertOne(validData)
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ READ ============
const findOneById = async (interviewId) => {
  try {
    const objectId = new ObjectId(interviewId)
    return await GET_DB().collection(INTERVIEW_COLLECTION_NAME).findOne({
      _id: objectId,
      _destroy: { $ne: true }
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const findOneByIdAndWorker = async (interviewId, workerId) => {
  try {
    const objectId = new ObjectId(interviewId)
    return await GET_DB().collection(INTERVIEW_COLLECTION_NAME).findOne({
      _id: objectId,
      workerId: workerId,
      _destroy: { $ne: true }
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const findOneByIdAndEnterprise = async (interviewId, enterpriseId) => {
  try {
    const objectId = new ObjectId(interviewId)
    return await GET_DB().collection(INTERVIEW_COLLECTION_NAME).findOne({
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
    return await GET_DB().collection(INTERVIEW_COLLECTION_NAME).findOne({
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

    const interviews = await GET_DB().collection(INTERVIEW_COLLECTION_NAME)
      .find(query)
      .sort({ scheduledAt: 1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const total = await GET_DB().collection(INTERVIEW_COLLECTION_NAME).countDocuments(query)

    return { interviews, total }
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

    const interviews = await GET_DB().collection(INTERVIEW_COLLECTION_NAME)
      .find(query)
      .sort({ scheduledAt: 1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const total = await GET_DB().collection(INTERVIEW_COLLECTION_NAME).countDocuments(query)

    return { interviews, total }
  } catch (error) {
    throw new Error(error.message)
  }
}

const findUpcoming = async (userId, role, skip = 0, limit = 10) => {
  try {
    const now = new Date()
    const query = {
      [role === 'enterprise' ? 'enterpriseId' : 'workerId']: userId,
      scheduledAt: { $gte: now },
      status: { $in: [RECRUITMENT_INTERVIEW_STATUS.PENDING_CONFIRMATION, RECRUITMENT_INTERVIEW_STATUS.CONFIRMED] },
      _destroy: { $ne: true }
    }

    const interviews = await GET_DB().collection(INTERVIEW_COLLECTION_NAME)
      .find(query)
      .sort({ scheduledAt: 1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const total = await GET_DB().collection(INTERVIEW_COLLECTION_NAME).countDocuments(query)

    return { interviews, total }
  } catch (error) {
    throw new Error(error.message)
  }
}

const findInterviewsForReminder = async (startTimeMs, endTimeMs, reminderType) => {
  try {
    const query = {
      status: RECRUITMENT_INTERVIEW_STATUS.CONFIRMED,
      scheduledAt: {
        $gte: startTimeMs,
        $lte: endTimeMs
      },
      'reminders.type': { $ne: reminderType }, // avoid duplicates
      _destroy: { $ne: true }
    }
    return await GET_DB().collection(INTERVIEW_COLLECTION_NAME).find(query).toArray()
  } catch (error) {
    throw new Error(error.message)
  }
}

const findPastInterviewsForReminder = async (endTimeMs, reminderType) => {
  try {
    const query = {
      status: RECRUITMENT_INTERVIEW_STATUS.CONFIRMED,
      scheduledAt: { $lt: endTimeMs }, // endTimeMs could be (now - 2h)
      'reminders.type': { $ne: reminderType }, // avoid duplicates
      _destroy: { $ne: true }
    }
    return await GET_DB().collection(INTERVIEW_COLLECTION_NAME).find(query).toArray()
  } catch (error) {
    throw new Error(error.message)
  }
}

const findExpiredInterviews = async (endTimeMs) => {
  try {
    const query = {
      status: RECRUITMENT_INTERVIEW_STATUS.CONFIRMED,
      scheduledAt: { $lt: endTimeMs }, // endTimeMs could be (now - 3d)
      _destroy: { $ne: true }
    }
    return await GET_DB().collection(INTERVIEW_COLLECTION_NAME).find(query).toArray()
  } catch (error) {
    throw new Error(error.message)
  }
}

const markAsExpired = async (interviewId) => {
  try {
    const objectId = new ObjectId(interviewId)
    const result = await GET_DB().collection(INTERVIEW_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          status: RECRUITMENT_INTERVIEW_STATUS.EXPIRED,
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

const checkOverlap = async (workerId, enterpriseId, scheduledAt, duration) => {
  try {
    const startTime = scheduledAt
    const endTime = scheduledAt + (duration * 60 * 1000)
    
    // Find all active interviews for the worker or enterprise
    const interviews = await GET_DB().collection(INTERVIEW_COLLECTION_NAME).find({
      $or: [{ workerId: String(workerId) }, { enterpriseId: String(enterpriseId) }],
      status: { $in: [
        RECRUITMENT_INTERVIEW_STATUS.PENDING_CONFIRMATION, 
        RECRUITMENT_INTERVIEW_STATUS.RESCHEDULED, 
        RECRUITMENT_INTERVIEW_STATUS.CONFIRMED
      ]},
      _destroy: { $ne: true }
    }).toArray()
    
    // Check in memory for overlap
    for (const interview of interviews) {
      const existingStart = interview.scheduledAt
      const existingEnd = existingStart + ((interview.duration || 60) * 60 * 1000)
      
      if (existingStart < endTime && existingEnd > startTime) {
        return interview
      }
    }
    return null
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ UPDATE ============
const update = async (interviewId, data) => {
  try {
    const objectId = new ObjectId(interviewId)
    const updateData = {
      ...data,
      updatedAt: Date.now()
    }

    const result = await GET_DB().collection(INTERVIEW_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const confirmInterview = async (interviewId, workerId) => {
  try {
    const objectId = new ObjectId(interviewId)
    const interview = await findOneByIdAndWorker(interviewId, workerId)

    if (!interview) {
      throw new Error('Không tìm thấy lịch phỏng vấn')
    }

    const result = await GET_DB().collection(INTERVIEW_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          workerConfirmed: true,
          status: RECRUITMENT_INTERVIEW_STATUS.CONFIRMED,
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

const reschedule = async (interviewId, enterpriseId, newTime, reason = null, maxReschedules = 2) => {
  try {
    const objectId = new ObjectId(interviewId)
    const interview = await findOneByIdAndEnterprise(interviewId, enterpriseId)

    if (!interview) {
      throw new Error('Không tìm thấy lịch phỏng vấn')
    }

    if (interview.rescheduleCount >= maxReschedules) {
      throw new Error('Đã đạt số lần hoãn tối đa')
    }

    const result = await GET_DB().collection(INTERVIEW_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          scheduledAt: newTime,
          status: RECRUITMENT_INTERVIEW_STATUS.RESCHEDULED,
          rescheduleCount: interview.rescheduleCount + 1,
          lastRescheduleAt: Date.now(),
          rescheduleReason: reason,
          workerConfirmed: true,
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

const workerRequestReschedule = async (interviewId, workerId, reason, newPreferredTime) => {
  try {
    const objectId = new ObjectId(interviewId)
    const interview = await findOneByIdAndWorker(interviewId, workerId)

    if (!interview) {
      throw new Error('Không tìm thấy lịch phỏng vấn')
    }

    if (!interview.rescheduleCount !== undefined && interview.rescheduleCount >= 2) {
      throw new Error('Bạn đã đạt số lần yêu cầu hoãn tối đa')
    }

    // Update status to pending while waiting for enterprise to confirm new time
    const result = await GET_DB().collection(INTERVIEW_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          status: RECRUITMENT_INTERVIEW_STATUS.PENDING_CONFIRMATION,
          rescheduleReason: reason,
          updatedAt: Date.now()
        },
        $push: {
          reminders: {
            type: 'enterprise',
            scheduledFor: null,
            template: 'reschedule_request'
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

const cancelInterview = async (interviewId, enterpriseId, reason = null) => {
  try {
    const objectId = new ObjectId(interviewId)
    const interview = await findOneByIdAndEnterprise(interviewId, enterpriseId)

    if (!interview) {
      throw new Error('Không tìm thấy lịch phỏng vấn')
    }

    const result = await GET_DB().collection(INTERVIEW_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          status: RECRUITMENT_INTERVIEW_STATUS.CANCELLED,
          notes: reason ? `${interview.notes || ''}\n[Lý do hủy]: ${reason}`.trim() : interview.notes,
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

const completeInterview = async (interviewId, enterpriseId, feedback) => {
  try {
    const objectId = new ObjectId(interviewId)
    const interview = await findOneByIdAndEnterprise(interviewId, enterpriseId)

    if (!interview) {
      throw new Error('Không tìm thấy lịch phỏng vấn')
    }

    const result = await GET_DB().collection(INTERVIEW_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          status: RECRUITMENT_INTERVIEW_STATUS.COMPLETED,
          feedback: {
            ...interview.feedback,
            ...feedback,
            submittedAt: Date.now()
          },
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

const markNoShow = async (interviewId, enterpriseId) => {
  try {
    const objectId = new ObjectId(interviewId)
    const interview = await findOneByIdAndEnterprise(interviewId, enterpriseId)

    if (!interview) {
      throw new Error('Không tìm thấy lịch phỏng vấn')
    }

    const result = await GET_DB().collection(INTERVIEW_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          status: RECRUITMENT_INTERVIEW_STATUS.NO_SHOW,
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

const addReminder = async (interviewId, reminderData) => {
  try {
    const objectId = new ObjectId(interviewId)
    const result = await GET_DB().collection(INTERVIEW_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $push: { reminders: reminderData },
        $set: { updatedAt: Date.now() }
      },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const updateReminderSent = async (interviewId, reminderIndex) => {
  try {
    const objectId = new ObjectId(interviewId)
    const result = await GET_DB().collection(INTERVIEW_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          [`reminders.${reminderIndex}.sentAt`]: Date.now(),
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
const deleteInterview = async (interviewId) => {
  try {
    const objectId = new ObjectId(interviewId)
    return await GET_DB().collection(INTERVIEW_COLLECTION_NAME).updateOne(
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

    const stats = await GET_DB().collection(INTERVIEW_COLLECTION_NAME).aggregate(pipeline).toArray()

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

export const interviewModel = {
  INTERVIEW_COLLECTION_NAME,
  INTERVIEW_COLLECTION_SCHEMA,
  RECRUITMENT_INTERVIEW_STATUS,
  INTERVIEW_MEETING_TYPE,

  // Create
  createNew,

  // Read
  findOneById,
  findOneByIdAndWorker,
  findOneByIdAndEnterprise,
  findByApplication,
  findByWorker,
  findByEnterprise,
  findUpcoming,
  findInterviewsForReminder,
  findPastInterviewsForReminder,
  findExpiredInterviews,
  checkOverlap,

  // Update
  update,
  confirmInterview,
  reschedule,
  workerRequestReschedule,
  cancelInterview,
  completeInterview,
  markNoShow,
  markAsExpired,
  addReminder,
  updateReminderSent,

  // Delete
  deleteInterview,

  // Stats
  getStatsByEnterprise,

  // Helpers
  validateBeforeCreate
}
