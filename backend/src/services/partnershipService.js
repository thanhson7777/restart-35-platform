import { ObjectId } from 'mongodb'
import { partnershipModel } from '~/models/partnershipModel'
import { enrollmentModel } from '~/models/enrollmentModel'
import { userModel } from '~/models/userModel'
import { courseModel } from '~/models/courseModel'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import {
  DEFAULT_PAGE,
  DEFAULT_ITEM_PER_PAGE,
  PARTNERSHIP_STATUS,
  USER_ROLES,
  ENROLLMENT_STATUS_V2
} from '~/utils/constants'

const ensureEnterprise = async (userId) => {
  const user = await userModel.findOneById(userId)
  if (!user || user.role !== USER_ROLES.ENTERPRISE) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Chỉ enterprise mới được thực hiện thao tác này!')
  }
  return user
}

const ensureTrainer = async (userId) => {
  const user = await userModel.findOneById(userId)
  if (!user || user.role !== USER_ROLES.TRAINER) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Chỉ trainer mới được thực hiện thao tác này!')
  }
  return user
}

const ensureParticipantAccess = (partnership, actorId, role) => {
  const isAdmin = role === USER_ROLES.ADMIN
  const isEnterprise = partnership.enterpriseId === actorId
  const isTrainer = partnership.trainerId === actorId
  if (!isAdmin && !isEnterprise && !isTrainer) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền truy cập partnership này!')
  }
}

const buildPartnershipSummary = async (partnership) => {
  const [enterprise, trainer, linkedCourses] = await Promise.all([
    userModel.findOneById(partnership.enterpriseId),
    userModel.findOneById(partnership.trainerId),
    Promise.all((partnership.linkedCourseIds || []).map(courseId => courseModel.findOneById(courseId)))
  ])

  return {
    ...partnership,
    enterprise: enterprise ? {
      _id: enterprise._id?.toString?.() || partnership.enterpriseId,
      displayName: enterprise.displayName,
      email: enterprise.email,
      phone: enterprise.phone,
      avatar: enterprise.avatar,
      organizationId: enterprise.organizationId || null
    } : null,
    trainer: trainer ? {
      _id: trainer._id?.toString?.() || partnership.trainerId,
      displayName: trainer.displayName,
      email: trainer.email,
      phone: trainer.phone,
      avatar: trainer.avatar
    } : null,
    linkedCourses: linkedCourses
      .filter(Boolean)
      .map(course => ({
        _id: course._id?.toString?.() || course._id,
        title: course.title,
        slug: course.slug,
        status: course.status,
        funding_model: course.funding_model,
        linkedEnterpriseId: course.linkedEnterpriseId || null,
        linkedPartnershipId: course.linkedPartnershipId || null
      }))
  }
}

const enrichEnrollments = async (enrollments = []) => {
  return await Promise.all(enrollments.map(async (enrollment) => {
    const [course, user] = await Promise.all([
      courseModel.findOneById(enrollment.courseId),
      userModel.findOneById(enrollment.userId)
    ])

    return {
      ...enrollment,
      user: user ? {
        _id: user._id?.toString?.() || enrollment.userId,
        displayName: user.displayName,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar
      } : null,
      course: course ? {
        _id: course._id?.toString?.() || enrollment.courseId,
        title: course.title,
        slug: course.slug,
        status: course.status,
        providerId: course.providerId
      } : null
    }
  }))
}

const buildPartnershipDetail = async (partnership) => {
  const summary = await buildPartnershipSummary(partnership)
  const [learnerResult, graduateResult] = await Promise.all([
    enrollmentModel.findAll(0, 1000, { partnershipId: partnership._id.toString() }),
    enrollmentModel.findAll(0, 1000, {
      partnershipId: partnership._id.toString(),
      status: ENROLLMENT_STATUS_V2.COMPLETED
    })
  ])

  return {
    ...summary,
    summary: {
      totalLearners: learnerResult.totalEnrollments,
      totalGraduates: graduateResult.totalEnrollments,
      pendingLearners: learnerResult.enrollments.filter(item => item.status === ENROLLMENT_STATUS_V2.ACTIVE).length,
      completedLearners: graduateResult.totalEnrollments
    }
  }
}

