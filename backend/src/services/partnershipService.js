import { ObjectId } from 'mongodb'
import { partnershipModel } from '~/models/partnershipModel'
import { courseSponsorshipModel } from '~/models/courseSponsorshipModel'
import { enrollmentModel } from '~/models/enrollmentModel'
import { userModel } from '~/models/userModel'
import { courseModel } from '~/models/courseModel'
import { walletModel } from '~/models/walletModel'
import { transactionModel } from '~/models/transactionModel'
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
    Promise.all((partnership.linkedCourseIds || []).concat(partnership.proposedCourseIds || []).filter(Boolean).map(courseId => courseModel.findOneById(courseId)))
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

  // Wallet Escrow logic
  if (data.proposedSponsorship && data.proposedSponsorship.budget > 0) {
    const budget = data.proposedSponsorship.budget
    const wallet = await walletModel.findOneByUserId(enterpriseId)
    if (!wallet || wallet.availableBalance < budget) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Số dư ví không đủ để tài trợ. Vui lòng nạp thêm tiền!')
    }

    // Khóa tiền
    await walletModel.update(enterpriseId, {
      availableBalance: wallet.availableBalance - budget,
      lockedBalance: (wallet.lockedBalance || 0) + budget
    })

    // Lưu lại Transaction để có lịch sử trong ví
    await transactionModel.createNew({
      walletId: String(wallet._id),
      userId: enterpriseId,
      type: 'RESERVE',
      amount: budget,
      description: `Ký quỹ tài trợ cho yêu cầu hợp tác mới`,
      referenceId: null, // Sẽ update referenceId sau khi có partnershipId
      referenceModel: 'Partnership',
      status: 'COMPLETED'
    })
  }

  const partnershipData = {
    enterpriseId,
    trainerId: data.trainerId,
    requestedCourseIds: data.requestedCourseIds || [],
    recruitmentNeeds: data.recruitmentNeeds || null,
    proposedSponsorship: data.proposedSponsorship || null,
    referralBonus: data.referralBonus || 0,
    tuitionFee: data.tuitionFee || null,
    notes: data.notes || null,
    message: data.message || null,
    expiresAt: data.expiresAt || null,
    status: PARTNERSHIP_STATUS.PENDING
  }

  const result = await partnershipModel.createNew(partnershipData)
  
  // Update referenceId for the transaction if it was created
  if (data.proposedSponsorship && data.proposedSponsorship.budget > 0) {
    const { GET_DB } = await import('~/config/mongodb')
    await GET_DB().collection('transactions').updateOne(
      { userId: enterpriseId, type: 'RESERVE', referenceModel: 'Partnership', referenceId: null },
      { $set: { referenceId: String(result.insertedId) } }
    )
  }

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

  const linkedCourseIds = data.agreedTerms?.linkedCourseIds || data.linkedCourseIds || partnership.proposedCourseIds || partnership.requestedCourseIds || []

  // Xử lý tài trợ và khóa quỹ
  if (partnership.proposedSponsorship && linkedCourseIds.length > 0) {
    let totalBudget = partnership.proposedSponsorship.budget || 0;
    
    // Nếu budget chưa được tính toán (bằng null hoặc 0) từ bước tạo, ta tính toán dựa trên khóa học được duyệt
    if (!totalBudget) {
      const course = await courseModel.findOneById(linkedCourseIds[0]); // Thường 1 partnership link 1 khóa học chính
      const targetLearners = partnership.proposedSponsorship.targetLearners || 1;
      
      if (partnership.proposedSponsorship.coverageType === 'FULL') {
        const courseFee = course?.fundingConfig?.price || 0;
        totalBudget = courseFee * targetLearners;
      } else if (partnership.proposedSponsorship.coverageType === 'FIXED_AMOUNT') {
        const fixedAmount = partnership.proposedSponsorship.fixedAmountPerLearner || 0;
        totalBudget = fixedAmount * targetLearners;
      }
    }

    if (totalBudget > 0) {
      // 1. Kiểm tra và khóa ví Doanh nghiệp
      const wallet = await walletModel.findOneByUserId(partnership.enterpriseId);
      if (!wallet || wallet.availableBalance < totalBudget) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Số dư ví không đủ để tài trợ khóa học. Vui lòng nạp thêm tiền!');
      }

      await walletModel.update(partnership.enterpriseId, {
        availableBalance: wallet.availableBalance - totalBudget,
        lockedBalance: (wallet.lockedBalance || 0) + totalBudget
      });

      // 2. Lưu lại Transaction
      const { transactionModel } = await import('~/models/transactionModel');
      await transactionModel.createNew({
        walletId: String(wallet._id),
        userId: partnership.enterpriseId,
        type: 'RESERVE',
        amount: totalBudget,
        description: `Ký quỹ tài trợ cho chương trình hợp tác ${partnership.title || ''}`,
        referenceId: partnershipId,
        referenceModel: 'Partnership',
        status: 'COMPLETED'
      });

      // Cập nhật lại budget vào đối tượng partnership để lưu trữ
      partnership.proposedSponsorship.budget = totalBudget;

      // 3. Tạo Course Sponsorship
      const { COURSE_SPONSORSHIP_STATUS, SCHOLARSHIP_COVERAGE, ORGANIZATION_TYPES } = await import('~/utils/constants');
      
      let coverage = SCHOLARSHIP_COVERAGE.NONE;
      if (partnership.proposedSponsorship.coverageType === 'FULL') {
        coverage = SCHOLARSHIP_COVERAGE.FULL;
      } else if (partnership.proposedSponsorship.coverageType === 'FIXED_AMOUNT') {
        coverage = SCHOLARSHIP_COVERAGE.PARTIAL;
      }

      await courseSponsorshipModel.createNew({
        sponsorType: ORGANIZATION_TYPES.ENTERPRISE,
        sponsorId: partnership.enterpriseId,
        title: `Tài trợ từ ${partnership.enterprise?.displayName || 'Doanh nghiệp'}`,
        linkedCourses: linkedCourseIds.map(cId => ({ courseId: cId, coverage: coverage })),
        budget: totalBudget,
        targetLearners: partnership.proposedSponsorship.targetLearners,
        coverageType: coverage,
        status: COURSE_SPONSORSHIP_STATUS.ACTIVE
      });
    }
  }

  // Luôn luôn update drafted course status to PENDING (Chờ admin duyệt) sau khi Enterprise xác nhận
  if (linkedCourseIds.length > 0) {
    for (const cId of linkedCourseIds) {
      const course = await courseModel.findOneById(cId)
      if (course && course.status === 'draft') {
        await courseModel.updateStatus(cId, 'pending') // COURSE_STATUS.PENDING
      }
    }
  }

  return await partnershipModel.confirm(partnershipId, data)
}

