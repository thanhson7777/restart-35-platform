import { courseSponsorshipModel } from '~/models/courseSponsorshipModel'
import { enrollmentModel } from '~/models/enrollmentModel'
import { userModel } from '~/models/userModel'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import {
  DEFAULT_PAGE,
  DEFAULT_ITEM_PER_PAGE,
  COURSE_SPONSORSHIP_STATUS,
  ORGANIZATION_TYPES,
  USER_ROLES
} from '~/utils/constants'

const ensureSponsorRole = async (userId, sponsorType) => {
  const user = await userModel.findOneById(userId)
  if (!user || user.role !== sponsorType) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền thực hiện thao tác sponsor này!')
  }
  return user
}

const ensureCanAccessSponsorship = (sponsorship, actorId, role) => {
  const isAdmin = role === USER_ROLES.ADMIN
  const isOwner = sponsorship.sponsorId === actorId
  if (!isAdmin && !isOwner) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền truy cập chương trình tài trợ này!')
  }
}

const createCourseSponsorship = async (sponsorId, data) => {
  await ensureSponsorRole(sponsorId, data.sponsorType)

  const sponsorshipData = {
    sponsorType: data.sponsorType,
    sponsorId,
    title: data.title,
    description: data.description || null,
    fundingModel: data.fundingModel,
    linkedCourses: data.linkedCourses,
    budget: data.budget,
    remaining: data.budget,
    coverageType: data.coverageType,
    maxAmountPerLearner: data.maxAmountPerLearner || null,
    eligibilityCriteria: data.eligibilityCriteria,
    disbursementModel: data.disbursementModel,
    autoApprove: data.autoApprove || false,
    priorityRecruitment: data.priorityRecruitment || false,
    clawbackPolicy: data.clawbackPolicy,
    startsAt: data.startsAt || null,
    expiresAt: data.expiresAt || null,
    status: COURSE_SPONSORSHIP_STATUS.DRAFT
  }

  const result = await courseSponsorshipModel.createNew(sponsorshipData)
  return await courseSponsorshipModel.findOneById(result.insertedId)
}

const getCourseSponsorships = async (actorId, role, queryParams) => {
  const {
    page = DEFAULT_PAGE,
    limit = DEFAULT_ITEM_PER_PAGE,
    sponsorType,
    sponsorId,
    status,
    courseId
  } = queryParams

  const currentPage = parseInt(page, 10) || DEFAULT_PAGE
  const recordLimit = parseInt(limit, 10) || DEFAULT_ITEM_PER_PAGE
  const skip = (currentPage - 1) * recordLimit

  const filters = {}
  if (sponsorType) filters.sponsorType = sponsorType
  if (status) filters.status = status
  if (courseId) filters['linkedCourses.courseId'] = courseId

  if (role === USER_ROLES.ENTERPRISE || role === USER_ROLES.NGO) {
    filters.sponsorId = actorId
  } else if (sponsorId) {
    filters.sponsorId = sponsorId
  }

  const { sponsorships, total } = await courseSponsorshipModel.findByPaginate(filters, skip, recordLimit)
  return {
    sponsorships,
    pagination: {
      totalRecords: total,
      totalPages: Math.ceil(total / recordLimit),
      currentPage,
      limit: recordLimit
    }
  }
}

const getCourseSponsorshipById = async (sponsorshipId, actorId, role) => {
  const sponsorship = await courseSponsorshipModel.findOneById(sponsorshipId)
  if (!sponsorship) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Course sponsorship không tồn tại!')
  }

  ensureCanAccessSponsorship(sponsorship, actorId, role)
  return sponsorship
}

const updateCourseSponsorship = async (sponsorshipId, sponsorId, role, data) => {
  const sponsorship = await getCourseSponsorshipById(sponsorshipId, sponsorId, role)
  if (role === USER_ROLES.ADMIN) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Admin không cập nhật trực tiếp sponsorship này!')
  }
  return await courseSponsorshipModel.update(sponsorshipId, data)
}

const approveCourseSponsorship = async (sponsorshipId) => {
  const sponsorship = await courseSponsorshipModel.findOneById(sponsorshipId)
  if (!sponsorship) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Course sponsorship không tồn tại!')
  }
  return await courseSponsorshipModel.updateStatus(sponsorshipId, COURSE_SPONSORSHIP_STATUS.ACTIVE)
}