const createPartnership = async (enterpriseId, data) => {
  await ensureEnterprise(enterpriseId)
  await ensureTrainer(data.trainerId)

  const partnershipData = {
    enterpriseId,
    trainerId: data.trainerId,
    requestedCourseIds: data.requestedCourseIds || [],
    recruitmentNeeds: data.recruitmentNeeds,
    referralBonus: data.referralBonus || 0,
    tuitionFee: data.tuitionFee || null,
    notes: data.notes || null,
    message: data.message || null,
    expiresAt: data.expiresAt || null,
    status: PARTNERSHIP_STATUS.PENDING
  }

  const result = await partnershipModel.createNew(partnershipData)
  return await partnershipModel.findOneById(result.insertedId)
}

const getPartnerships = async (actorId, role, queryParams) => {
  const {
    page = DEFAULT_PAGE,
    limit = DEFAULT_ITEM_PER_PAGE,
    status,
    enterpriseId,
    trainerId,
    courseId
  } = queryParams

  const currentPage = parseInt(page, 10) || DEFAULT_PAGE
  const recordLimit = parseInt(limit, 10) || DEFAULT_ITEM_PER_PAGE
  const skip = (currentPage - 1) * recordLimit

  const filters = {}
  if (status) filters.status = status
  if (enterpriseId) filters.enterpriseId = enterpriseId
  if (trainerId) filters.trainerId = trainerId
  if (courseId) filters.linkedCourseIds = courseId

  if (role === USER_ROLES.ENTERPRISE) {
    filters.enterpriseId = actorId
  } else if (role === USER_ROLES.TRAINER) {
    filters.trainerId = actorId
  }

  const { partnerships, total } = await partnershipModel.findByPaginate(filters, skip, recordLimit)
  const enrichedPartnerships = await Promise.all(partnerships.map(buildPartnershipSummary))

  return {
    partnerships: enrichedPartnerships,
    pagination: {
      totalRecords: total,
      totalPages: Math.ceil(total / recordLimit),
      currentPage,
      limit: recordLimit
    }
  }
}

const getPartnershipById = async (partnershipId, actorId, role) => {
  const partnership = await partnershipModel.findOneById(partnershipId)
  if (!partnership) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Partnership không tồn tại!')
  }

  ensureParticipantAccess(partnership, actorId, role)
  return await buildPartnershipDetail(partnership)
}

const respondPartnership = async (partnershipId, trainerId, data) => {
  await ensureTrainer(trainerId)
  const partnership = await partnershipModel.findOneById(partnershipId)
  if (!partnership) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Partnership không tồn tại!')
  }
  if (partnership.trainerId !== trainerId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không thể phản hồi partnership này!')
  }

  return await partnershipModel.respond(partnershipId, data)
}

const confirmPartnership = async (partnershipId, actorId, role, data) => {
  const partnership = await getPartnershipById(partnershipId, actorId, role)
  if (![USER_ROLES.ENTERPRISE, USER_ROLES.TRAINER, USER_ROLES.ADMIN].includes(role)) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền xác nhận partnership!')
  }
  return await partnershipModel.confirm(partnershipId, data)
}

const cancelPartnership = async (partnershipId, actorId, role, reason) => {
  await getPartnershipById(partnershipId, actorId, role)
  return await partnershipModel.cancel(partnershipId, reason)
}

const negotiatePartnership = async (partnershipId, actorId, role, data) => {
  await getPartnershipById(partnershipId, actorId, role)
  return await partnershipModel.updateNegotiation(partnershipId, data)
}

