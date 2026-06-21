import { placementModel } from '~/models/placementModel'
import { enrollmentModel } from '~/models/enrollmentModel'
import { partnershipModel } from '~/models/partnershipModel'
import { notificationService } from './notificationService'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import {
  DEFAULT_PAGE,
  DEFAULT_ITEM_PER_PAGE,
  PLACEMENT_STATUS,
  PLACEMENT_REFERRAL_SOURCE
} from '~/utils/constants'

// ============ VALID STATUS TRANSITIONS ============
const VALID_STATUS_TRANSITIONS = {
  [PLACEMENT_STATUS.REFERRED]: [PLACEMENT_STATUS.INTERVIEWING, PLACEMENT_STATUS.REJECTED],
  [PLACEMENT_STATUS.INTERVIEWING]: [PLACEMENT_STATUS.OFFERED, PLACEMENT_STATUS.REJECTED],
  [PLACEMENT_STATUS.OFFERED]: [PLACEMENT_STATUS.ACCEPTED, PLACEMENT_STATUS.REJECTED],
  [PLACEMENT_STATUS.ACCEPTED]: [PLACEMENT_STATUS.STARTED, PLACEMENT_STATUS.RESIGNED],
  [PLACEMENT_STATUS.REJECTED]: [],
  [PLACEMENT_STATUS.STARTED]: [PLACEMENT_STATUS.RESIGNED],
  [PLACEMENT_STATUS.RESIGNED]: []
}

const detectReferralSourceFromEnrollment = (enrollment) => {
  const hasPartnership = !!enrollment?.partnershipId
  const sponsorTypes = new Set((enrollment?.sponsorships || []).map(item => item.sponsorType))
  const hasEnterpriseSponsorship = sponsorTypes.has('enterprise')
  const hasNgoSponsorship = sponsorTypes.has('ngo')

  if ((hasPartnership && hasEnterpriseSponsorship) || (hasEnterpriseSponsorship && hasNgoSponsorship)) {
    return PLACEMENT_REFERRAL_SOURCE.MIXED
  }
  if (hasPartnership) {
    return PLACEMENT_REFERRAL_SOURCE.PARTNERSHIP
  }
  if (hasEnterpriseSponsorship) {
    return PLACEMENT_REFERRAL_SOURCE.ENTERPRISE_SPONSORSHIP
  }
  if (hasNgoSponsorship) {
    return PLACEMENT_REFERRAL_SOURCE.NGO_SPONSORSHIP
  }
  return null
}

const calculateReferralBonus = async (placement, partnership) => {
  const amount = partnership?.agreedTerms?.referralBonus || partnership?.referralBonus || 0
  if (!amount || amount <= 0) return null

  return {
    partnershipId: partnership._id.toString(),
    placementId: placement._id?.toString?.() || placement._id,
    enrollmentId: placement.enrollmentId,
    amount,
    currency: partnership?.recruitmentNeeds?.salaryRange?.currency || 'VND',
    createdAt: Date.now(),
    status: 'pending'
  }
}

const recordReferralBonusEvent = async (placement, partnership) => {
  const bonus = await calculateReferralBonus(placement, partnership)
  if (!bonus) return null

  return await notificationService.queueNotification(
    notificationService.buildNotification(
      notificationService.NOTIFICATION_EVENT_TYPES.REFERRAL_BONUS_CREATED,
      {
        placementId: bonus.placementId,
        partnershipId: bonus.partnershipId,
        amount: bonus.amount,
        recipients: [partnership.enterpriseId, partnership.trainerId].filter(Boolean),
        entityType: 'partnership',
        entityId: bonus.partnershipId,
        bonus
      }
    )
  )
}

// ============ CREATE PLACEMENT ==========
const createPlacement = async (adminId, data) => {
  try {
    const { enrollmentId, courseId } = data

    const enrollment = await enrollmentModel.findOneById(enrollmentId)
    if (!enrollment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Đăng ký không tồn tại!')
    }

    const existing = await placementModel.isActivePlacementExistsForEnrollment(enrollmentId)
    if (existing) {
      throw new ApiError(StatusCodes.CONFLICT, 'Đã có placement đang hoạt động cho đăng ký này!')
    }

    const placementData = {
      enrollmentId,
      userId: enrollment.userId.toString(),
      courseId,
      status: PLACEMENT_STATUS.REFERRED,
      employer: data.employer,
      job: data.job,
      referralSource: data.referralSource || detectReferralSourceFromEnrollment(enrollment),
      partnershipId: data.partnershipId || enrollment.partnershipId || null,
      sponsorshipId: data.sponsorshipId || enrollment.sponsorships?.[0]?.sponsorshipId || null,
      createdBy: adminId,
      partnershipStatsUpdated: false,
      referralBonusRecorded: false
    }

    const result = await placementModel.createNew(placementData)
    const placement = { _id: result.insertedId, ...placementData }
    return placement
  } catch (error) {
    throw error
  }
}

