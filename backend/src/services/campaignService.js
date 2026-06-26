import { campaignModel } from '~/models/campaignModel'
import { donationModel } from '~/models/donationModel'
import { milestoneModel } from '~/models/milestoneModel'
import { userModel } from '~/models/userModel'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { DEFAULT_PAGE, DEFAULT_ITEM_PER_PAGE } from '~/utils/constants'

// ============ WORKER: CREATE CAMPAIGN ============
const createCampaign = async (workerId, data) => {
  try {
    const ngo = await userModel.findOneById(data.ngoId)
    if (!ngo || ngo.role !== 'ngo') {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Tổ chức bảo lãnh không hợp lệ hoặc không tồn tại!')
    }

    const newCampaign = {
      ...data,
      workerId,
      status: 'pending_ngo'
    }

    const created = await campaignModel.createNew(newCampaign)
    return await campaignModel.findOneById(created.insertedId)
  } catch (error) {
    throw error
  }
}

// ============ GENERAL: GET CAMPAIGNS ============
const getCampaigns = async (page = DEFAULT_PAGE, limit = DEFAULT_ITEM_PER_PAGE, filters = {}) => {
  try {
    const skip = (page - 1) * limit
    const result = await campaignModel.getCampaigns(skip, limit, filters)

    // Lấy thông tin phụ cho các campaign
    const enrichedCampaigns = await Promise.all(result.campaigns.map(async (camp) => {
      const worker = await userModel.findOneById(camp.workerId)
      const ngo = await userModel.findOneById(camp.ngoId)
      return {
        ...camp,
        workerName: worker?.displayName || 'Người lao động',
        ngoName: ngo?.displayName || 'Tổ chức NGO'
      }
    }))

    return {
      campaigns: enrichedCampaigns,
      pagination: {
        page,
        limit,
        totalItems: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    }
  } catch (error) {
    throw error
  }
}

// ============ GENERAL: GET CAMPAIGN DETAILS ============
const getCampaignById = async (campaignId) => {
  try {
    const campaign = await campaignModel.findOneById(campaignId)
    if (!campaign) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy dự án!')
    }

    const worker = await userModel.findOneById(campaign.workerId)
    const ngo = await userModel.findOneById(campaign.ngoId)
    const milestones = await milestoneModel.getMilestonesByCampaign(campaignId)

    return {
      ...campaign,
      workerName: worker?.displayName,
      workerAvatar: worker?.avatar,
      ngoName: ngo?.displayName,
      milestones
    }
  } catch (error) {
    throw error
  }
}

// ============ NGO: APPROVE CAMPAIGN ============
const approveCampaign = async (campaignId, ngoId) => {
  try {
    const campaign = await campaignModel.findOneById(campaignId)
    if (!campaign || campaign.ngoId.toString() !== ngoId.toString()) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền bảo lãnh dự án này!')
    }
    
    if (campaign.status !== 'pending_ngo') {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Dự án không ở trạng thái chờ duyệt!')
    }

    const updated = await campaignModel.update(campaignId, { status: 'funding' })
    return updated.value
  } catch (error) {
    throw error
  }
}

// ============ DONOR: DONATE ============
const donateToCampaign = async (campaignId, donorId, amount, message) => {
  try {
    const campaign = await campaignModel.findOneById(campaignId)
    if (!campaign || campaign.status !== 'funding') {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Dự án không tồn tại hoặc không trong trạng thái nhận tài trợ!')
    }

    const donationData = {
      campaignId,
      donorId,
      amount,
      message,
      paymentStatus: 'pending' // Chờ VNPAY xác nhận
    }

    const created = await donationModel.createNew(donationData)
    const donation = await donationModel.findOneById(created.insertedId)

    // TẠI ĐÂY: Nếu có VNPAY, sẽ tạo link thanh toán và trả về link. 
    // Do mô phỏng, tạm thời cập nhật luôn thành công nếu muốn test nhanh, hoặc chờ API callback.
    // Mình sẽ tạo sẵn hàm xử lý callback bên dưới.

    return {
      donation,
      // paymentUrl: 'https://sandbox.vnpayment.vn/paymentv2/...' 
    }
  } catch (error) {
    throw error
  }
}

// ============ VNPAY CALLBACK / UPDATE PAYMENT ============
const updatePaymentStatus = async (donationId, transactionId, status) => {
  try {
    const donation = await donationModel.findOneById(donationId)
    if (!donation) throw new ApiError(StatusCodes.NOT_FOUND, 'Giao dịch không tồn tại')

    const updatedDonation = await donationModel.update(donationId, {
      paymentStatus: status,
      transactionId: transactionId
    })

    if (status === 'success' && donation.paymentStatus !== 'success') {
      // Cộng dồn tiền vào campaign
      const campaign = await campaignModel.findOneById(donation.campaignId)
      const newRaisedAmount = (campaign.raisedAmount || 0) + donation.amount
      
      let newStatus = campaign.status
      if (newRaisedAmount >= campaign.targetAmount) {
        newStatus = 'funded' // Đạt mục tiêu
      }

      await campaignModel.update(campaign._id, {
        raisedAmount: newRaisedAmount,
        status: newStatus
      })
    }

    return updatedDonation.value
  } catch (error) {
    throw error
  }
}

// ============ NGO: ADD MILESTONE ============
const addMilestone = async (campaignId, ngoId, milestoneData) => {
  try {
    const campaign = await campaignModel.findOneById(campaignId)
    if (!campaign || campaign.ngoId.toString() !== ngoId.toString()) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền báo cáo cho dự án này!')
    }

    const newMilestone = {
      ...milestoneData,
      campaignId,
      ngoId
    }

    const created = await milestoneModel.createNew(newMilestone)
    
    // Nếu có tiền giải ngân đợt này, cập nhật trạng thái campaign thành 'disbursing'
    if (milestoneData.disbursedAmount > 0 && campaign.status === 'funded') {
      await campaignModel.update(campaignId, { status: 'disbursing' })
    }

    return await milestoneModel.getMilestonesByCampaign(campaignId)
  } catch (error) {
    throw error
  }
}

export const campaignService = {
  createCampaign,
  getCampaigns,
  getCampaignById,
  approveCampaign,
  donateToCampaign,
  updatePaymentStatus,
  addMilestone
}
