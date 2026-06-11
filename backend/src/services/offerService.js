import { offerModel } from '~/models/offerModel'
import { applicationModel } from '~/models/applicationModel'
import { placementModel } from '~/models/placementModel'
import { userModel } from '~/models/userModel'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import {
  DEFAULT_PAGE,
  DEFAULT_ITEM_PER_PAGE,
  RECRUITMENT_OFFER_STATUS,
  RECRUITMENT_APPLICATION_STATUS,
  PLACEMENT_STATUS,
  USER_ROLES
} from '~/utils/constants'

// ============ ENTERPRISE: OFFER MANAGEMENT ============

// Tạo offer
const createOffer = async (enterpriseId, data) => {
  try {
    // Kiểm tra application tồn tại
    const application = await applicationModel.findOneByIdAndEnterprise(data.applicationId, enterpriseId)
    if (!application) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn ứng tuyển!')
    }

    // Kiểm tra application đã được phỏng vấn
    if (application.status !== RECRUITMENT_APPLICATION_STATUS.INTERVIEWED &&
        application.status !== RECRUITMENT_APPLICATION_STATUS.OFFERED) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Ứng viên chưa hoàn thành phỏng vấn!')
    }

    // Kiểm tra chưa có offer đang chờ
    const existingOffer = await offerModel.findByApplication(data.applicationId)
    if (existingOffer && existingOffer.status === RECRUITMENT_OFFER_STATUS.PENDING) {
      throw new ApiError(StatusCodes.CONFLICT, 'Đã có offer đang chờ phản hồi cho ứng viên này!')
    }

    // Tính ngày hết hạn (mặc định 7 ngày)
    const expiresAt = data.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const offerData = {
      applicationId: data.applicationId,
      jobId: data.jobId,
      workerId: application.workerId,
      enterpriseId,
      salary: {
        amount: data.salaryAmount,
        currency: data.salaryCurrency || 'VND',
        paymentType: data.paymentType || 'monthly'
      },
      position: data.position,
      startDate: data.startDate,
      probationPeriod: {
        months: data.probationMonths || 2,
        salaryDuringProbation: data.probationSalary || null
      },
      benefits: data.benefits || [],
      workingHours: data.workingHours || '',
      location: data.location || '',
      terms: data.terms || '',
      expiresAt,
      status: RECRUITMENT_OFFER_STATUS.PENDING
    }

    const result = await offerModel.createNew(offerData)

    // Update application status
    await applicationModel.updateStatus(
      data.applicationId,
      RECRUITMENT_APPLICATION_STATUS.OFFERED,
      enterpriseId,
      'Offer đã được tạo'
    )

    // Link offer to application
    await applicationModel.update(data.applicationId, {
      offerId: result.insertedId.toString()
    })

    const offer = await offerModel.findOneById(result.insertedId)
    return offer
  } catch (error) { throw error }
}

// Lấy danh sách offers của enterprise
const getOffers = async (enterpriseId, page = DEFAULT_PAGE, limit = DEFAULT_ITEM_PER_PAGE, filters = {}) => {
  try {
    page = parseInt(page, 10)
    limit = parseInt(limit, 10)
    const skip = (page - 1) * limit
    const { offers, total } = await offerModel.findByEnterprise(enterpriseId, skip, limit, filters)

    return {
      offers,
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error) { throw error }
}

// Lấy chi tiết offer
const getOfferById = async (offerId, userId = null, role = null) => {
  try {
    let offer
    if (role === 'enterprise') {
      offer = await offerModel.findOneByIdAndEnterprise(offerId, userId)
    } else if (role === 'worker') {
      offer = await offerModel.findOneByIdAndWorker(offerId, userId)
    } else {
      offer = await offerModel.findOneById(offerId)
    }

    if (!offer) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy offer!')
    }

    return offer
  } catch (error) { throw error }
}

// Thu hồi offer
const withdrawOffer = async (offerId, enterpriseId) => {
  try {
    const result = await offerModel.withdrawOffer(offerId, enterpriseId)

    // Revert application status
    await applicationModel.updateStatus(
      result.applicationId,
      RECRUITMENT_APPLICATION_STATUS.INTERVIEWED,
      enterpriseId,
      'Offer đã bị thu hồi'
    )

    return result
  } catch (error) { throw error }
}

