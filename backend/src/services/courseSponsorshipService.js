import { courseSponsorshipModel } from '~/models/courseSponsorshipModel'
import { GET_DB } from '~/config/mongodb'
import { ObjectId } from 'mongodb'
import { walletModel } from '~/models/walletModel'
import { transactionModel } from '~/models/transactionModel'
import { enrollmentModel } from '~/models/enrollmentModel'
import { userModel } from '~/models/userModel'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import {
  DEFAULT_PAGE,
  DEFAULT_ITEM_PER_PAGE,
  COURSE_SPONSORSHIP_STATUS,
  ORGANIZATION_TYPES,
  USER_ROLES,
  ENROLLMENT_STATUS_V2
} from '~/utils/constants'
import { courseModel } from '~/models/courseModel'

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
    fundingModel: data.fundingModel || (data.sponsorType === 'ngo' ? 'ngo' : 'enterprise'),
    linkedCourses: (data.linkedCourses || []).map(lc => ({
      ...lc,
      coverage: lc.coverage || data.coverageType || 'full'
    })),
    budget: data.budget,
    targetLearners: data.targetLearners,
    remaining: data.budget,
    coverageType: data.coverageType || 'full',
    maxAmountPerLearner: data.maxAmountPerLearner || null,
    eligibilityCriteria: data.eligibilityCriteria,
    disbursementModel: data.disbursementModel || 'upfront',
    autoApprove: data.autoApprove || false,
    priorityRecruitment: data.priorityRecruitment || false,
    clawbackPolicy: data.clawbackPolicy,
    startsAt: data.startsAt || null,
    expiresAt: data.expiresAt || null,
    status: COURSE_SPONSORSHIP_STATUS.DRAFT
  }

  // Khóa tiền trong ví (Wallet)
  if (data.budget > 0) {
    const wallet = await walletModel.findOrCreateByUserId(sponsorId)
    
    if (wallet.availableBalance < data.budget) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Số dư khả dụng không đủ để tạo quỹ tài trợ. Vui lòng nạp thêm tiền!')
    }

    await walletModel.update(sponsorId, {
      availableBalance: wallet.availableBalance - data.budget,
      lockedBalance: (wallet.lockedBalance || 0) + data.budget
    })
  }

  const result = await courseSponsorshipModel.createNew(sponsorshipData)
  
  // Lưu Transaction RESERVE
  if (data.budget > 0) {
    const wallet = await walletModel.findOrCreateByUserId(sponsorId)
    await transactionModel.createNew({
      walletId: String(wallet._id),
      userId: sponsorId,
      type: 'RESERVE',
      amount: data.budget,
      description: `Lập quỹ tài trợ: ${data.title}`,
      referenceId: String(result._id),
      referenceModel: 'Sponsorship',
      status: 'COMPLETED'
    })
  }

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

