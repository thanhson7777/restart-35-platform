import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import {
  RECRUITMENT_JOB_STATUS,
  JOB_TYPES,
  JOB_LOCATION_TYPE,
  INTERVIEW_MEETING_TYPE
} from '~/utils/constants'

const RECRUITMENT_JOB_COLLECTION_NAME = 'recruitment_jobs'
const RECRUITMENT_JOB_COLLECTION_SCHEMA = Joi.object({
  // Enterprise Info
  enterpriseId: Joi.string().required(),
  enterpriseInfo: Joi.object({
    name: Joi.string().required(),
    logo: Joi.string().allow('', null),
    industry: Joi.string().allow('', null),
    size: Joi.string().allow('', null),
    verified: Joi.boolean().default(false)
  }),

  // Job Basic Info
  job: Joi.object({
    title: Joi.string().required().max(255),
    description: Joi.string().required().max(5000),
    requirements: Joi.array().items(Joi.string()).default([]),
    benefits: Joi.array().items(Joi.string()).default([]),
    salary: Joi.object({
      min: Joi.number().integer().min(0).allow(null),
      max: Joi.number().integer().min(0).allow(null),
      negotiable: Joi.boolean().default(false),
      currency: Joi.string().default('VND')
    }).default({}),
    type: Joi.string()
      .valid(...Object.values(JOB_TYPES))
      .required(),
    quantity: Joi.number().integer().min(1).max(100).default(1),
    gender: Joi.string().valid('male', 'female', 'any').default('any'),
    ageRange: Joi.object({
      min: Joi.number().integer().min(18).max(65).allow(null),
      max: Joi.number().integer().min(18).max(65).allow(null)
    }).default({}),
    workingHours: Joi.string().allow('', null),
    category: Joi.string().allow('', null)
  }).required(),

  // Requirements
  requirements: Joi.object({
    education: Joi.string().allow('', null),
    experience: Joi.number().integer().min(0).max(50).default(0),
    skills: Joi.array().items(Joi.string()).default([]),
    certifications: Joi.array().items(Joi.string()).default([]),
    languages: Joi.array().items(Joi.string()).default([])
  }).default({}),

  // Location
  location: Joi.object({
    address: Joi.string().required(),
    province: Joi.string().required(),
    district: Joi.string().allow('', null),
    ward: Joi.string().allow('', null),
    type: Joi.string()
      .valid(...Object.values(JOB_LOCATION_TYPE))
      .default(JOB_LOCATION_TYPE.ONSITE),
    coordinates: Joi.object({
      lat: Joi.number().allow(null),
      lng: Joi.number().allow(null)
    }).default({})
  }).required(),

  // Interview Config
  interviewConfig: Joi.object({
    meetingType: Joi.string()
      .valid(...Object.values(INTERVIEW_MEETING_TYPE))
      .default(INTERVIEW_MEETING_TYPE.GOOGLE_MEET),
    officeAddress: Joi.string().allow('', null),
    onlineLink: Joi.string().allow('', null),
    duration: Joi.number().integer().min(15).max(180).default(60),
    allowReschedule: Joi.boolean().default(true),
    maxReschedules: Joi.number().integer().min(0).max(5).default(2),
    reminderMinutes: Joi.number().integer().min(15).max(1440).default(60),
    suggestedSlots: Joi.array().items(
      Joi.object({
        dayOfWeek: Joi.number().integer().min(0).max(6),
        startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      })
    ).default([])
  }).default({}),

  // Target Courses (optional linking to courses)
  targetCourses: Joi.array().items(
    Joi.string()
  ).default([]),

  // Hiring Bonus (optional)
  hiringBonus: Joi.object({
    enabled: Joi.boolean().default(false),
    amount: Joi.number().integer().min(0).allow(null),
    payoutCondition: Joi.string()
      .valid('on_hire', 'on_probation_complete')
      .allow(null)
  }).default({}),

  // Stats
  stats: Joi.object({
    views: Joi.number().integer().min(0).default(0),
    applications: Joi.number().integer().min(0).default(0),
    shortlisted: Joi.number().integer().min(0).default(0),
    interviews: Joi.number().integer().min(0).default(0),
    hires: Joi.number().integer().min(0).default(0)
  }).default({}),

  // Status & Metadata
  status: Joi.string()
    .valid(...Object.values(RECRUITMENT_JOB_STATUS))
    .default(RECRUITMENT_JOB_STATUS.DRAFT),
  deadline: Joi.date().timestamp('javascript').allow(null),
  rejectionReason: Joi.string().allow('', null),
  publishedAt: Joi.date().timestamp('javascript').allow(null),

  // Timestamps
  createdAt: Joi.date().timestamp('javascript').default(Date.now()),
  updatedAt: Joi.date().timestamp('javascript').default(Date.now()),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await RECRUITMENT_JOB_COLLECTION_SCHEMA.validateAsync(data, {
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

    return await GET_DB().collection(RECRUITMENT_JOB_COLLECTION_NAME).insertOne(validData)
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ READ ============
const findOneById = async (jobId) => {
  try {
    const objectId = new ObjectId(jobId)
    return await GET_DB().collection(RECRUITMENT_JOB_COLLECTION_NAME).findOne({
      _id: objectId,
      _destroy: { $ne: true }
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const findOneByIdAndEnterprise = async (jobId, enterpriseId) => {
  try {
    const objectId = new ObjectId(jobId)
    return await GET_DB().collection(RECRUITMENT_JOB_COLLECTION_NAME).findOne({
      _id: objectId,
      enterpriseId: enterpriseId,
      _destroy: { $ne: true }
    })
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

    const jobs = await GET_DB().collection(RECRUITMENT_JOB_COLLECTION_NAME)
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const total = await GET_DB().collection(RECRUITMENT_JOB_COLLECTION_NAME).countDocuments(query)

    return { jobs, total }
  } catch (error) {
    throw new Error(error.message)
  }
}

const findPublished = async (skip = 0, limit = 10, filters = {}) => {
  try {
    const query = {
      status: RECRUITMENT_JOB_STATUS.PUBLISHED,
      _destroy: { $ne: true },
      ...filters
    }

    const jobs = await GET_DB().collection(RECRUITMENT_JOB_COLLECTION_NAME)
      .find(query)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const total = await GET_DB().collection(RECRUITMENT_JOB_COLLECTION_NAME).countDocuments(query)

    return { jobs, total }
  } catch (error) {
    throw new Error(error.message)
  }
}

const findPendingApproval = async (skip = 0, limit = 10, filters = {}) => {
  try {
    const query = {
      status: RECRUITMENT_JOB_STATUS.PENDING_APPROVAL,
      _destroy: { $ne: true },
      ...filters
    }

    const jobs = await GET_DB().collection(RECRUITMENT_JOB_COLLECTION_NAME)
      .find(query)
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const total = await GET_DB().collection(RECRUITMENT_JOB_COLLECTION_NAME).countDocuments(query)

    return { jobs, total }
  } catch (error) {
    throw new Error(error.message)
  }
}

const findRejected = async (enterpriseId, skip = 0, limit = 10) => {
  try {
    const query = {
      enterpriseId: enterpriseId,
      _destroy: { $ne: true },
      status: RECRUITMENT_JOB_STATUS.CLOSED,
      rejectionReason: { $ne: null, $ne: '' }
    }

    const jobs = await GET_DB().collection(RECRUITMENT_JOB_COLLECTION_NAME)
      .find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const total = await GET_DB().collection(RECRUITMENT_JOB_COLLECTION_NAME).countDocuments(query)

    return { jobs, total }
  } catch (error) {
    throw new Error(error.message)
  }
}

const findById = async (jobId) => {
  try {
    const objectId = new ObjectId(jobId)
    return await GET_DB().collection(RECRUITMENT_JOB_COLLECTION_NAME).findOne({
      _id: objectId,
      _destroy: { $ne: true }
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ UPDATE ============
const update = async (jobId, data) => {
  try {
    const objectId = new ObjectId(jobId)
    const updateData = {
      ...data,
      updatedAt: Date.now()
    }

    const result = await GET_DB().collection(RECRUITMENT_JOB_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const updateStatus = async (jobId, status, additionalData = {}) => {
  try {
    const objectId = new ObjectId(jobId)
    const updateData = {
      status: status,
      updatedAt: Date.now(),
      ...additionalData
    }

    if (status === RECRUITMENT_JOB_STATUS.PUBLISHED) {
      updateData.publishedAt = Date.now()
    }

    const result = await GET_DB().collection(RECRUITMENT_JOB_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const submitForApproval = async (jobId, enterpriseId) => {
  try {
    const objectId = new ObjectId(jobId)
    const job = await findOneByIdAndEnterprise(jobId, enterpriseId)

    if (!job) {
      throw new Error('Không tìm thấy tin tuyển dụng')
    }

    if (job.status !== RECRUITMENT_JOB_STATUS.DRAFT) {
      throw new Error('Chỉ có thể gửi tin ở trạng thái nháp')
    }

    const result = await GET_DB().collection(RECRUITMENT_JOB_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          status: RECRUITMENT_JOB_STATUS.PENDING_APPROVAL,
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

const approveJob = async (jobId) => {
  try {
    const objectId = new ObjectId(jobId)
    const job = await findOneById(jobId)

    if (!job) {
      throw new Error('Không tìm thấy tin tuyển dụng')
    }

    if (job.status !== RECRUITMENT_JOB_STATUS.PENDING_APPROVAL) {
      throw new Error('Tin tuyển dụng không ở trạng thái chờ duyệt')
    }

    const result = await GET_DB().collection(RECRUITMENT_JOB_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          status: RECRUITMENT_JOB_STATUS.PUBLISHED,
          rejectionReason: null,
          publishedAt: Date.now(),
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

const rejectJob = async (jobId, reason) => {
  try {
    const objectId = new ObjectId(jobId)
    const job = await findOneById(jobId)

    if (!job) {
      throw new Error('Không tìm thấy tin tuyển dụng')
    }

    if (job.status !== RECRUITMENT_JOB_STATUS.PENDING_APPROVAL) {
      throw new Error('Tin tuyển dụng không ở trạng thái chờ duyệt')
    }

    const result = await GET_DB().collection(RECRUITMENT_JOB_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          status: RECRUITMENT_JOB_STATUS.CLOSED,
          rejectionReason: reason,
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

const closeJob = async (jobId, enterpriseId) => {
  try {
    const objectId = new ObjectId(jobId)
    const job = await findOneByIdAndEnterprise(jobId, enterpriseId)

    if (!job) {
      throw new Error('Không tìm thấy tin tuyển dụng')
    }

    const result = await GET_DB().collection(RECRUITMENT_JOB_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          status: RECRUITMENT_JOB_STATUS.CLOSED,
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

// ============ STATS ============
const incrementStats = async (jobId, field) => {
  try {
    const objectId = new ObjectId(jobId)
    const result = await GET_DB().collection(RECRUITMENT_JOB_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $inc: { [`stats.${field}`]: 1 },
        $set: { updatedAt: Date.now() }
      },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const getStats = async (jobId) => {
  try {
    const job = await findOneById(jobId)
    return job?.stats || {}
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ DELETE ============
const deleteJob = async (jobId, enterpriseId) => {
  try {
    const objectId = new ObjectId(jobId)
    const job = await findOneByIdAndEnterprise(jobId, enterpriseId)

    if (!job) {
      throw new Error('Không tìm thấy tin tuyển dụng')
    }

    if (job.status === RECRUITMENT_JOB_STATUS.PUBLISHED) {
      throw new Error('Không thể xóa tin đã đăng')
    }

    const result = await GET_DB().collection(RECRUITMENT_JOB_COLLECTION_NAME).updateOne(
      { _id: objectId },
      {
        $set: {
          _destroy: true,
          updatedAt: Date.now()
        }
      }
    )

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const findMapData = async () => {
  try {
    const jobs = await GET_DB().collection(RECRUITMENT_JOB_COLLECTION_NAME)
      .find({
        status: RECRUITMENT_JOB_STATUS.PUBLISHED,
        _destroy: { $ne: true },
        'location.coordinates.lat': { $exists: true },
        'location.coordinates.lng': { $exists: true }
      })
      .project({
        _id: 1,
        title: '$job.title',
        'location.province': 1,
        'location.address': 1,
        'location.coordinates': 1,
        'enterpriseInfo.name': 1,
        'job.salary': 1,
        'job.type': 1,
        publishedAt: 1
      })
      .toArray()
    return jobs
  } catch (error) {
    throw new Error(error.message)
  }
}

const findSimilar = async (excludeJobId, criteria = {}, limit = 5) => {
  try {
    const objectId = new ObjectId(excludeJobId)
    const conditions = [{ _id: { $ne: objectId } }, { status: RECRUITMENT_JOB_STATUS.PUBLISHED }, { _destroy: { $ne: true } }]

    if (criteria.province) {
      conditions.push({ 'location.province': criteria.province })
    }
    if (criteria.type) {
      conditions.push({ 'job.type': criteria.type })
    }
    if (criteria.category) {
      conditions.push({ 'job.category': criteria.category })
    }

    const jobs = await GET_DB().collection(RECRUITMENT_JOB_COLLECTION_NAME)
      .find({ $and: conditions })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .toArray()
    return jobs
  } catch (error) {
    throw new Error(error.message)
  }
}

const findRecommended = async (skills = [], skip = 0, limit = 10) => {
  try {
    let query = { status: RECRUITMENT_JOB_STATUS.PUBLISHED, _destroy: { $ne: true } }

    if (skills && skills.length > 0) {
      query['requirements.skills'] = { $in: skills }
    }

    const jobs = await GET_DB().collection(RECRUITMENT_JOB_COLLECTION_NAME)
      .find(query)
      .sort({ 'stats.views': -1, publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const total = await GET_DB().collection(RECRUITMENT_JOB_COLLECTION_NAME).countDocuments(query)
    return { jobs, total }
  } catch (error) {
    throw new Error(error.message)
  }
}

export const recruitmentJobModel = {
  RECRUITMENT_JOB_COLLECTION_NAME,
  RECRUITMENT_JOB_COLLECTION_SCHEMA,
  RECRUITMENT_JOB_STATUS,

  // Create
  createNew,

  // Read
  findOneById,
  findOneByIdAndEnterprise,
  findByEnterprise,
  findPublished,
  findPendingApproval,
  findRejected,
  findById,

  // Update
  update,
  updateStatus,
  submitForApproval,
  approveJob,
  rejectJob,
  closeJob,

  // Stats
  incrementStats,
  getStats,

  // Delete
  deleteJob,

  // Helpers
  validateBeforeCreate,

  // Public helpers
  findMapData,
  findSimilar,
  findRecommended
}
