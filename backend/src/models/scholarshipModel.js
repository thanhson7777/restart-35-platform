import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import {
  SCHOLARSHIP_STATUS,
  SCHOLARSHIP_COVERAGE
} from '~/utils/constants'

const SCHOLARSHIP_COLLECTION_NAME = 'scholarships'
const SCHOLARSHIP_COLLECTION_SCHEMA = Joi.object({
  // NGO & Basic Info
  ngoId: Joi.string().required(),
  title: Joi.string().required().max(200),
  description: Joi.string().max(5000).allow('', null),
  thumbnail: Joi.string().allow('', null),

  // Financial
  budget: Joi.number().integer().min(0).required(),
  spent: Joi.number().integer().min(0).default(0),
  remaining: Joi.number().integer().min(0).default(0),
  amountPerRecipient: Joi.number().integer().min(0).required(),

  // Eligibility Criteria
  eligibilityCriteria: Joi.object({
    ageMin: Joi.number().integer().min(18).max(65).default(35),
    ageMax: Joi.number().integer().min(35).max(100).default(65),
    maxIncome: Joi.number().integer().min(0).allow(null),
    provinces: Joi.array().items(Joi.string()).default([]),
    targetSkills: Joi.array().items(Joi.string()).default([]),
    education: Joi.array().items(Joi.string()).default([]),
    employmentStatus: Joi.array().items(
      Joi.string().valid('unemployed', 'underemployed', 'employed', 'retired')
    ).default([])
  }),

  // Linked Courses
  linkedCourses: Joi.array().items(
    Joi.object({
      courseId: Joi.string().required(),
      coverage: Joi.string()
        .valid(...Object.values(SCHOLARSHIP_COVERAGE))
        .default(SCHOLARSHIP_COVERAGE.PARTIAL),
      maxAmount: Joi.number().integer().min(0)
    })
  ).default([]),

  // Categories
  categories: Joi.array().items(Joi.string()).default([]),

  // Application Period
  applicationPeriod: Joi.object({
    startDate: Joi.date().timestamp('javascript'),
    endDate: Joi.date().timestamp('javascript')
  }),

  // Disbursement Period
  disbursementPeriod: Joi.object({
    startDate: Joi.date().timestamp('javascript'),
    endDate: Joi.date().timestamp('javascript')
  }),

  // Limits
  maxRecipients: Joi.number().integer().min(1).required(),
  currentRecipients: Joi.number().integer().min(0).default(0),

  // Settings
  status: Joi.string()
    .valid(...Object.values(SCHOLARSHIP_STATUS))
    .default(SCHOLARSHIP_STATUS.DRAFT),
  autoApprove: Joi.boolean().default(false),
  allowAppeals: Joi.boolean().default(true),

  // Metadata
  createdAt: Joi.date().timestamp('javascript').default(Date.now()),
  updatedAt: Joi.date().timestamp('javascript').default(Date.now()),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await SCHOLARSHIP_COLLECTION_SCHEMA.validateAsync(data, {
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

    return await GET_DB().collection(SCHOLARSHIP_COLLECTION_NAME).insertOne(validData)
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ READ ============
const findOneById = async (scholarshipId) => {
  try {
    const objectId = new ObjectId(scholarshipId)
    return await GET_DB().collection(SCHOLARSHIP_COLLECTION_NAME).findOne({
      _id: objectId,
      _destroy: { $ne: true }
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const findOneByIdAndNgo = async (scholarshipId, ngoId) => {
  try {
    const objectId = new ObjectId(scholarshipId)
    return await GET_DB().collection(SCHOLARSHIP_COLLECTION_NAME).findOne({
      _id: objectId,
      ngoId: ngoId,
      _destroy: { $ne: true }
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const findByNgo = async (ngoId, skip = 0, limit = 10, filters = {}) => {
  try {
    const query = {
      ngoId: ngoId,
      _destroy: { $ne: true },
      ...filters
    }

    const scholarships = await GET_DB().collection(SCHOLARSHIP_COLLECTION_NAME)
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const totalScholarships = await GET_DB().collection(SCHOLARSHIP_COLLECTION_NAME).countDocuments(query)

    return { scholarships, totalScholarships }
  } catch (error) {
    throw new Error(error.message)
  }
}

const findActive = async (skip = 0, limit = 10, filters = {}) => {
  try {
    const query = {
      status: SCHOLARSHIP_STATUS.ACTIVE,
      _destroy: { $ne: true },
      ...filters
    }

    const scholarships = await GET_DB().collection(SCHOLARSHIP_COLLECTION_NAME)
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const totalScholarships = await GET_DB().collection(SCHOLARSHIP_COLLECTION_NAME).countDocuments(query)

    return { scholarships, totalScholarships }
  } catch (error) {
    throw new Error(error.message)
  }
}

const findEligibleForUser = async (userProfile, skip = 0, limit = 10) => {
  try {
    const { basicInfo } = userProfile

    const scholarships = await GET_DB().collection(SCHOLARSHIP_COLLECTION_NAME)
      .find({
        status: SCHOLARSHIP_STATUS.ACTIVE,
        _destroy: { $ne: true },
        $expr: {
          $and: [
            { $lte: ['$eligibilityCriteria.ageMin', basicInfo.age] },
            { $gte: ['$eligibilityCriteria.ageMax', basicInfo.age] },
            {
              $or: [
                { $eq: [{ $size: '$eligibilityCriteria.provinces' }, 0] },
                { $in: [basicInfo.province, '$eligibilityCriteria.provinces'] }
              ]
            }
          ]
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const totalScholarships = await GET_DB().collection(SCHOLARSHIP_COLLECTION_NAME).countDocuments({
      status: SCHOLARSHIP_STATUS.ACTIVE,
      _destroy: { $ne: true }
    })

    return { scholarships, totalScholarships }
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

    const scholarships = await GET_DB().collection(SCHOLARSHIP_COLLECTION_NAME)
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const totalScholarships = await GET_DB().collection(SCHOLARSHIP_COLLECTION_NAME).countDocuments(query)

    return { scholarships, totalScholarships }
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ UPDATE ============
const update = async (scholarshipId, data) => {
  try {
    const objectId = new ObjectId(scholarshipId)
    const updateData = {
      ...data,
      updatedAt: Date.now()
    }

    const result = await GET_DB().collection(SCHOLARSHIP_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const updateStatus = async (scholarshipId, status) => {
  try {
    const objectId = new ObjectId(scholarshipId)

    const result = await GET_DB().collection(SCHOLARSHIP_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          status: status,
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

const incrementRecipients = async (scholarshipId, amount) => {
  try {
    const objectId = new ObjectId(scholarshipId)

    const result = await GET_DB().collection(SCHOLARSHIP_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $inc: {
          currentRecipients: 1,
          spent: amount,
          remaining: -amount
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

const decrementRecipients = async (scholarshipId, amount) => {
  try {
    const objectId = new ObjectId(scholarshipId)

    const result = await GET_DB().collection(SCHOLARSHIP_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $inc: {
          currentRecipients: -1,
          spent: -amount,
          remaining: amount
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

const addLinkedCourse = async (scholarshipId, courseData) => {
  try {
    const objectId = new ObjectId(scholarshipId)

    const result = await GET_DB().collection(SCHOLARSHIP_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $push: {
          linkedCourses: courseData
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

const removeLinkedCourse = async (scholarshipId, courseId) => {
  try {
    const objectId = new ObjectId(scholarshipId)

    const result = await GET_DB().collection(SCHOLARSHIP_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $pull: {
          linkedCourses: { courseId: courseId }
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

// ============ DELETE ============
const deleteScholarship = async (scholarshipId) => {
  try {
    const objectId = new ObjectId(scholarshipId)
    return await GET_DB().collection(SCHOLARSHIP_COLLECTION_NAME).updateOne(
      { _id: objectId },
      {
        $set: {
          _destroy: true,
          status: SCHOLARSHIP_STATUS.ARCHIVED,
          updatedAt: Date.now()
        }
      }
    )
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ AGGREGATE ============
const getStatsByNgo = async (ngoId) => {
  try {
    const pipeline = [
      {
        $match: {
          ngoId: ngoId,
          _destroy: { $ne: true }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalBudget: { $sum: '$budget' },
          totalSpent: { $sum: '$spent' },
          totalRemaining: { $sum: '$remaining' }
        }
      }
    ]

    const stats = await GET_DB().collection(SCHOLARSHIP_COLLECTION_NAME).aggregate(pipeline).toArray()

    const result = {
      total: 0,
      active: 0,
      paused: 0,
      exhausted: 0,
      byStatus: {},
      totalBudget: 0,
      totalSpent: 0,
      totalRemaining: 0
    }

    stats.forEach(stat => {
      result.byStatus[stat._id] = stat.count
      result.total += stat.count
      if (stat._id === SCHOLARSHIP_STATUS.ACTIVE) result.active = stat.count
      if (stat._id === SCHOLARSHIP_STATUS.PAUSED) result.paused = stat.count
      if (stat._id === SCHOLARSHIP_STATUS.EXHAUSTED) result.exhausted = stat.count
      result.totalBudget += stat.totalBudget
      result.totalSpent += stat.totalSpent
      result.totalRemaining += stat.totalRemaining
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
          totalBudget: { $sum: '$budget' },
          totalSpent: { $sum: '$spent' }
        }
      }
    ]

    const stats = await GET_DB().collection(SCHOLARSHIP_COLLECTION_NAME).aggregate(pipeline).toArray()

    const result = {
      total: 0,
      byStatus: {},
      totalBudget: 0,
      totalSpent: 0,
      totalRecipients: 0
    }

    const totalScholarships = await GET_DB().collection(SCHOLARSHIP_COLLECTION_NAME).countDocuments({
      _destroy: { $ne: true }
    })
    result.total = totalScholarships

    stats.forEach(stat => {
      result.byStatus[stat._id] = stat.count
      result.totalBudget += stat.totalBudget
      result.totalSpent += stat.totalSpent
    })

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ HELPERS ============
const validateEligibility = (profile, criteria) => {
  const errors = []

  if (!profile.basicInfo) {
    errors.push('Hồ sơ không đầy đủ thông tin')
    return { eligible: false, errors }
  }

  const { basicInfo, aspirations, employmentHistory } = profile

  if (basicInfo.age < criteria.ageMin || basicInfo.age > criteria.ageMax) {
    errors.push(`Độ tuổi phải từ ${criteria.ageMin} đến ${criteria.ageMax}`)
  }

  if (criteria.provinces?.length > 0 && basicInfo.province) {
    if (!criteria.provinces.includes(basicInfo.province)) {
      errors.push('Địa điểm không nằm trong phạm vi được hỗ trợ')
    }
  }

  if (criteria.targetSkills?.length > 0) {
    const allSkills = [
      ...(aspirations?.skills || []),
      ...(employmentHistory?.flatMap(h => h.skills || []) || [])
    ]
    const hasMatchingSkill = criteria.targetSkills.some(skill =>
      allSkills.some(s => s.toLowerCase().includes(skill.toLowerCase()))
    )
    if (!hasMatchingSkill) {
      errors.push('Không có kỹ năng phù hợp với chương trình')
    }
  }

  if (criteria.education?.length > 0 && basicInfo.education) {
    if (!criteria.education.includes(basicInfo.education)) {
      errors.push('Bằng cấp không phù hợp với yêu cầu')
    }
  }

  return {
    eligible: errors.length === 0,
    errors
  }
}

const checkAvailability = async (scholarshipId) => {
  try {
    const scholarship = await findOneById(scholarshipId)
    if (!scholarship) {
      return { available: false, reason: 'Không tìm thấy học bổng' }
    }

    if (scholarship.status !== SCHOLARSHIP_STATUS.ACTIVE) {
      return { available: false, reason: 'Học bổng không còn hoạt động' }
    }

    if (scholarship.currentRecipients >= scholarship.maxRecipients) {
      return { available: false, reason: 'Đã đạt số lượng người nhận tối đa' }
    }

    if (scholarship.remaining <= 0) {
      return { available: false, reason: 'Ngân sách đã hết' }
    }

    const now = new Date()
    if (scholarship.applicationPeriod?.endDate) {
      if (now > new Date(scholarship.applicationPeriod.endDate)) {
        return { available: false, reason: 'Đã hết hạn nộp đơn' }
      }
    }

    return {
      available: true,
      remaining: scholarship.remaining,
      slotsAvailable: scholarship.maxRecipients - scholarship.currentRecipients
    }
  } catch (error) {
    throw new Error(error.message)
  }
}

export const scholarshipModel = {
  SCHOLARSHIP_COLLECTION_NAME,
  SCHOLARSHIP_COLLECTION_SCHEMA,

  // Create
  createNew,

  // Read
  findOneById,
  findOneByIdAndNgo,
  findByNgo,
  findActive,
  findEligibleForUser,
  findAll,

  // Update
  update,
  updateStatus,
  incrementRecipients,
  decrementRecipients,
  addLinkedCourse,
  removeLinkedCourse,

  // Delete
  deleteScholarship,

  // Aggregate
  getStatsByNgo,
  getOverallStats,

  // Helpers
  validateEligibility,
  checkAvailability
}