// ============ WORKER: OFFER RESPONSE ============

// Lấy danh sách offers của worker
const getMyOffers = async (workerId, page = DEFAULT_PAGE, limit = DEFAULT_ITEM_PER_PAGE, filters = {}) => {
  try {
    page = parseInt(page, 10)
    limit = parseInt(limit, 10)
    const skip = (page - 1) * limit
    const { offers, total } = await offerModel.findByWorker(workerId, skip, limit, filters)

    return {
      offers,
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error) { throw error }
}

// Lấy chi tiết offer của worker
const getMyOfferById = async (offerId, workerId) => {
  try {
    const offer = await offerModel.findOneByIdAndWorker(offerId, workerId)
    if (!offer) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy offer!')
    }

    return offer
  } catch (error) { throw error }
}

// Chấp nhận offer
const acceptOffer = async (offerId, workerId, responseNote = null) => {
  try {
    const result = await offerModel.acceptOffer(offerId, workerId, responseNote)

    // Update application status
    await applicationModel.updateStatus(
      result.applicationId,
      RECRUITMENT_APPLICATION_STATUS.HIRED,
      workerId,
      'Offer đã được chấp nhận'
    )

    // Create placement
    await createPlacementFromOffer(result)

    return result
  } catch (error) { throw error }
}

// Từ chối offer
const rejectOffer = async (offerId, workerId, reason = null) => {
  try {
    const result = await offerModel.rejectOffer(offerId, workerId, reason)

    // Revert application status
    await applicationModel.updateStatus(
      result.applicationId,
      RECRUITMENT_APPLICATION_STATUS.INTERVIEWED,
      workerId,
      'Offer đã bị từ chối'
    )

    return result
  } catch (error) { throw error }
}

// ============ PLACEMENT CREATION ============

// Tạo placement từ offer
const createPlacementFromOffer = async (offer) => {
  try {
    const application = await applicationModel.findOneById(offer.applicationId)
    if (!application) {
      throw new Error('Không tìm thấy đơn ứng tuyển')
    }

    // Lấy enterprise info
    const enterprise = await userModel.findOneById(offer.enterpriseId)

    const placementData = {
      workerId: offer.workerId,
      enterpriseId: offer.enterpriseId,
      jobId: offer.jobId,
      applicationId: offer.applicationId,
      employer: {
        name: enterprise?.organization?.name || enterprise?.name || 'Doanh nghiệp',
        logo: enterprise?.organization?.logo || '',
        industry: enterprise?.organization?.industry || '',
        contactPerson: '',
        contactEmail: enterprise?.email || '',
        contactPhone: enterprise?.phone || ''
      },
      job: {
        title: '',
        position: offer.position,
        salary: offer.salary,
        startDate: offer.startDate,
        location: offer.location
      },
      status: PLACEMENT_STATUS.ACCEPTED,
      acceptedAt: Date.now(),
      startedAt: offer.startDate,
      referralSource: 'recruitment_platform'
    }

    const placement = await placementModel.createNew(placementData)

    // Update application with placement
    await applicationModel.update(offer.applicationId, {
      placementId: placement.insertedId.toString()
    })

    return placement
  } catch (error) {
    console.error('Error creating placement from offer:', error)
    throw error
  }
}

// ============ PENDING OFFERS ============

// Lấy offers đang chờ của worker
const getPendingOffers = async (workerId) => {
  try {
    const offers = await offerModel.findPendingOffers(workerId)
    return offers
  } catch (error) { throw error }
}

// ============ STATS ============

// Lấy stats của enterprise
const getEnterpriseStats = async (enterpriseId) => {
  try {
    const stats = await offerModel.getStatsByEnterprise(enterpriseId)
    return stats
  } catch (error) { throw error }
}

export const offerService = {
  // Enterprise
  createOffer,
  getOffers,
  getOfferById,
  withdrawOffer,

  // Worker
  getMyOffers,
  getMyOfferById,
  acceptOffer,
  rejectOffer,
  getPendingOffers,

  // Common
  getEnterpriseStats
}
