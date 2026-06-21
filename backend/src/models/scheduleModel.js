import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import {
  SCHEDULE_STATUS,
  SESSION_STATUS,
  LOCATION_TYPES,
  REMINDER_TYPES,
  REMINDER_STATUS
} from '~/utils/constants'

const SCHEDULE_COLLECTION_NAME = 'schedules'

const ATTENDANCE_SCHEMA = Joi.object({
  userId: Joi.string().required(),
  status: Joi.string().valid('present', 'absent', 'late', 'excused').required(),
  checkedAt: Joi.date().timestamp('javascript').default(Date.now),
  note: Joi.string().allow(null, '')
})

const SESSION_SCHEMA = Joi.object({
  sessionNumber: Joi.number().integer().min(1).required(),
  title: Joi.string().required().max(255),
  date: Joi.date().timestamp('javascript').required(),
  startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  duration: Joi.number().integer().min(1).required(),
  topic: Joi.string().allow(null, ''),
  instructorId: Joi.string().allow(null, ''),
  location: Joi.object({
    type: Joi.string().valid(...Object.values(LOCATION_TYPES)),
    address: Joi.string().allow(null, ''),
    link: Joi.string().uri().allow(null, '')
  }),
  status: Joi.string()
    .valid(...Object.values(SESSION_STATUS))
    .default(SESSION_STATUS.SCHEDULED),
  attendance: Joi.array().items(ATTENDANCE_SCHEMA).default([]),
  materials: Joi.array().items(Joi.string().uri()).default([]),
  notes: Joi.string().allow(null, '')
})

const REMINDER_SCHEMA = Joi.object({
  type: Joi.string().valid(...Object.values(REMINDER_TYPES)).required(),
  scheduledFor: Joi.date().timestamp('javascript').required(),
  sentAt: Joi.date().timestamp('javascript').allow(null),
  status: Joi.string()
    .valid(...Object.values(REMINDER_STATUS))
    .default(REMINDER_STATUS.PENDING),
  message: Joi.string().allow(null, '')
})

