import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import {
  COURSE_STATUS, DURATION_UNITS, LOCATION_TYPES,
  COURSE_DELIVERY_TYPES, COURSE_FUNDING_MODELS,
  ORGANIZATION_TYPES
} from '~/utils/constants'
import {
  OBJECT_ID_RULE,
  OBJECT_ID_RULE_MESSAGE
} from '~/utils/validator'

const COURSE_COLLECTION_NAME = 'courses'
const COURSE_COLLECTION_SCHEMA = Joi.object({
  // Thong tin co ban
  title: Joi.string().required().trim().strict().min(3).max(255),
  slug: Joi.string().required().trim().strict().min(3).max(255),
  description: Joi.string().required().trim().strict().min(3).max(5000),
  shortDescription: Joi.string().required().trim().strict().max(500),
  thumbnail: Joi.string().uri().allow(null, ''),
  // Danh muc va Trung tâm
  categoryId: Joi.string().required(),
  providerId: Joi.string().required(),
  // Thong tin khoa hoc
  duration: Joi.object({
    value: Joi.number().required().min(1),
    unit: Joi.string().valid(...Object.values(DURATION_UNITS)).required()
  }),
  // Lịch học tự động
  scheduleConfig: Joi.object({
    totalSessions: Joi.number().integer().min(1).required(),
    sessionsPerWeek: Joi.number().integer().min(1).required(),
    sessionDurationMinutes: Joi.number().integer().min(30).default(90),
    preferredDays: Joi.array().items(
      Joi.string().valid('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
    ).default([]),
    preferredTime: Joi.string().valid('Morning', 'Afternoon', 'Evening').allow(null, ''),
    expectedStartDate: Joi.date().timestamp('javascript').allow(null, '')
  }).allow(null),
  location: Joi.object({
    type: Joi.string().valid(...Object.values(LOCATION_TYPES)).required(),
    address: Joi.string().allow(null, ''),
    link: Joi.string().uri().allow(null, ''),
    coordinates: Joi.object({
      lat: Joi.number().allow(null),
      lng: Joi.number().allow(null)
    }).allow(null)
  }),
  // Hinh thuc giao duc & mo hinh tai chinh
  delivery_type: Joi.string()
    .valid(...Object.values(COURSE_DELIVERY_TYPES))
    .default(COURSE_DELIVERY_TYPES.VIDEO),
  fundingConfig: Joi.object({
    type: Joi.string().valid('FREE', 'PAID', 'SPONSORED').default('FREE'),
    price: Joi.number().min(0).default(0),
    sponsorIds: Joi.array().items(Joi.string()).default([]),
    hasJobGuarantee: Joi.boolean().default(false),
    acceptsSponsorship: Joi.boolean().default(true)
  }).default({
    type: 'FREE',
    price: 0,
    sponsorIds: [],
    hasJobGuarantee: false,
    acceptsSponsorship: true
  }),
  isFree: Joi.boolean().default(true),
  fee: Joi.number().min(0).default(0),
  // Tuyen sinh
  maxStudents: Joi.number().integer().min(1).default(30),
  enrollmentStartDate: Joi.date().timestamp('javascript').allow(null, ''),
  // Nội dung
  skills: Joi.array()
    .items(Joi.string().min(2).max(100))
    .max(20)
    .default([]),
  syllabus: Joi.array().items(
    Joi.object({
      _id: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE).default(() => new ObjectId().toString()),
      week: Joi.number().required(),
      title: Joi.string().required(),
      content: Joi.string().allow('', null),
      duration: Joi.string().allow('', null),
      fileUrl: Joi.string().uri().allow('', null),
      fileName: Joi.string().allow('', null),
      videoUrl: Joi.string().allow('', null),
      videoDuration: Joi.number().integer().min(0).allow(null).default(0)
    })
  ).max(50),
  certificate: Joi.string().allow(''),
  outcomes: Joi.array()
    .items(Joi.string().min(2).max(200))
    .max(20)
    .default([]),
  // Đánh giá
  rating: Joi.object({
    average: Joi.number().min(0).max(5).default(0),
    count: Joi.number().integer().min(0).default(0)
  }),
  // Trạng thái & duyệt
  status: Joi.string().valid(...Object.values(COURSE_STATUS)).default(COURSE_STATUS.DRAFT),
  rejectionReason: Joi.string().allow(null, ''),
  approvedBy: Joi.string().allow(null),
  approvedAt: Joi.date().timestamp().allow(null),
  funding_model: Joi.string().valid(...Object.values(COURSE_FUNDING_MODELS)).allow('', null).default(COURSE_FUNDING_MODELS.FREE),
  sponsorship: Joi.object({
    hasSponsorship: Joi.boolean().default(false),
    sponsorTypes: Joi.array().items(Joi.string().valid(...Object.values(ORGANIZATION_TYPES))).default([]),
    activeSponsorshipIds: Joi.array().items(Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)).default([]),
    priorityRecruitment: Joi.boolean().default(false),
    badgeLabel: Joi.string().allow('', null).default(null)
  }).default({
    hasSponsorship: false,
    sponsorTypes: [],
    activeSponsorshipIds: [],
    priorityRecruitment: false,
    badgeLabel: null
  }),
  // Metadata
  viewCount: Joi.number().integer().min(0).default(0),
  enrollmentCount: Joi.number().integer().min(0).default(0),
  linkedPartnershipId: Joi.string().pattern(OBJECT_ID_RULE).allow(null, '').default(null),
  linkedEnterpriseId: Joi.string().pattern(OBJECT_ID_RULE).allow(null, '').default(null),
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(Date.now),
  _destroy: Joi.boolean().default(false)
})

