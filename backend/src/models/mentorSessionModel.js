import mongoose from 'mongoose'

const MENTOR_SESSION_COLLECTION_NAME = 'mentor_sessions'

const mentorSessionSchema = new mongoose.Schema(
  {
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mentor',
      required: true,
      index: true,
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Worker',
      required: true,
      index: true,
    },
    scheduledAt: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number,
      default: 60,
      min: 15,
      max: 180,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'],
      default: 'pending',
      index: true,
    },
    topic: {
      type: String,
      maxlength: 500,
    },
    notes: {
      type: String,
      maxlength: 2000,
    },
    meetingLink: {
      type: String,
      maxlength: 500,
    },
    workerRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    workerFeedback: {
      type: String,
      maxlength: 1000,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Worker',
    },
    cancelReason: {
      type: String,
      maxlength: 500,
    },
    _destroy: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
)

mentorSessionSchema.index({ mentorId: 1, status: 1, scheduledAt: -1 })
mentorSessionSchema.index({ workerId: 1, status: 1, scheduledAt: -1 })
mentorSessionSchema.index({ scheduledAt: 1, status: 1 })

const createNew = async (data) => {
  return await mongoose.model(MENTOR_SESSION_COLLECTION_NAME).create(data)
}

const findByWorker = async (workerId, filters = {}, skip = 0, limit = 20) => {
  const query = { workerId, _destroy: { $ne: true }, ...filters }
  const [sessions, total] = await Promise.all([
    mongoose.model(MENTOR_SESSION_COLLECTION_NAME)
      .find(query)
      .populate('mentorId', 'userId expertise')
      .populate('mentorId.userId', 'name avatar bio')
      .sort({ scheduledAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    mongoose.model(MENTOR_SESSION_COLLECTION_NAME).countDocuments(query),
  ])
  return { sessions, total }
}

const findByMentor = async (mentorId, filters = {}, skip = 0, limit = 20) => {
  const query = { mentorId, _destroy: { $ne: true }, ...filters }
  const [sessions, total] = await Promise.all([
    mongoose.model(MENTOR_SESSION_COLLECTION_NAME)
      .find(query)
      .populate('workerId', 'name avatar')
      .sort({ scheduledAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    mongoose.model(MENTOR_SESSION_COLLECTION_NAME).countDocuments(query),
  ])
  return { sessions, total }
}

const findById = async (sessionId) => {
  return await mongoose.model(MENTOR_SESSION_COLLECTION_NAME).findOne({ _id: sessionId, _destroy: { $ne: true } })
}

const updateStatus = async (sessionId, data) => {
  return await mongoose.model(MENTOR_SESSION_COLLECTION_NAME).findOneAndUpdate(
    { _id: sessionId, _destroy: { $ne: true } },
    { $set: { ...data, updatedAt: new Date() } },
    { returnDocument: 'after' }
  )
}

const getUpcomingForWorker = async (workerId, limit = 5) => {
  return await mongoose.model(MENTOR_SESSION_COLLECTION_NAME)
    .find({
      workerId,
      status: { $in: ['pending', 'confirmed'] },
      scheduledAt: { $gte: new Date() },
      _destroy: { $ne: true },
    })
    .populate('mentorId', 'userId expertise')
    .populate('mentorId.userId', 'name avatar bio')
    .sort({ scheduledAt: 1 })
    .limit(limit)
    .lean()
}

export const mentorSessionModel = mongoose.model(MENTOR_SESSION_COLLECTION_NAME, mentorSessionSchema)

export const mentorSessionRepository = {
  createNew,
  findByWorker,
  findByMentor,
  findById,
  updateStatus,
  getUpcomingForWorker,
}