const cancelPartnership = async (partnershipId, actorId, role, reason) => {
  const partnership = await getPartnershipById(partnershipId, actorId, role)
  
  // Hoàn tiền nếu đã khóa
  if (partnership.proposedSponsorship && partnership.proposedSponsorship.budget > 0) {
    const wallet = await walletModel.findOneByUserId(partnership.enterpriseId)
    if (wallet) {
      const budget = partnership.proposedSponsorship.budget
      await walletModel.update(partnership.enterpriseId, {
        availableBalance: wallet.availableBalance + budget,
        lockedBalance: Math.max(0, wallet.lockedBalance - budget)
      })

      // Lưu lịch sử hoàn tiền
      const { transactionModel } = await import('~/models/transactionModel')
      await transactionModel.createNew({
        walletId: String(wallet._id),
        userId: partnership.enterpriseId,
        type: 'REFUND',
        amount: budget,
        description: `Hoàn tiền ký quỹ do hủy hợp tác: ${partnership.title || ''}`,
        referenceId: partnershipId,
        referenceModel: 'Partnership',
        status: 'COMPLETED'
      })

      // Hủy luôn gói tài trợ nếu đã tạo
      const { courseSponsorshipModel } = await import('~/models/courseSponsorshipModel')
      const activeSponsorships = await courseSponsorshipModel.findBySponsor(partnership.enterpriseId, 'enterprise', 0, 100)
      const linkedSponsorship = activeSponsorships?.sponsorships?.find(s => 
        s.linkedCourses?.some(c => partnership.linkedCourseIds?.includes(c.courseId) || partnership.agreedTerms?.linkedCourseIds?.includes(c.courseId))
      )
      if (linkedSponsorship) {
        await courseSponsorshipModel.softDelete(linkedSponsorship._id.toString())
      }
    }
  }

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
