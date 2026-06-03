import { fundingConfigModel } from '~/models/fundingConfigModel'
import { courseModel } from '~/models/courseModel'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import {
  DEFAULT_PAGE,
  DEFAULT_ITEM_PER_PAGE,
  FUNDING_LEARNER_PAY_MODE
} from '~/utils/constants'

// ============ CREATE ============
const createFundingConfig = async (adminId, data) => {
  try {
    const course = await courseModel.findOneById(data.courseId)
    if (!course) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Khóa học không tồn tại!')
    }

    const existing = await fundingConfigModel.findByCourse(data.courseId)
    if (existing) {
      throw new ApiError(StatusCodes.CONFLICT, 'Funding config cho khóa học này đã tồn tại!')
    }

    const result = await fundingConfigModel.createNew(data)
    const config = await fundingConfigModel.findOneById(result.insertedId)
    return config
  } catch (error) {
    throw error
  }
}

// ============ READ ============
const getFundingConfigs = async (query) => {
  try {
    const {
      page = DEFAULT_PAGE,
      item_per_page = DEFAULT_ITEM_PER_PAGE,
      courseId,
      learner_pay_mode
    } = query

    const skip = (page - 1) * item_per_page
    const limit = parseInt(item_per_page)

    const matchCondition = { _destroy: false }

    if (courseId) {
      matchCondition.courseId = courseId
    }
    if (learner_pay_mode) {
      matchCondition.learner_pay_mode = learner_pay_mode
    }

    const result = await fundingConfigModel.findByPaginate(matchCondition, skip, limit)

    return {
      configs: result.configs,
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

const getFundingConfigByCourse = async (courseId) => {
  try {
    const config = await fundingConfigModel.findByCourse(courseId)
    if (!config) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Funding config cho khóa học này không tồn tại!')
    }
    return config
  } catch (error) {
    throw error
  }
}

// ============ UPDATE ============
const updateFundingConfig = async (courseId, data) => {
  try {
    const existing = await fundingConfigModel.findByCourse(courseId)
    if (!existing) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Funding config cho khóa học này không tồn tại!')
    }

    const updated = await fundingConfigModel.updateByCourse(courseId, data)
    return updated
  } catch (error) {
    throw error
  }
}

// ============ DELETE ============
const deleteFundingConfig = async (courseId) => {
  try {
    const existing = await fundingConfigModel.findByCourse(courseId)
    if (!existing) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Funding config cho khóa học này không tồn tại!')
    }

    await fundingConfigModel.softDeleteByCourse(courseId)
    return { deletedCourseId: courseId }
  } catch (error) {
    throw error
  }
}

// ============ CALCULATE ============
const calculateFunding = async (courseId, amount, mode) => {
  try {
    const config = await fundingConfigModel.findByCourse(courseId)
    if (!config) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Funding config cho khóa học này không tồn tại!')
    }

    const { learner_pay_mode, configs } = config

    let breakdown = {}

    switch (mode) {
      case FUNDING_LEARNER_PAY_MODE.NONE:
        breakdown = {
          total: 0,
          upfront: 0,
          description: 'Miễn phí'
        }
        break

      case FUNDING_LEARNER_PAY_MODE.UPFRONT:
        breakdown = {
          total: amount,
          upfront: amount,
          description: 'Thanh toán một lần'
        }
        break

      case FUNDING_LEARNER_PAY_MODE.DEPOSIT:
        const deposit = configs.depositAmount || 0
        breakdown = {
          total: amount,
          depositAmount: deposit,
          remainingAmount: amount - deposit,
          description: 'Đặt cọc trước, phần còn lại thanh toán sau'
        }
        break

      case FUNDING_LEARNER_PAY_MODE.INSTALLMENT:
        const count = configs.installmentCount || 1
        const perInstallment = configs.installmentAmount || Math.ceil(amount / count)
        breakdown = {
          total: amount,
          installmentCount: count,
          installmentAmount: perInstallment,
          description: `Trả góp ${count} kỳ`
        }
        break

      case FUNDING_LEARNER_PAY_MODE.ISA:
        breakdown = {
          total: amount,
          isaPercentage: configs.isaPercentage || 0,
          isaThreshold: configs.isaThreshold || 0,
          isaMaxCap: configs.isaMaxCap || 0,
          isaDuration: configs.isaDuration || 0,
          description: `Trả sau khi có thu nhập: ${configs.isaPercentage || 0}% thu nhập vượt ${(configs.isaThreshold || 0).toLocaleString()} VND/tháng`
        }
        break

      default:
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Hình thức thanh toán không hợp lệ!')
    }

    return {
      courseId,
      amount,
      mode,
      learner_pay_mode,
      ...breakdown
    }
  } catch (error) {
    throw error
  }
}

export const fundingConfigService = {
  createFundingConfig,
  getFundingConfigs,
  getFundingConfigByCourse,
  updateFundingConfig,
  deleteFundingConfig,
  calculateFunding
}
