import { placementModel } from '~/models/placementModel'
import { enrollmentModel } from '~/models/enrollmentModel'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import {
  DEFAULT_PAGE,
  DEFAULT_ITEM_PER_PAGE,
  PLACEMENT_STATUS
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

// ============ CREATE PLACEMENT ============
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
      referralSource: data.referralSource || null,
      createdBy: adminId
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
      industry
    } = query

    const skip = (page - 1) * item_per_page
    const limit = parseInt(item_per_page)

    const matchCondition = {}
    if (userId) matchCondition.userId = userId
    if (courseId) matchCondition.courseId = courseId
    if (status) matchCondition.status = status
    if (industry) matchCondition['employer.industry'] = industry

    const result = await placementModel.findByPaginate(matchCondition, skip, limit)

    return {
      placements: result.placements,
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

export const placementService = {
  createPlacement,
  getPlacements,
  getPlacementById,
  getMyPlacements,
  updatePlacement,
  updatePlacementStatus,
  resignPlacement,
  softDeletePlacement,
  getPlacementStats
}