const expirePartnership = async (partnershipId) => {
  const partnership = await partnershipModel.findOneById(partnershipId)
  if (!partnership) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Partnership không tồn tại!')
  }
  return await partnershipModel.update(partnershipId, { status: PARTNERSHIP_STATUS.EXPIRED })
}

const getPartnershipLearners = async (partnershipId, actorId, role, queryParams = {}) => {
  const partnership = await getPartnershipById(partnershipId, actorId, role)
  const currentPage = parseInt(queryParams.page, 10) || DEFAULT_PAGE
  const recordLimit = parseInt(queryParams.limit, 10) || DEFAULT_ITEM_PER_PAGE
  const skip = (currentPage - 1) * recordLimit

  const filters = { partnershipId }
  if (queryParams.status) filters.status = queryParams.status

  const { enrollments, totalEnrollments } = await enrollmentModel.findAll(skip, recordLimit, filters)
  const learners = await enrichEnrollments(enrollments)
  return {
    partnership,
    learners,
    pagination: {
      totalRecords: totalEnrollments,
      totalPages: Math.ceil(totalEnrollments / recordLimit),
      currentPage,
      limit: recordLimit
    }
  }
}

const getPartnershipGraduates = async (partnershipId, actorId, role, queryParams = {}) => {
  const partnership = await getPartnershipById(partnershipId, actorId, role)
  const currentPage = parseInt(queryParams.page, 10) || DEFAULT_PAGE
  const recordLimit = parseInt(queryParams.limit, 10) || DEFAULT_ITEM_PER_PAGE
  const skip = (currentPage - 1) * recordLimit

  const { enrollments, totalEnrollments } = await enrollmentModel.findAll(skip, recordLimit, {
    partnershipId,
    status: ENROLLMENT_STATUS_V2.COMPLETED
  })
  const graduates = await enrichEnrollments(enrollments)

  return {
    partnership,
    graduates,
    pagination: {
      totalRecords: totalEnrollments,
      totalPages: Math.ceil(totalEnrollments / recordLimit),
      currentPage,
      limit: recordLimit
    }
  }
}

const getPartnershipStats = async (partnershipId, actorId, role) => {
  const partnership = await getPartnershipById(partnershipId, actorId, role)
  const [learners, graduates] = await Promise.all([
    enrollmentModel.findAll(0, 1000, { partnershipId }),
    enrollmentModel.findAll(0, 1000, { partnershipId, status: ENROLLMENT_STATUS_V2.COMPLETED })
  ])

  return {
    partnershipId,
    status: partnership.status,
    linkedCourseIds: (partnership.linkedCourses || []).map(course => course._id),
    stats: {
      ...(partnership.stats || {}),
      totalLearners: learners.totalEnrollments,
      totalGraduates: graduates.totalEnrollments
    },
    enterprise: partnership.enterprise,
    trainer: partnership.trainer,
    recruitmentNeeds: partnership.recruitmentNeeds,
    agreedTerms: partnership.agreedTerms || null
  }
}

const getEnterpriseActivePartnerships = async (enterpriseId) => {
  const { partnerships } = await partnershipModel.findByEnterprise(enterpriseId, 0, 50, {
    status: PARTNERSHIP_STATUS.ACTIVE
  })
  return partnerships
}

const getTrainerActivePartnerships = async (trainerId) => {
  const { partnerships } = await partnershipModel.findByTrainer(trainerId, 0, 50, {
    status: PARTNERSHIP_STATUS.ACTIVE
  })
  return await Promise.all(partnerships.map(buildPartnershipSummary))
}

export const partnershipService = {
  createPartnership,
  getPartnerships,
  getPartnershipById,
  respondPartnership,
  confirmPartnership,
  cancelPartnership,
  negotiatePartnership,
  expirePartnership,
  getPartnershipLearners,
  getPartnershipGraduates,
  getPartnershipStats,
  getEnterpriseActivePartnerships,
  getTrainerActivePartnerships
}
