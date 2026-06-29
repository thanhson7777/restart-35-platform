import { StatusCodes } from 'http-status-codes'
import { campaignService } from '~/services/campaignService'
import { vnpayInstance } from '~/config/vnpayConfig'

const createCampaign = async (req, res, next) => {
  try {
    const result = await campaignService.createCampaign(req.user._id, req.body)
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Tạo hồ sơ gọi vốn thành công!',
      data: result
    })
  } catch (error) { next(error) }
}

const getCampaigns = async (req, res, next) => {
  try {
    const { page, limit, status, ngoId, workerId } = req.query
    const filters = {}
    if (status) filters.status = status
    if (ngoId) filters.ngoId = ngoId
    if (workerId) filters.workerId = workerId

    const result = await campaignService.getCampaigns(page, limit, filters)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách dự án thành công!',
      data: result.campaigns,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

const getCampaignById = async (req, res, next) => {
  try {
    const result = await campaignService.getCampaignById(req.params.id)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thông tin dự án thành công!',
      data: result
    })
  } catch (error) { next(error) }
}

const approveCampaign = async (req, res, next) => {
  try {
    const result = await campaignService.approveCampaign(req.params.id, req.user._id)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Đã phê duyệt bảo lãnh dự án!',
      data: result
    })
  } catch (error) { next(error) }
}

const donateToCampaign = async (req, res, next) => {
  try {
    const { amount, message } = req.body
    const donorId = req.user._id
    const result = await campaignService.donateToCampaign(req.params.id, donorId, amount, message)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Khởi tạo khoản đóng góp thành công!',
      data: result
    })
  } catch (error) { next(error) }
}

const vnpayCallback = async (req, res, next) => {
  try {
    // Giả lập callback từ VNPAY. Thực tế sẽ check signature ở đây
    const { donationId, transactionId, status } = req.body
    const result = await campaignService.updatePaymentStatus(donationId, transactionId, status)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cập nhật trạng thái thanh toán thành công!',
      data: result
    })
  } catch (error) { next(error) }
}

const addMilestone = async (req, res, next) => {
  try {
    const result = await campaignService.addMilestone(req.params.id, req.user._id, req.body, req.file)
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Cập nhật tiến độ dự án thành công!',
      data: result
    })
  } catch (error) { next(error) }
}

const vnpayIpnCampaign = async (req, res, next) => {
  try {
    const vnpParams = {}
    for (const key in req.query) {
      if (key.startsWith('vnp_')) {
        vnpParams[key] = req.query[key]
      }
    }

    const verifyResult = vnpayInstance.verifyIpnCall(vnpParams)
    
    if (!verifyResult.isSuccess) {
      return res.status(200).json({ RspCode: '97', Message: 'Invalid signature' })
    }

    const txnRef = verifyResult.vnp_TxnRef
    const donationId = txnRef.split('_')[0]

    let status = 'failed'
    if (verifyResult.vnp_ResponseCode === '00' && verifyResult.vnp_TransactionStatus === '00') {
      status = 'success'
    }

    await campaignService.updatePaymentStatus(donationId, txnRef, status)

    return res.status(200).json({ RspCode: '00', Message: 'Confirm Success' })
  } catch (error) {
    console.error('Campaign VNPay IPN error:', error)
    return res.status(200).json({ RspCode: '99', Message: 'Unknown error' })
  }
}

const rejectCampaign = async (req, res, next) => {
  try {
    const result = await campaignService.rejectCampaign(req.params.id, req.user._id)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Đã từ chối bảo lãnh dự án!',
      data: result
    })
  } catch (error) { next(error) }
}

export const campaignController = {
  createCampaign,
  getCampaigns,
  getCampaignById,
  approveCampaign,
  rejectCampaign,
  donateToCampaign,
  vnpayCallback,
  addMilestone,
  vnpayIpnCampaign
}