// ============ GET PLACEMENTS ============
const getPlacements = async (query) => {
  try {
    const {
      page = DEFAULT_PAGE,
      item_per_page = DEFAULT_ITEM_PER_PAGE,
      userId,
      courseId,
      status,
      industry,
      partnershipId
    } = query

    const skip = (page - 1) * item_per_page
    const limit = parseInt(item_per_page)

    const matchCondition = {}
    if (userId) matchCondition.userId = userId
    if (courseId) matchCondition.courseId = courseId
    if (status) matchCondition.status = status
    if (industry) matchCondition['employer.industry'] = industry
    if (partnershipId) matchCondition.partnershipId = partnershipId

    const result = await placementModel.findByPaginate(matchCondition, skip, limit)

    // Enrich with user info
    const { userModel } = await import('~/models/userModel')
    const enrichedPlacements = await Promise.all(
      result.placements.map(async (p) => {
        if (p.userId) {
          const user = await userModel.findOneById(p.userId)
          if (user) {
            p.user = {
              _id: user._id,
              displayName: user.displayName || user.username,
              email: user.email,
              avatar: user.avatar
            }
          }
        }
        return p
      })
    )

    return {
      placements: enrichedPlacements,
      pagination: {
        page: parseInt(page),
        item_per_page: limit,
        total: result.total,
        total_pages: Math.ceil(result.total / limit)
      }
    }
  } catch (error) {
    throw error
  }
}

// ============ GET PLACEMENT BY ID ============
const getPlacementById = async (id) => {
  try {
    const placement = await placementModel.findOneById(id)
    if (!placement) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Placement không tồn tại!')
    }
    return placement
  } catch (error) {
    throw error
  }
}

// ============ GET MY PLACEMENTS ============
const getMyPlacements = async (userId, query) => {
  try {
    const result = await placementModel.findByUser(userId, query)
    return {
      placements: result.placements,
      pagination: {
        page: parseInt(query.page || DEFAULT_PAGE),
        item_per_page: parseInt(query.item_per_page || DEFAULT_ITEM_PER_PAGE),
        total: result.total,
        total_pages: Math.ceil(result.total / (parseInt(query.item_per_page) || DEFAULT_ITEM_PER_PAGE))
      }
    }
  } catch (error) {
    throw error
  }
}

// ============ UPDATE PLACEMENT ============
const updatePlacement = async (id, data, adminId) => {
  try {
    const placement = await placementModel.findOneById(id)
    if (!placement) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Placement không tồn tại!')
    }

    const updateData = { ...data }
    delete updateData.status
    delete updateData._destroy
    updateData.updatedBy = adminId

    const updated = await placementModel.update(id, updateData)
    return updated
  } catch (error) {
    throw error
  }
}

