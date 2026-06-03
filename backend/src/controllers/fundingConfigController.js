import { fundingConfigService } from '~/services/fundingConfigService'
import { StatusCodes } from 'http-status-codes'

// ============ CREATE ============
const createFundingConfig = async (req, res, next) => {
  try {
    const adminId = req.user._id.toString()
    const config = await fundingConfigService.createFundingConfig(adminId, req.body)

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Tạo funding config thành công!',
      data: config
    })
  } catch (error) {
    next(error)
  }
}

// ============ READ ============
const getFundingConfigs = async (req, res, next) => {
  try {
    const result = await fundingConfigService.getFundingConfigs(req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách funding config thành công!',
      data: result.configs,
      pagination: result.pagination
    })
  } catch (error) {
    next(error)
  }
}

const getFundingConfigByCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params
    const config = await fundingConfigService.getFundingConfigByCourse(courseId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy funding config thành công!',
      data: config
    })
  } catch (error) {
    next(error)
  }
}

// ============ UPDATE ============
const updateFundingConfig = async (req, res, next) => {
  try {
    const { courseId } = req.params
    const config = await fundingConfigService.updateFundingConfig(courseId, req.body)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cập nhật funding config thành công!',
      data: config
    })
  } catch (error) {
    next(error)
  }
}

// ============ DELETE ============
const deleteFundingConfig = async (req, res, next) => {
  try {
    const { courseId } = req.params
    await fundingConfigService.deleteFundingConfig(courseId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Xóa funding config thành công!'
    })
  } catch (error) {
    next(error)
  }
}

// ============ CALCULATE ============
const calculateFunding = async (req, res, next) => {
  try {
    const { courseId } = req.params
    const { amount, mode } = req.query
    const result = await fundingConfigService.calculateFunding(courseId, parseInt(amount), mode)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Tính phí thanh toán thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const fundingConfigController = {
  createFundingConfig,
  getFundingConfigs,
  getFundingConfigByCourse,
  updateFundingConfig,
  deleteFundingConfig,
  calculateFunding
}