const SCHEDULE_COLLECTION_SCHEMA = Joi.object({
  courseId: Joi.string().required(),
  providerId: Joi.string().required(),

  title: Joi.string().required().max(255),
  description: Joi.string().allow(null, ''),

  status: Joi.string()
    .valid(...Object.values(SCHEDULE_STATUS))
    .default(SCHEDULE_STATUS.DRAFT),

  startDate: Joi.date().timestamp('javascript').required(),
  endDate: Joi.date().timestamp('javascript').required(),
  totalSessions: Joi.number().integer().min(0).default(0),
  completedSessions: Joi.number().integer().min(0).default(0),

  location: Joi.object({
    type: Joi.string().valid(...Object.values(LOCATION_TYPES)).required(),
    address: Joi.string().allow(null, ''),
    link: Joi.string().uri().allow(null, '')
  }),

  sessions: Joi.array().items(SESSION_SCHEMA).default([]),

  reminders: Joi.array().items(REMINDER_SCHEMA).default([]),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(Date.now),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await SCHEDULE_COLLECTION_SCHEMA.validateAsync(data, {
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

    return await GET_DB().collection(SCHEDULE_COLLECTION_NAME).insertOne(validData)
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ READ ============
const findOneById = async (scheduleId) => {
  try {
    const objectId = new ObjectId(scheduleId)
    return await GET_DB().collection(SCHEDULE_COLLECTION_NAME).findOne({
      _id: objectId,
      _destroy: { $ne: true }
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const findByCourse = async (courseId) => {
  try {
    return await GET_DB().collection(SCHEDULE_COLLECTION_NAME).findOne({
      courseId: courseId,
      _destroy: { $ne: true }
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const findByProvider = async (providerId, skip = 0, limit = 10) => {
  try {
    const schedules = await GET_DB().collection(SCHEDULE_COLLECTION_NAME)
      .find({
        providerId: providerId,
        _destroy: { $ne: true }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const total = await GET_DB().collection(SCHEDULE_COLLECTION_NAME).countDocuments({
      providerId: providerId,
      _destroy: { $ne: true }
    })

    return { schedules, total }
  } catch (error) {
    throw new Error(error.message)
  }
}

const findUpcomingByUser = async (userCourseIds, fromDate = new Date(), limit = 10) => {
  try {
    const schedules = await GET_DB().collection(SCHEDULE_COLLECTION_NAME)
      .aggregate([
        {
          $match: {
            courseId: { $in: userCourseIds },
            _destroy: { $ne: true },
            status: { $in: [SCHEDULE_STATUS.PUBLISHED, SCHEDULE_STATUS.IN_PROGRESS] }
          }
        },
        { $unwind: '$sessions' },
        {
          $match: {
            'sessions.date': { $gte: fromDate },
            'sessions.status': SESSION_STATUS.SCHEDULED
          }
        },
        { $sort: { 'sessions.date': 1 } },
        { $limit: limit },
        {
          $group: {
            _id: '$_id',
            courseId: { $first: '$courseId' },
            providerId: { $first: '$providerId' },
            title: { $first: '$title' },
            status: { $first: '$status' },
            session: { $first: '$sessions' },
            location: { $first: '$location' }
          }
        }
      ])
      .toArray()

    return schedules
  } catch (error) {
    throw new Error(error.message)
  }
}

const findMySchedules = async (userCourseIds, queryParams = {}) => {
  try {
    const { page = 1, limit = 10, startDate, endDate, status } = queryParams
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const matchStage = {
      courseId: { $in: userCourseIds },
      _destroy: { $ne: true }
    }

    if (status) {
      matchStage.status = status
    }

    if (startDate || endDate) {
      matchStage.startDate = {}
      if (startDate) matchStage.startDate.$gte = new Date(startDate)
      if (endDate) matchStage.startDate.$lte = new Date(endDate)
    }

    const schedules = await GET_DB().collection(SCHEDULE_COLLECTION_NAME)
      .aggregate([
        { $match: matchStage },
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
            title: 1,
            description: 1,
            status: 1,
            startDate: 1,
            endDate: 1,
            totalSessions: 1,
            completedSessions: 1,
            location: 1,
            sessions: {
              $map: {
                input: '$sessions',
                as: 'session',
                in: {
                  _id: '$$session._id',
                  sessionNumber: '$$session.sessionNumber',
                  title: '$$session.title',
                  date: '$$session.date',
                  startTime: '$$session.startTime',
                  endTime: '$$session.endTime',
                  status: '$$session.status',
                  location: '$$session.location',
                  attendance: '$$session.attendance'
                }
              }
            },
            'course.title': 1,
            'course.slug': 1,
            'course.thumbnail': 1
          }
        },
        { $sort: { startDate: 1 } },
        { $skip: skip },
        { $limit: parseInt(limit) }
      ])
      .toArray()

    const total = await GET_DB().collection(SCHEDULE_COLLECTION_NAME).countDocuments(matchStage)

    return { schedules, total }
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ UPDATE ============
const update = async (scheduleId, data) => {
  try {
    const objectId = new ObjectId(scheduleId)
    const updateData = {
      ...data,
      updatedAt: Date.now()
    }

    const result = await GET_DB().collection(SCHEDULE_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const updateStatus = async (scheduleId, status) => {
  try {
    const objectId = new ObjectId(scheduleId)

    const result = await GET_DB().collection(SCHEDULE_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          status,
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

const addSession = async (scheduleId, sessionData) => {
  try {
    const objectId = new ObjectId(scheduleId)

    const result = await GET_DB().collection(SCHEDULE_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $push: { sessions: sessionData },
        $inc: { totalSessions: 1 },
        $set: { updatedAt: Date.now() }
      },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const updateSession = async (scheduleId, sessionNumber, sessionData) => {
  try {
    const objectId = new ObjectId(scheduleId)

    const updateFields = {}
    for (const [key, value] of Object.entries(sessionData)) {
      updateFields[`sessions.$.${key}`] = value
    }
    updateFields.updatedAt = Date.now()

    const result = await GET_DB().collection(SCHEDULE_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId, 'sessions.sessionNumber': sessionNumber },
      { $set: updateFields },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const cancelSession = async (scheduleId, sessionNumber, reason) => {
  try {
    const objectId = new ObjectId(scheduleId)

    const result = await GET_DB().collection(SCHEDULE_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId, 'sessions.sessionNumber': sessionNumber },
      {
        $set: {
          'sessions.$.status': SESSION_STATUS.CANCELLED,
          'sessions.$.notes': reason || 'Đã hủy',
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

const rescheduleSession = async (scheduleId, sessionNumber, newDate, newStartTime, newEndTime) => {
  try {
    const objectId = new ObjectId(scheduleId)

    const result = await GET_DB().collection(SCHEDULE_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId, 'sessions.sessionNumber': sessionNumber },
      {
        $set: {
          'sessions.$.date': new Date(newDate),
          'sessions.$.startTime': newStartTime,
          'sessions.$.endTime': newEndTime,
          'sessions.$.status': SESSION_STATUS.RESCHEDULED,
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

const markSessionComplete = async (scheduleId, sessionNumber) => {
  try {
    const objectId = new ObjectId(scheduleId)

    const result = await GET_DB().collection(SCHEDULE_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId, 'sessions.sessionNumber': sessionNumber },
      {
        $set: {
          'sessions.$.status': SESSION_STATUS.COMPLETED,
          updatedAt: Date.now()
        },
        $inc: { completedSessions: 1 }
      },
      { returnDocument: 'after' }
    )

    if (result) {
      const schedule = await GET_DB().collection(SCHEDULE_COLLECTION_NAME).findOne({ _id: objectId })
      if (schedule.completedSessions >= schedule.totalSessions) {
        await updateStatus(scheduleId, SCHEDULE_STATUS.COMPLETED)
      }
    }

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const recordAttendance = async (scheduleId, sessionNumber, attendanceData) => {
  try {
    const objectId = new ObjectId(scheduleId)

    const session = await GET_DB().collection(SCHEDULE_COLLECTION_NAME).findOne(
      { _id: objectId, 'sessions.sessionNumber': sessionNumber },
      { projection: { 'sessions.$': 1 } }
    )

    if (!session || !session.sessions || session.sessions.length === 0) {
      throw new Error('Session not found')
    }

    const currentAttendance = session.sessions[0].attendance || []

    const updatedAttendance = [...currentAttendance]
    for (const record of attendanceData) {
      const existingIndex = updatedAttendance.findIndex(a => a.userId === record.userId)
      if (existingIndex >= 0) {
        updatedAttendance[existingIndex] = {
          ...updatedAttendance[existingIndex],
          ...record,
          checkedAt: Date.now()
        }
      } else {
        updatedAttendance.push({
          ...record,
          checkedAt: Date.now()
        })
      }
    }

    const result = await GET_DB().collection(SCHEDULE_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId, 'sessions.sessionNumber': sessionNumber },
      {
        $set: {
          'sessions.$.attendance': updatedAttendance,
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

const getSessionAttendance = async (scheduleId, sessionNumber) => {
  try {
    const schedule = await GET_DB().collection(SCHEDULE_COLLECTION_NAME).findOne(
      { _id: new ObjectId(scheduleId), 'sessions.sessionNumber': sessionNumber },
      { projection: { 'sessions.$': 1 } }
    )

    if (!schedule || !schedule.sessions || schedule.sessions.length === 0) {
      return null
    }

    return schedule.sessions[0].attendance || []
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ DELETE ============
const deleteSchedule = async (scheduleId) => {
  try {
    const objectId = new ObjectId(scheduleId)
    return await GET_DB().collection(SCHEDULE_COLLECTION_NAME).updateOne(
      { _id: objectId },
      {
        $set: {
          _destroy: true,
          status: SCHEDULE_STATUS.CANCELLED,
          updatedAt: Date.now()
        }
      }
    )
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ STATS ============
const getStatsByProvider = async (providerId) => {
  try {
    const pipeline = [
      { $match: { providerId: providerId, _destroy: { $ne: true } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalSessions: { $sum: '$totalSessions' }
        }
      }
    ]

    const stats = await GET_DB().collection(SCHEDULE_COLLECTION_NAME).aggregate(pipeline).toArray()

    const result = {
      total: 0,
      byStatus: {}
    }

    stats.forEach(stat => {
      result.byStatus[stat._id] = { count: stat.count, totalSessions: stat.totalSessions }
      result.total += stat.count
    })

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

export const scheduleModel = {
  SCHEDULE_COLLECTION_NAME,
  SCHEDULE_COLLECTION_SCHEMA,

  // Create
  createNew,

  // Read
  findOneById,
  findByCourse,
  findByProvider,
  findUpcomingByUser,
  findMySchedules,

  // Update
  update,
  updateStatus,
  addSession,
  updateSession,
  cancelSession,
  rescheduleSession,
  markSessionComplete,
  recordAttendance,
  getSessionAttendance,

  // Delete
  deleteSchedule,

  // Stats
  getStatsByProvider
}