// ============ UPDATE PLACEMENT STATUS ============
const updatePlacementStatus = async (id, newStatus, extraData, adminId) => {
  try {
    const placement = await placementModel.findOneById(id)
    if (!placement) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Placement không tồn tại!')
    }

    const currentStatus = placement.status
    const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || []

    if (!allowedTransitions.includes(newStatus)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Không thể chuyển từ trạng thái "${currentStatus}" sang "${newStatus}"!`
      )
    }

    const updateData = { status: newStatus, updatedBy: adminId }

    if (newStatus === PLACEMENT_STATUS.INTERVIEWING && extraData?.interviewDate) {
      updateData.interviewDate = extraData.interviewDate
    }

    if (newStatus === PLACEMENT_STATUS.OFFERED && extraData?.offerDetails) {
      updateData.offerDetails = extraData.offerDetails
    }

    if (newStatus === PLACEMENT_STATUS.STARTED && extraData?.startedDate) {
      updateData.startedDate = extraData.startedDate
    }

    const updated = await placementModel.update(id, updateData)

    if ((newStatus === PLACEMENT_STATUS.ACCEPTED || newStatus === PLACEMENT_STATUS.STARTED) && placement.partnershipId) {
      const latestPlacement = updated?.value || updated
      const alreadyUpdated = placement.partnershipStatsUpdated === true
      const partnership = await partnershipModel.findOneById(placement.partnershipId)

      if (partnership && !alreadyUpdated) {
        await partnershipModel.incrementStat(placement.partnershipId, 'placedLearners', 1)
        await placementModel.update(id, { partnershipStatsUpdated: true })

        await notificationService.notifyPartnershipParticipants(
          partnership,
          notificationService.NOTIFICATION_EVENT_TYPES.ENROLLMENT_PLACED_FOR_PARTNERSHIP,
          {
            placementId: latestPlacement?._id?.toString?.() || id,
            enrollmentId: placement.enrollmentId,
            entityType: 'placement',
            entityId: latestPlacement?._id?.toString?.() || id
          }
        )
      }

      if (partnership && placement.referralBonusRecorded !== true) {
        await recordReferralBonusEvent(latestPlacement || { ...placement, _id: id }, partnership)
        await placementModel.update(id, { referralBonusRecorded: true })
      }
    }

    return updated
  } catch (error) {
    throw error
  }
}

// ============ RESIGN PLACEMENT ============
const resignPlacement = async (id, adminId, reason, date) => {
  try {
    const placement = await placementModel.findOneById(id)
    if (!placement) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Placement không tồn tại!')
    }

    if (placement.status === PLACEMENT_STATUS.RESIGNED) {
      throw new ApiError(StatusCodes.CONFLICT, 'Placement đã được ghi nhận nghỉ việc trước đó!')
    }

    const updated = await placementModel.update(id, {
      status: PLACEMENT_STATUS.RESIGNED,
      resignationReason: reason || null,
      resignationDate: date || new Date(),
      updatedBy: adminId
    })

    return updated
  } catch (error) {
    throw error
  }
}

// ============ SOFT DELETE PLACEMENT ============
const softDeletePlacement = async (id, adminId) => {
  try {
    const placement = await placementModel.findOneById(id)
    if (!placement) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Placement không tồn tại!')
    }

    const deleted = await placementModel.softDelete(id)
    return deleted
  } catch (error) {
    throw error
  }
}

// ============ GET PLACEMENT STATS ============
const getPlacementStats = async (query) => {
  try {
    const { courseId } = query

    const matchCondition = { _destroy: false }
    if (courseId) matchCondition.courseId = courseId

    const db = await (await import('~/config/mongodb')).GET_DB()

    const pipeline = [
      { $match: matchCondition },
      {
        $group: {
          _id: null,
          totalPlacements: { $sum: 1 },
          totalReferred: { $sum: { $cond: [{ $eq: ['$status', PLACEMENT_STATUS.REFERRED] }, 1, 0] } },
          totalInterviewing: { $sum: { $cond: [{ $eq: ['$status', PLACEMENT_STATUS.INTERVIEWING] }, 1, 0] } },
          totalOffered: { $sum: { $cond: [{ $eq: ['$status', PLACEMENT_STATUS.OFFERED] }, 1, 0] } },
          totalAccepted: { $sum: { $cond: [{ $eq: ['$status', PLACEMENT_STATUS.ACCEPTED] }, 1, 0] } },
          totalRejected: { $sum: { $cond: [{ $eq: ['$status', PLACEMENT_STATUS.REJECTED] }, 1, 0] } },
          totalStarted: { $sum: { $cond: [{ $eq: ['$status', PLACEMENT_STATUS.STARTED] }, 1, 0] } },
          totalResigned: { $sum: { $cond: [{ $eq: ['$status', PLACEMENT_STATUS.RESIGNED] }, 1, 0] } },
          avgSalary: { $avg: '$job.salary' },
          industryCounts: { $push: '$employer.industry' }
        }
      }
    ]

    const [statsResult] = await db.collection('placements').aggregate(pipeline).toArray()

    if (!statsResult) {
      return {
        totalPlacements: 0,
        successRate: 0,
        byStatus: {},
        avgSalary: 0,
        industryDistribution: {}
      }
    }

    const successCount = statsResult.totalAccepted + statsResult.totalStarted
    const successRate = statsResult.totalPlacements > 0
      ? Math.round((successCount / statsResult.totalPlacements) * 100)
      : 0

    const industryCounts = {}
    for (const ind of statsResult.industryCounts) {
      if (ind) {
        industryCounts[ind] = (industryCounts[ind] || 0) + 1
      }
    }

    return {
      totalPlacements: statsResult.totalPlacements,
      successRate,
      byStatus: {
        referred: statsResult.totalReferred,
        interviewing: statsResult.totalInterviewing,
        offered: statsResult.totalOffered,
        accepted: statsResult.totalAccepted,
        rejected: statsResult.totalRejected,
        started: statsResult.totalStarted,
        resigned: statsResult.totalResigned
      },
      avgSalary: Math.round(statsResult.avgSalary || 0),
      industryDistribution: industryCounts
    }
  } catch (error) {
    throw error
  }
}

// ============ GIVE FEEDBACK ============
const givePlacementFeedback = async (id, userId, feedbackData) => {
  try {
    const placement = await placementModel.findOneById(id)
    if (!placement) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Placement không tồn tại!')
    }

    if (placement.userId.toString() !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền gửi feedback cho placement này!')
    }

    const updateData = {
      feedback: {
        rating: feedbackData.rating,
        comment: feedbackData.comment,
        submittedAt: new Date()
      },
      updatedBy: userId
    }

    const updated = await placementModel.update(id, updateData)
    return updated
  } catch (error) {
    throw error
  }
}

export const placementService = {
  createPlacement,
  getPlacements,
  getPlacementById,
  getMyPlacements,
  updatePlacement,
  updatePlacementStatus,
  resignPlacement,
  softDeletePlacement,
  getPlacementStats,
  givePlacementFeedback
}
