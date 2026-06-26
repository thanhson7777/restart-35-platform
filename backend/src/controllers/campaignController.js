import { StatusCodes } from 'http-status-codes'
import { campaignService } from '~/services/campaignService'

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
    const { page, limit, status, ngoId } = req.query
    const filters = {}
    if (status) filters.status = status
    if (ngoId) filters.ngoId = ngoId

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
    const result = await campaignService.addMilestone(req.params.id, req.user._id, req.body)
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Cập nhật tiến độ dự án thành công!',
      data: result
    })
  } catch (error) { next(error) }
}

export const campaignController = {
  createCampaign,
  getCampaigns,
  getCampaignById,
  approveCampaign,
  donateToCampaign,
  vnpayCallback,
  addMilestone
}