const pauseCourseSponsorship = async (sponsorshipId, actorId, role) => {
  await getCourseSponsorshipById(sponsorshipId, actorId, role)
  return await courseSponsorshipModel.updateStatus(sponsorshipId, COURSE_SPONSORSHIP_STATUS.PAUSED)
}

const resumeCourseSponsorship = async (sponsorshipId, actorId, role) => {
  await getCourseSponsorshipById(sponsorshipId, actorId, role)
  return await courseSponsorshipModel.updateStatus(sponsorshipId, COURSE_SPONSORSHIP_STATUS.ACTIVE)
}

const linkCourse = async (sponsorshipId, actorId, role, courseData) => {
  const sponsorship = await getCourseSponsorshipById(sponsorshipId, actorId, role)
  const linkedCourses = sponsorship.linkedCourses || []
  if (linkedCourses.some(item => item.courseId === courseData.courseId)) {
    throw new ApiError(StatusCodes.CONFLICT, 'Khóa học đã được liên kết tài trợ!')
  }
  return await courseSponsorshipModel.update(sponsorshipId, {
    linkedCourses: [...linkedCourses, courseData]
  })
}

const unlinkCourse = async (sponsorshipId, actorId, role, courseId) => {
  const sponsorship = await getCourseSponsorshipById(sponsorshipId, actorId, role)
  return await courseSponsorshipModel.update(sponsorshipId, {
    linkedCourses: (sponsorship.linkedCourses || []).filter(item => item.courseId !== courseId)
  })
}

const getCourseSponsorshipLearners = async (sponsorshipId, actorId, role, queryParams = {}) => {
  const sponsorship = await getCourseSponsorshipById(sponsorshipId, actorId, role)
  const currentPage = parseInt(queryParams.page, 10) || DEFAULT_PAGE
  const recordLimit = parseInt(queryParams.limit, 10) || DEFAULT_ITEM_PER_PAGE
  const skip = (currentPage - 1) * recordLimit

  const { enrollments, totalEnrollments } = await enrollmentModel.findAll(skip, recordLimit, {
    'sponsorships.sponsorshipId': sponsorshipId
  })

  return {
    sponsorship,
    learners: enrollments,
    pagination: {
      totalRecords: totalEnrollments,
      totalPages: Math.ceil(totalEnrollments / recordLimit),
      currentPage,
      limit: recordLimit
    }
  }
}

const getCourseSponsorshipStats = async (sponsorshipId, actorId, role) => {
  const sponsorship = await getCourseSponsorshipById(sponsorshipId, actorId, role)
  const [learnersResult] = await Promise.all([
    enrollmentModel.findAll(0, 1000, { 'sponsorships.sponsorshipId': sponsorshipId })
  ])

  return {
    sponsorshipId,
    sponsorType: sponsorship.sponsorType,
    sponsorId: sponsorship.sponsorId,
    status: sponsorship.status,
    budget: sponsorship.budget,
    spent: sponsorship.spent,
    remaining: sponsorship.remaining,
    linkedCourses: sponsorship.linkedCourses || [],
    totalLearners: learnersResult.totalEnrollments,
    stats: sponsorship.stats
  }
}

const getEnterpriseSponsorshipOverview = async (enterpriseId) => {
  const { sponsorships } = await courseSponsorshipModel.findBySponsor(
    enterpriseId,
    ORGANIZATION_TYPES.ENTERPRISE,
    0,
    100,
    {}
  )
  return sponsorships
}

const getNgoSponsorshipOverview = async (ngoId) => {
  const { sponsorships } = await courseSponsorshipModel.findBySponsor(
    ngoId,
    ORGANIZATION_TYPES.NGO,
    0,
    100,
    {}
  )
  return sponsorships
}

export const courseSponsorshipService = {
  createCourseSponsorship,
  getCourseSponsorships,
  getCourseSponsorshipById,
  updateCourseSponsorship,
  approveCourseSponsorship,
  pauseCourseSponsorship,
  resumeCourseSponsorship,
  linkCourse,
  unlinkCourse,
  getCourseSponsorshipLearners,
  getCourseSponsorshipStats,
  getEnterpriseSponsorshipOverview,
  getNgoSponsorshipOverview
}