// Helper tạo slug
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 200)
}

// Helper tạo slug unique
const createUniqueSlug = async (title) => {
  let baseSlug = generateSlug(title)
  let uniqueSlug = baseSlug
  let counter = 1

  while (await GET_DB().collection(COURSE_COLLECTION_NAME).findOne({ slug: uniqueSlug, _destroy: { $ne: true } })) {
    uniqueSlug = `${baseSlug}-${counter}`
    counter++
  }

  return uniqueSlug
}

// Validate before create
const validateBeforeCreate = async (data) => {
  return await COURSE_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
    stripUnknown: true
  })
}

// ============ CREATE ============
const createNew = async (data, skipValidation = false) => {
  try {
    if (!data.slug && data.title) {
      data.slug = await createUniqueSlug(data.title)
    }
    const validData = skipValidation
      ? data
      : await validateBeforeCreate(data)
    return await GET_DB().collection(COURSE_COLLECTION_NAME).insertOne(validData)
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ READ ============
const findOneById = async (courseId) => {
  try {
    const objectId = new ObjectId(courseId)
    return await GET_DB().collection(COURSE_COLLECTION_NAME).findOne({
      _id: objectId,
      _destroy: { $ne: true }
    })
  } catch (error) {
    throw new Error(error.message)
  }
}
const findOneBySlug = async (slug) => {
  try {
    return await GET_DB().collection(COURSE_COLLECTION_NAME).findOne({
      slug: slug,
      _destroy: { $ne: true }
    })
  } catch (error) {
    throw new Error(error.message)
  }
}
const findByProvider = async (providerId, skip = 0, limit = 10, filters = {}) => {
  try {
    let objectIdProvider = null;
    if (ObjectId.isValid(providerId)) {
      objectIdProvider = new ObjectId(providerId);
    }
    
    const query = {
      _destroy: { $ne: true }
    }
    
    if (objectIdProvider) {
      query.$or = [
        { providerId: providerId },
        { providerId: objectIdProvider }
      ];
    } else {
      query.providerId = providerId;
    }

    if (filters.status) {
      query.status = filters.status;
    }
    
    if (filters.search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { title: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } }
        ]
      });
    }

    const courses = await GET_DB().collection(COURSE_COLLECTION_NAME)
      .find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()
    const totalCourses = await GET_DB().collection(COURSE_COLLECTION_NAME).countDocuments(query)
    return { courses, totalCourses }
  } catch (error) {
    throw new Error(error.message)
  }
}
const findByCategory = async (categoryId, skip = 0, limit = 10, additionalFilters = {}) => {
  try {
    const query = {
      categoryId: categoryId,
      status: COURSE_STATUS.APPROVED,
      _destroy: { $ne: true },
      ...additionalFilters
    }
    const courses = await GET_DB().collection(COURSE_COLLECTION_NAME)
      .find(query)
      .sort({ enrollmentCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()
    const totalCourses = await GET_DB().collection(COURSE_COLLECTION_NAME).countDocuments(query)
    return { courses, totalCourses }
  } catch (error) {
    throw new Error(error.message)
  }
}

const searchCourses = async (searchQuery, filters = {}, skip = 0, limit = 10, sort = { createdAt: -1 }) => {
  try {
    const finalSort = { ...sort, _id: -1 };
    const matchStage = {
      status: COURSE_STATUS.APPROVED,
      _destroy: { $ne: true }
    }
    // Search by title/description
    if (searchQuery) {
      matchStage.$or = [
        { title: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } }
      ]
    }
    // Apply filters
    if (filters.category) {
      matchStage.categoryId = filters.category
    }
    if (filters.provider) {
      matchStage.providerId = filters.provider
    }
    if (filters.level) {
      matchStage.level = filters.level
    }
    if (filters.isFree === true) {
      matchStage.$and = matchStage.$and || []
      matchStage.$and.push({ $or: [{ isFree: true }, { 'fundingConfig.type': 'FREE' }] })
    } else if (filters.isFree === false) {
      matchStage.$and = matchStage.$and || []
      matchStage.$and.push({ $or: [{ isFree: false }, { 'fundingConfig.type': { $in: ['PAID', 'SPONSORED'] } }] })
      
      if (filters.minFee !== undefined) {
        matchStage.$and.push({ $or: [{ fee: { $gte: filters.minFee } }, { 'fundingConfig.price': { $gte: filters.minFee } }] })
      }
      if (filters.maxFee !== undefined) {
        matchStage.$and.push({ $or: [{ fee: { $lte: filters.maxFee } }, { 'fundingConfig.price': { $lte: filters.maxFee } }] })
      }
    }
    if (filters.hasScholarship) {
      matchStage.scholarshipEligibility = true
    }
    if (filters.skill) {
      matchStage.skills = { $in: [new RegExp(filters.skill, 'i')] }
    }
    if (filters.delivery_type) {
      matchStage.delivery_type = filters.delivery_type
    }
    if (filters.funding_model) {
      matchStage.funding_model = filters.funding_model
    }
    if (filters.linkedPartnershipId) {
      matchStage.linkedPartnershipId = filters.linkedPartnershipId
    }
    if (filters.linkedEnterpriseId) {
      matchStage.linkedEnterpriseId = filters.linkedEnterpriseId
    }
    if (filters.hasSponsorship === true) {
      matchStage['sponsorship.hasSponsorship'] = true
    } else if (filters.hasSponsorship === false) {
      matchStage['sponsorship.hasSponsorship'] = false
    }
    if (filters.acceptsSponsorship === true) {
      matchStage['fundingConfig.acceptsSponsorship'] = { $ne: false } // undefined is treated as true for backward compatibility
    }
    const courses = await GET_DB().collection(COURSE_COLLECTION_NAME)
      .find(matchStage)
      .sort(finalSort)
      .skip(skip)
      .limit(limit)
      .toArray()
    const totalCourses = await GET_DB().collection(COURSE_COLLECTION_NAME).countDocuments(matchStage)
    return { courses, totalCourses }
  } catch (error) {
    throw new Error(error.message)
  }
}

const findBySkills = async (skills, limit = 10) => {
  try {
    const query = {
      skills: { $in: skills.map(s => new RegExp(s, 'i')) },
      status: COURSE_STATUS.APPROVED,
      _destroy: { $ne: true }
    }
    return await GET_DB().collection(COURSE_COLLECTION_NAME)
      .find(query)
      .sort({ rating: -1, enrollmentCount: -1 })
      .limit(limit)
      .toArray()
  } catch (error) {
    throw new Error(error.message)
  }
}

// Tìm courses phù hợp với skill gaps (skills mà learner chưa có)
const findBySkillGaps = async (missingSkills, limit = 20) => {
  try {
    if (!missingSkills || missingSkills.length === 0) return []
    const query = {
      status: COURSE_STATUS.APPROVED,
      _destroy: { $ne: true },
      skills: {
        $in: missingSkills.map(s => new RegExp(s, 'i'))
      }
    }
    return await GET_DB().collection(COURSE_COLLECTION_NAME)
      .find(query)
      .project({
        _id: 1, title: 1, shortDescription: 1,
        skills: 1, fee: 1, duration: 1,
        level: 1, rating: 1, enrollmentCount: 1,
        'location.type': 1, 'location.coordinates': 1
      })
      .sort({ rating: -1, enrollmentCount: -1 })
      .limit(limit)
      .toArray()
  } catch (error) {
    throw new Error(error.message)
  }
}

const findPopular = async (limit = 10) => {
  try {
    return await GET_DB().collection(COURSE_COLLECTION_NAME)
      .find({
        status: COURSE_STATUS.APPROVED,
        _destroy: { $ne: true }
      })
      .sort({ enrollmentCount: -1, rating: -1 })
      .limit(limit)
      .toArray()
  } catch (error) {
    throw new Error(error.message)
  }
}

const findNew = async (limit = 10) => {
  try {
    return await GET_DB().collection(COURSE_COLLECTION_NAME)
      .find({
        status: COURSE_STATUS.APPROVED,
        _destroy: { $ne: true }
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()
  } catch (error) {
    throw new Error(error.message)
  }
}

const findRelated = async (courseId, limit = 5) => {
  try {
    const course = await findOneById(courseId)
    if (!course) return []
    return await GET_DB().collection(COURSE_COLLECTION_NAME)
      .find({
        _id: { $ne: new ObjectId(courseId) },
        categoryId: course.categoryId,
        status: COURSE_STATUS.APPROVED,
        _destroy: { $ne: true }
      })
      .sort({ enrollmentCount: -1 })
      .limit(limit)
      .toArray()
  } catch (error) {
    throw new Error(error.message)
  }
}

const getPendingCourses = async (skip = 0, limit = 10) => {
  try {
    const query = {
      status: COURSE_STATUS.PENDING,
      _destroy: { $ne: true }
    }
    const courses = await GET_DB().collection(COURSE_COLLECTION_NAME)
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()
    const totalCourses = await GET_DB().collection(COURSE_COLLECTION_NAME).countDocuments(query)
    return { courses, totalCourses }
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ UPDATE ============
const update = async (courseId, data) => {
  try {
    const objectId = new ObjectId(courseId)
    const updateData = {
      ...data,
      updatedAt: Date.now()
    }
    
    // Transform categoryId from string to ObjectId if present
    if (updateData.categoryId) {
      updateData.categoryId = new ObjectId(updateData.categoryId)
    }
    
    const result = await GET_DB().collection(COURSE_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      { $set: updateData },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) {
    throw new Error(error.message)
  }
}
const addActiveSponsorship = async (courseId, sponsorshipId) => {
  try {
    const objectId = new ObjectId(courseId)
    const result = await GET_DB().collection(COURSE_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      { 
        $set: { 'sponsorship.hasSponsorship': true, updatedAt: Date.now() },
        $addToSet: { 'sponsorship.activeSponsorshipIds': sponsorshipId }
      },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const updateStatus = async (courseId, status, adminId, rejectionReason = null) => {
  try {
    const objectId = new ObjectId(courseId)
    const updateData = {
      status: status,
      updatedAt: Date.now()
    }
    if (status === COURSE_STATUS.APPROVED) {
      updateData.approvedBy = adminId
      updateData.approvedAt = Date.now()
    }
    if (status === COURSE_STATUS.REJECTED && rejectionReason) {
      updateData.rejectionReason = rejectionReason
    }
    const result = await GET_DB().collection(COURSE_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      { $set: updateData },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const incrementViewCount = async (courseId) => {
  try {
    const objectId = new ObjectId(courseId)
    return await GET_DB().collection(COURSE_COLLECTION_NAME).updateOne(
      { _id: objectId },
      {
        $inc: { viewCount: 1 },
        $set: { updatedAt: Date.now() }
      }
    )
  } catch (error) {
    throw new Error(error.message)
  }
}

const incrementEnrollmentCount = async (courseId) => {
  try {
    const objectId = new ObjectId(courseId)
    return await GET_DB().collection(COURSE_COLLECTION_NAME).updateOne(
      { _id: objectId },
      {
        $inc: { enrollmentCount: 1, currentStudents: 1 },
        $set: { updatedAt: Date.now() }
      }
    )
  } catch (error) {
    throw new Error(error.message)
  }
}

const decrementEnrollmentCount = async (courseId) => {
  try {
    const objectId = new ObjectId(courseId)
    return await GET_DB().collection(COURSE_COLLECTION_NAME).updateOne(
      { _id: objectId },
      {
        $inc: { currentStudents: -1 },
        $set: { updatedAt: Date.now() }
      }
    )
  } catch (error) {
    throw new Error(error.message)
  }
}

const updateRating = async (courseId, newAverage, newCount) => {
  try {
    const objectId = new ObjectId(courseId)
    return await GET_DB().collection(COURSE_COLLECTION_NAME).updateOne(
      { _id: objectId },
      {
        $set: {
          'rating.average': newAverage,
          'rating.count': newCount,
          updatedAt: Date.now()
        }
      }
    )
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ DELETE ============
const deleteCourse = async (courseId) => {
  try {
    const objectId = new ObjectId(courseId)
    return await GET_DB().collection(COURSE_COLLECTION_NAME).updateOne(
      { _id: objectId },
      {
        $set: {
          _destroy: true,
          status: COURSE_STATUS.ARCHIVED,
          updatedAt: Date.now()
        }
      }
    )
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ AGGREGATE ============
const getCourseStats = async (courseId) => {
  try {
    const objectId = new ObjectId(courseId)
    const stats = await GET_DB().collection(COURSE_COLLECTION_NAME).aggregate([
      { $match: { _id: objectId } },
      {
        $lookup: {
          from: 'enrollments',
          let: { courseId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$courseId', '$$courseId'] },
                _destroy: { $ne: true }
              }
            },
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 }
              }
            }
          ],
          as: 'enrollmentStats'
        }
      },
      {
        $lookup: {
          from: 'reviews',
          let: { courseId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$courseId', '$$courseId'] },
                status: 'approved',
                _destroy: { $ne: true }
              }
            },
            {
              $group: {
                _id: null,
                avgRating: { $avg: '$rating.average' },
                totalReviews: { $sum: 1 }
              }
            }
          ],
          as: 'reviewStats'
        }
      },
      {
        $project: {
          _id: 1,
          enrollmentStats: 1,
          reviewStats: 1
        }
      }
    ]).toArray()
    return stats[0] || null
  } catch (error) {
    throw new Error(error.message)
  }
}

// Admin aggregate functions
const getProviderCourseStats = async (providerId) => {
  try {
    let objectIdProvider = null;
    if (ObjectId.isValid(providerId)) {
      objectIdProvider = new ObjectId(providerId);
    }
    const matchStage = { _destroy: { $ne: true } };
    if (objectIdProvider) {
      matchStage.$or = [ { providerId: providerId }, { providerId: objectIdProvider } ];
    } else {
      matchStage.providerId = providerId;
    }

    const stats = await GET_DB().collection(COURSE_COLLECTION_NAME).aggregate([
      { $match: matchStage },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray();

    const result = {
      total: 0,
      draft: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      archived: 0
    };

    stats.forEach(stat => {
      result[stat._id] = stat.count;
      result.total += stat.count;
    });

    return result;
  } catch (error) {
    throw new Error(error.message);
  }
}

const getAdminCourseStats = async () => {
  try {
    const stats = await GET_DB().collection(COURSE_COLLECTION_NAME).aggregate([
      { $match: { _destroy: { $ne: true }, status: { $ne: COURSE_STATUS.DRAFT } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]).toArray()

    const result = {
      total: 0,
      draft: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      archived: 0
    }

    stats.forEach(stat => {
      result[stat._id] = stat.count
      result.total += stat.count
    })

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const getAdminCourses = async (searchQuery, filters = {}, skip = 0, limit = 10, sort = { createdAt: -1 }) => {
  try {
    const finalSort = { ...sort, _id: -1 };
    const matchStage = {
      _destroy: { $ne: true },
      status: { $ne: COURSE_STATUS.DRAFT }
    }

    // Search by title/description
    if (searchQuery) {
      matchStage.$or = [
        { title: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } }
      ]
    }

    // Apply filters
    if (filters.status) {
      matchStage.status = filters.status
    }
    if (filters.category) {
      matchStage.categoryId = filters.category
    }
    if (filters.level) {
      matchStage.level = filters.level
    }
    if (filters.location) {
      matchStage['location.type'] = filters.location
    }
    if (filters.isFree !== undefined) {
      matchStage.isFree = filters.isFree
    }
    if (filters.delivery_type) {
      matchStage.delivery_type = filters.delivery_type
    }
    if (filters.funding_model) {
      matchStage.funding_model = filters.funding_model
    }

    const courses = await GET_DB().collection(COURSE_COLLECTION_NAME)
      .find(matchStage)
      .sort(finalSort)
      .skip(skip)
      .limit(limit)
      .toArray()

    const totalCourses = await GET_DB().collection(COURSE_COLLECTION_NAME).countDocuments(matchStage)

    return { courses, totalCourses }
  } catch (error) {
    throw new Error(error.message)
  }
}
export const courseModel = {
  COURSE_COLLECTION_NAME,
  COURSE_COLLECTION_SCHEMA,
  COURSE_STATUS,
  DURATION_UNITS,
  LOCATION_TYPES,
  COURSE_DELIVERY_TYPES,
  COURSE_FUNDING_MODELS,
  // Validation
  validateBeforeCreate,
  // Create
  createNew,
  // Read
  findOneById,
  findOneBySlug,
  findByProvider,
  findByCategory,
  searchCourses,
  findBySkills,
  findBySkillGaps,
  findPopular,
  findNew,
  findRelated,
  getPendingCourses,
  getAdminCourseStats,
  getProviderCourseStats,
  getAdminCourses,
  // Update
  update,
  addActiveSponsorship,
  updateStatus,
  incrementViewCount,
  incrementEnrollmentCount,
  decrementEnrollmentCount,
  updateRating,
  // Delete
  deleteCourse,
  // Aggregate
  getCourseStats
}
