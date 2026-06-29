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
    const savedCampaign = await campaignModel.findOneById(created.insertedId)

    // Notify NGO
    const { notificationService } = await import('~/services/notificationService')
    await notificationService.createUserNotification({
      recipientId: data.ngoId.toString(),
      type: 'NEW_CAMPAIGN_REQUEST',
      title: 'Yêu cầu bảo lãnh dự án mới',
      message: `Một người lao động vừa gửi yêu cầu bảo lãnh dự án "${savedCampaign.title}".`,
      link: `/ngo/campaign-approvals`
    }).catch(err => console.error('Failed to notify NGO for new campaign:', err))

    return savedCampaign
  } catch (error) {
    throw error
  }
}

// ============ GENERAL: GET CAMPAIGNS ============
const getCampaigns = async (page = DEFAULT_PAGE, limit = DEFAULT_ITEM_PER_PAGE, filters = {}) => {
  try {
    const parsedPage = Number(page) || DEFAULT_PAGE
    const parsedLimit = Number(limit) || DEFAULT_ITEM_PER_PAGE
    const skip = (parsedPage - 1) * parsedLimit
    const result = await campaignModel.getCampaigns(skip, parsedLimit, filters)

    // Lấy thông tin phụ cho các campaign
    const enrichedCampaigns = await Promise.all(result.campaigns.map(async (camp) => {
      const worker = await userModel.findOneById(camp.workerId)
      const ngo = await userModel.findOneById(camp.ngoId)
      
      let ngoName = ngo?.displayName || 'Tổ chức NGO'
      if (ngo?.organizationId) {
        const { organizationModel } = await import('~/models/organizationModel')
        const org = await organizationModel.findOneById(ngo.organizationId)
        if (org && org.name) {
          ngoName = org.name
        }
      }

      return {
        ...camp,
        workerName: worker?.displayName || 'Người lao động',
        ngoName
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
    const { donationModel } = await import('~/models/donationModel')
    const donationsData = await donationModel.getDonationsByCampaign(campaignId, 0, 50) // Lấy 50 lượt quyên góp gần nhất

    // Enrich donations with donor name/avatar
    const enrichedDonations = await Promise.all(donationsData.donations.map(async (donation) => {
      const donor = await userModel.findOneById(donation.donorId)
      return {
        ...donation,
        donorName: donation.isAnonymous ? 'Nhà hảo tâm ẩn danh' : (donor?.displayName || 'Nhà tài trợ ẩn danh'),
        donorAvatar: donation.isAnonymous ? null : donor?.avatar
      }
    }))

    let ngoName = ngo?.displayName
    if (ngo?.organizationId) {
      const { organizationModel } = await import('~/models/organizationModel')
      const org = await organizationModel.findOneById(ngo.organizationId)
      if (org && org.name) {
        ngoName = org.name
      }
    }

    return {
      ...campaign,
      workerName: worker?.displayName,
      workerAvatar: worker?.avatar,
      ngoName,
      milestones,
      donations: enrichedDonations
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

    const { notificationService } = await import('~/services/notificationService')
    await notificationService.createUserNotification({
      recipientId: campaign.workerId.toString(),
      type: 'CAMPAIGN_APPROVED',
      title: 'Dự án đã được bảo lãnh',
      message: `Dự án "${campaign.title}" của bạn đã được tổ chức bảo lãnh và hiện đang trong quá trình gọi vốn.`,
      link: `/worker/campaigns`
    }).catch(err => console.error('Failed to notify worker for campaign approval:', err))

    return updated.value
  } catch (error) {
    throw error
  }
}

// ============ NGO: REJECT CAMPAIGN ============
const rejectCampaign = async (campaignId, ngoId) => {
  try {
    const campaign = await campaignModel.findOneById(campaignId)
    if (!campaign || campaign.ngoId.toString() !== ngoId.toString()) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền từ chối dự án này!')
    }
    
    if (campaign.status !== 'pending_ngo') {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Dự án không ở trạng thái chờ duyệt!')
    }

    const updated = await campaignModel.update(campaignId, { status: 'rejected' })

    const { notificationService } = await import('~/services/notificationService')
    await notificationService.createUserNotification({
      recipientId: campaign.workerId.toString(),
      type: 'CAMPAIGN_REJECTED',
      title: 'Dự án bị từ chối',
      message: `Rất tiếc, dự án "${campaign.title}" của bạn đã bị tổ chức từ chối bảo lãnh.`,
      link: `/worker/campaigns`
    }).catch(err => console.error('Failed to notify worker for campaign rejection:', err))

    return updated.value
  } catch (error) {
    throw error
  }
}

// ============ DONOR: DONATE ============
const donateToCampaign = async (campaignId, donorId, amount, message, isAnonymous = false) => {
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
      isAnonymous,
      paymentStatus: 'pending' // Chờ VNPAY xác nhận
    }

    const created = await donationModel.createNew(donationData)
    const donation = await donationModel.findOneById(created.insertedId)

    // TẠI ĐÂY: Nếu có VNPAY, sẽ tạo link thanh toán và trả về link. 
    const { vnpayInstance } = await import('~/config/vnpayConfig')
    const { env } = await import('~/config/enviroment')
    
    const paymentUrl = vnpayInstance.buildPaymentUrl({
      vnp_Amount: amount,
      vnp_IpAddr: '127.0.0.1',
      vnp_TxnRef: `${donation._id.toString()}_${Date.now()}`,
      vnp_OrderInfo: `Quyen gop du an ${campaignId}`,
      vnp_OrderType: 'other',
      vnp_ReturnUrl: `${env.VNP_RETURN_URL || 'http://localhost:5173/payment/vnpay-return'}?type=campaign`,
    })

    return {
      donation,
      paymentUrl 
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
        newStatus = 'completed' // Đạt mục tiêu
      }

      await campaignModel.update(campaign._id, {
        raisedAmount: newRaisedAmount,
        status: newStatus
      })

      const { walletModel } = await import('~/models/walletModel')
      const { transactionModel } = await import('~/models/transactionModel')
      const { notificationService } = await import('~/services/notificationService')

      // 1. Cập nhật ví và tạo lịch sử cho Worker
      const workerWallet = await walletModel.findOrCreateByUserId(campaign.workerId)
      await walletModel.update(campaign.workerId, { 
        availableBalance: (workerWallet.availableBalance || 0) + donation.amount 
      })

      await transactionModel.createNew({
        walletId: String(workerWallet._id),
        userId: String(campaign.workerId),
        type: 'DEPOSIT', // Để khớp với tab IN của worker
        amount: donation.amount,
        description: `Nhận tài trợ từ dự án: ${campaign.title}`,
        status: 'COMPLETED',
        referenceId: String(campaign._id)
      })

      // 2. Tạo lịch sử giao dịch cho Người ủng hộ (Donor)
      const donorWallet = await walletModel.findOrCreateByUserId(donation.donorId)
      await transactionModel.createNew({
        walletId: String(donorWallet._id),
        userId: String(donation.donorId),
        type: 'PAYMENT', // PAYMENT hợp lệ trong model
        amount: donation.amount,
        description: `Ủng hộ dự án: ${campaign.title}`,
        status: 'COMPLETED',
        referenceId: String(campaign._id)
      })

      // 3. Notify Worker
      await notificationService.createUserNotification({
        recipientId: campaign.workerId.toString(),
        title: 'Nhận được tài trợ mới!',
        message: `Dự án "${campaign.title}" vừa nhận được ${donation.amount.toLocaleString('vi-VN')} VND. Tiền đã được cộng vào ví của bạn.`,
        type: 'CAMPAIGN_DONATION',
        link: '/worker/campaigns'
      })

      // 4. Notify NGO if completed
      if (newStatus === 'completed') {
        await notificationService.createUserNotification({
          recipientId: campaign.ngoId.toString(),
          title: 'Dự án bảo lãnh đã giải ngân',
          message: `Dự án "${campaign.title}" do bạn bảo lãnh đã kết thúc và gọi vốn thành công.`,
          type: 'CAMPAIGN_PAYOUT',
          link: '/ngo/campaigns'
        })
      }
    }

    return updatedDonation.value
  } catch (error) {
    throw error
  }
}

// ============ AUTO PAYOUT (FLEXIBLE FUNDING) ============
// Đã được tích hợp trực tiếp vào updatePaymentStatus ở trên để tiền cộng ngay lập tức
const processCampaignPayout = async (campaignId) => {
  return true
}

// ============ WORKER: ADD MILESTONE ============
const addMilestone = async (campaignId, workerId, milestoneData, file) => {
  try {
    const campaign = await campaignModel.findOneById(campaignId)
    if (!campaign || campaign.workerId.toString() !== workerId.toString()) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền báo cáo cho dự án này!')
    }

    let proofImageUrl = ''
    if (file) {
      const { CloudinaryProvider } = await import('~/providers/CloudinaryProvider')
      const result = await CloudinaryProvider.streamUpload(file.buffer, 'campaign-milestones')
      proofImageUrl = result.secure_url
    }

    const proofImages = milestoneData.proofImages ? (Array.isArray(milestoneData.proofImages) ? milestoneData.proofImages : [milestoneData.proofImages]) : []
    if (proofImageUrl) {
      proofImages.push(proofImageUrl)
    }

    const newMilestone = {
      ...milestoneData,
      proofImages,
      campaignId,
      workerId
    }

    const created = await milestoneModel.createNew(newMilestone)

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
  rejectCampaign,
  donateToCampaign,
  updatePaymentStatus,
  processCampaignPayout,
  addMilestone
}