const refundRemainingBudget = async (sponsorshipId) => {
  const sponsorship = await courseSponsorshipModel.findOneById(sponsorshipId)
  if (!sponsorship) return null

  // Chỉ hoàn tiền nếu có remaining > 0
  if (sponsorship.remaining > 0) {
    const wallet = await walletModel.findOneByUserId(sponsorship.sponsorId)
    if (wallet) {
      await walletModel.update(sponsorship.sponsorId, {
        availableBalance: (wallet.availableBalance || 0) + sponsorship.remaining,
        lockedBalance: Math.max(0, (wallet.lockedBalance || 0) - sponsorship.remaining)
      })

      // Lưu transaction
      const { transactionModel } = await import('~/models/transactionModel')
      await transactionModel.createNew({
        walletId: String(wallet._id),
        userId: sponsorship.sponsorId,
        type: 'REFUND',
        amount: sponsorship.remaining,
        description: `Hoàn tiền dư khi khóa học chốt danh sách: ${sponsorship.title}`,
        referenceId: sponsorshipId,
        referenceModel: 'Sponsorship',
        status: 'COMPLETED'
      })
    }
  }

  // Cập nhật trạng thái sponsorship thành EXPIRED và remaining = 0
  return await courseSponsorshipModel.update(sponsorshipId, {
    remaining: 0,
    status: COURSE_SPONSORSHIP_STATUS.EXPIRED
  })
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

const decideSponsorshipLearner = async (sponsorshipId, enrollmentId, sponsorId, status) => {
  const sponsorship = await getCourseSponsorshipById(sponsorshipId, sponsorId, null) // ensure owner
  
  const enrollment = await enrollmentModel.findOneById(enrollmentId)
  if (!enrollment) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Ghi danh không tồn tại!')
  }

  // verify enrollment belongs to this sponsorship
  const hasSponsorship = enrollment.sponsorships?.some(s => s.sponsorshipId === sponsorshipId)
  if (!hasSponsorship && enrollment.source !== 'ngo_sponsored') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Ghi danh này không thuộc chương trình tài trợ của bạn!')
  }

  if (status === 'approved') {
    if ((sponsorship.stats?.approvedLearners || 0) >= sponsorship.targetLearners) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Quỹ tài trợ đã hết suất!')
    }

    await enrollmentModel.updateStatus(enrollmentId, ENROLLMENT_STATUS_V2.ACTIVE, {
      startDate: Date.now()
    })
    await courseModel.incrementEnrollmentCount(enrollment.courseId)

    // Lấy thông tin khóa học để biết số tiền cần giải ngân
    const course = await courseModel.findOneById(enrollment.courseId)
    const basePrice = course?.fundingConfig?.price ?? course?.fee ?? 0
    
    let sponsoredAmount = 0
    const lc = sponsorship.linkedCourses?.find(item => String(item.courseId) === String(course._id))
    
    // Đối với Partnership, lấy maxAmount (tuitionFeePerLearner) được thỏa thuận
    const agreedAmount = lc?.maxAmount || sponsorship.maxAmountPerLearner || 0

    if (lc) {
      if (lc.coverage?.toLowerCase() === 'full' || sponsorship.coverageType?.toLowerCase() === 'full') {
        // Ưu tiên giá thỏa thuận nếu có (Partnership), nếu không dùng basePrice
        sponsoredAmount = agreedAmount > 0 ? agreedAmount : basePrice
      } else {
        sponsoredAmount = agreedAmount
      }
    } else {
      sponsoredAmount = agreedAmount
    }

    // Không tài trợ vượt quá học phí (nếu là tài trợ thông thường)
    if (agreedAmount === 0 && basePrice > 0 && sponsoredAmount > basePrice) {
      sponsoredAmount = basePrice
    }

    if (sponsoredAmount > 0) {
      // Trừ tiền khóa (lockedBalance) và tăng tiền đã giải ngân
      const wallet = await walletModel.findOrCreateByUserId(sponsorId)
      if (wallet && wallet.lockedBalance >= sponsoredAmount) {
        await walletModel.update(sponsorId, {
          lockedBalance: wallet.lockedBalance - sponsoredAmount,
          totalDisbursed: (wallet.totalDisbursed || 0) + sponsoredAmount
        })

        // Lưu transaction DISBURSE cho Doanh nghiệp
        await transactionModel.createNew({
          walletId: String(wallet._id),
          userId: sponsorId,
          type: 'DISBURSE',
          amount: sponsoredAmount,
          description: `Giải ngân tài trợ khóa học cho học viên ${enrollment.userId}`,
          referenceId: sponsorshipId,
          referenceModel: 'Sponsorship',
          status: 'COMPLETED'
        })
        
        // Cộng tiền vào ví Trainer
        const trainerWallet = await walletModel.findOrCreateByUserId(course.providerId)
        await walletModel.update(course.providerId, {
          availableBalance: (trainerWallet.availableBalance || 0) + sponsoredAmount
        })

        // Lưu transaction RECEIVE cho Trainer
        await transactionModel.createNew({
          walletId: String(trainerWallet._id),
          userId: course.providerId,
          type: 'PARTNERSHIP_REVENUE',
          amount: sponsoredAmount,
          description: `Nhận tiền tài trợ khóa học cho học viên ${enrollment.userId} từ doanh nghiệp`,
          referenceId: sponsorshipId,
          referenceModel: 'Sponsorship',
          status: 'COMPLETED'
        })
        
        // Cập nhật ngân sách của Sponsorship
        await courseSponsorshipModel.update(sponsorshipId, {
          spent: (sponsorship.spent || 0) + sponsoredAmount,
          remaining: sponsorship.remaining - sponsoredAmount,
          'stats.approvedLearners': (sponsorship.stats?.approvedLearners || 0) + 1
        })
      } else {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Quỹ không đủ số dư bị phong tỏa để giải ngân!')
      }
    } else {
      // Fee = 0, vẫn tăng approvedLearners
      await courseSponsorshipModel.update(sponsorshipId, {
        'stats.approvedLearners': (sponsorship.stats?.approvedLearners || 0) + 1
      })
    }
  } else if (status === 'rejected') {
    await enrollmentModel.updateStatus(enrollmentId, ENROLLMENT_STATUS_V2.DROPPED, {
      dropReason: 'Bị từ chối bởi tổ chức tài trợ'
    })
  } else {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Trạng thái quyết định không hợp lệ!')
  }

  // Cập nhật trạng thái trong mảng sponsorships của enrollment
  await GET_DB().collection('enrollments').updateOne(
    { _id: new ObjectId(enrollmentId), 'sponsorships.sponsorshipId': sponsorshipId },
    { $set: { 'sponsorships.$.status': status } }
  )

  return await enrollmentModel.findOneById(enrollmentId)
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
  refundRemainingBudget,
  pauseCourseSponsorship,
  resumeCourseSponsorship,
  linkCourse,
  unlinkCourse,
  getCourseSponsorshipLearners,
  decideSponsorshipLearner,
  getCourseSponsorshipStats,
  getEnterpriseSponsorshipOverview,
  getNgoSponsorshipOverview
}
