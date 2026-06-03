import { isaRepaymentModel } from '~/models/isaRepaymentModel'
import { enrollmentModel } from '~/models/enrollmentModel'
import { courseModel } from '~/models/courseModel'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import {
  DEFAULT_PAGE,
  DEFAULT_ITEM_PER_PAGE,
  ISA_REPAYMENT_STATUS,
  ENROLLMENT_PAYMENT_STATUS
} from '~/utils/constants'

// ============ CREATE ============
const createIsaRepayment = async (enrollmentId, config) => {
  try {
    const enrollment = await enrollmentModel.findOneById(enrollmentId)
    if (!enrollment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Đăng ký không tồn tại!')
    }

    const existing = await isaRepaymentModel.findByEnrollment(enrollmentId)
    if (existing) {
      throw new ApiError(StatusCodes.CONFLICT, 'ISA record cho đăng ký này đã tồn tại!')
    }

    const course = await courseModel.findOneById(enrollment.courseId)

    const repaymentPeriod = {
      startMonth: new Date(),
      endMonth: new Date(new Date().setMonth(new Date().getMonth() + (config.isaDuration || 24))),
      currentMonth: 0
    }

    const isaData = {
      enrollmentId: enrollmentId,
      userId: enrollment.userId.toString(),
      courseId: enrollment.courseId.toString(),
      percentage: config.isaPercentage || 0,
      incomeThreshold: config.isaThreshold || 0,
      maxCap: config.isaMaxCap || course?.fee || 0,
      totalPaidAmount: 0,
      repaymentPeriod,
      monthlyRecords: [],
      status: 'pending'
    }

    const result = await isaRepaymentModel.createNew(isaData)
    const isa = await isaRepaymentModel.findOneById(result.insertedId)
    return isa
  } catch (error) {
    throw error
  }
}

// ============ READ ============
const getIsaRepayments = async (query) => {
  try {
    const {
      page = DEFAULT_PAGE,
      item_per_page = DEFAULT_ITEM_PER_PAGE,
      userId,
      status
    } = query

    const skip = (page - 1) * item_per_page
    const limit = parseInt(item_per_page)

    const matchCondition = { _destroy: false }

    if (userId) matchCondition.userId = userId
    if (status) matchCondition.status = status

    const result = await isaRepaymentModel.findByPaginate(matchCondition, skip, limit)

    return {
      repayments: result.records,
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

const getIsaRepaymentById = async (id) => {
  try {
    const isa = await isaRepaymentModel.findOneById(id)
    if (!isa) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'ISA repayment không tồn tại!')
    }
    return isa
  } catch (error) {
    throw error
  }
}

const getMyIsaRepayments = async (userId) => {
  try {
    const result = await isaRepaymentModel.findByPaginate({ userId, _destroy: false }, 0, 100)
    return result.records
  } catch (error) {
    throw error
  }
}

// ============ SUBMIT INCOME ============
const submitIncome = async (userId, isaId, month, year, income, incomeProof) => {
  try {
    const isa = await isaRepaymentModel.findOneById(isaId)
    if (!isa) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'ISA repayment không tồn tại!')
    }

    if (isa.userId.toString() !== userId.toString()) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền nộp thu nhập cho ISA này!')
    }

    if (isa.status !== 'active') {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'ISA chưa được kích hoạt!')
    }

    const existingRecord = isa.monthlyRecords?.find(r => r.month === month && r.year === year)
    if (existingRecord) {
      throw new ApiError(StatusCodes.CONFLICT, `Đã nộp thu nhập cho tháng ${month}/${year} rồi!`)
    }

    const paymentAmount = calculateMonthlyAmount(isa, income)
    const record = {
      month,
      year,
      income,
      paymentAmount,
      status: ISA_REPAYMENT_STATUS.PENDING,
      paidDate: null,
      incomeProof: incomeProof || null
    }

    const updated = await isaRepaymentModel.addMonthlyRecord(isaId, record)
    return updated
  } catch (error) {
    throw error
  }
}

// ============ ACTIVATE ============
const activateIsaRepayment = async (isaId) => {
  try {
    const isa = await isaRepaymentModel.findOneById(isaId)
    if (!isa) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'ISA repayment không tồn tại!')
    }

    if (isa.status !== 'pending') {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'ISA đã được kích hoạt hoặc kết thúc!')
    }

    const updated = await isaRepaymentModel.update(isaId, { status: 'active' })

    await enrollmentModel.updatePaymentStatus(isa.enrollmentId, ENROLLMENT_PAYMENT_STATUS.ISA_PENDING)

    return updated
  } catch (error) {
    throw error
  }
}

// ============ CALCULATE MONTHLY ============
const calculateMonthlyPayment = async (isaId, month) => {
  try {
    const isa = await isaRepaymentModel.findOneById(isaId)
    if (!isa) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'ISA repayment không tồn tại!')
    }

    return calculateMonthlyAmount(isa, null)
  } catch (error) {
    throw error
  }
}

const calculateMonthlyAmount = (isa, income) => {
  const { percentage, incomeThreshold, maxCap, totalPaidAmount } = isa
  if (income === null || income === undefined) {
    return 0
  }
  if (income <= incomeThreshold) {
    return 0
  }
  const excess = income - incomeThreshold
  let amount = Math.round((excess * percentage) / 100)
  const remaining = maxCap - totalPaidAmount
  if (remaining <= 0) return 0
  return Math.min(amount, remaining)
}

// ============ UPDATE MONTHLY RECORD ============
const updateMonthlyRecord = async (isaId, month, year, data) => {
  try {
    const isa = await isaRepaymentModel.findOneById(isaId)
    if (!isa) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'ISA repayment không tồn tại!')
    }

    const updateData = {}
    if (data.income !== undefined) updateData.income = data.income
    if (data.paymentAmount !== undefined) updateData.paymentAmount = data.paymentAmount
    if (data.status !== undefined) updateData.status = data.status
    if (data.paidDate !== undefined) updateData.paidDate = data.paidDate || null
    if (data.incomeProof !== undefined) updateData.incomeProof = data.incomeProof || null

    const updated = await isaRepaymentModel.updateMonthlyRecord(isaId, month, year, updateData)
    if (!updated) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy bản ghi tháng này!')
    }

    if (data.status === ISA_REPAYMENT_STATUS.PAID && data.paymentAmount > 0) {
      await isaRepaymentModel.addPayment(isaId, data.paymentAmount)
    }

    return updated
  } catch (error) {
    throw error
  }
}

// ============ GET STATUS ============
const getIsaStatus = async (isaId) => {
  try {
    const isa = await isaRepaymentModel.findOneById(isaId)
    if (!isa) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'ISA repayment không tồn tại!')
    }

    const paidRecords = isa.monthlyRecords?.filter(r => r.status === ISA_REPAYMENT_STATUS.PAID) || []
    const pendingRecords = isa.monthlyRecords?.filter(r => r.status === ISA_REPAYMENT_STATUS.PENDING) || []

    const nextDue = isa.repaymentPeriod?.currentMonth
      ? { month: isa.repaymentPeriod.currentMonth + 1, year: new Date().getFullYear() }
      : null

    return {
      _id: isa._id,
      status: isa.status,
      totalPaid: isa.totalPaidAmount,
      remainingCap: isa.maxCap - isa.totalPaidAmount,
      percentage: isa.percentage,
      incomeThreshold: isa.incomeThreshold,
      paidMonths: paidRecords.length,
      pendingMonths: pendingRecords.length,
      nextDue,
      repaymentPeriod: isa.repaymentPeriod
    }
  } catch (error) {
    throw error
  }
}

// ============ CAP / WAIVE / COMPLETE ============
const capIsaRepayment = async (isaId) => {
  try {
    const isa = await isaRepaymentModel.findOneById(isaId)
    if (!isa) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'ISA repayment không tồn tại!')
    }

    const updated = await isaRepaymentModel.update(isaId, {
      status: 'capped',
      totalPaidAmount: isa.maxCap
    })

    await enrollmentModel.updatePaymentStatus(isa.enrollmentId, ENROLLMENT_PAYMENT_STATUS.PAID)

    return updated
  } catch (error) {
    throw error
  }
}

const waiveIsaRepayment = async (isaId, reason) => {
  try {
    const isa = await isaRepaymentModel.findOneById(isaId)
    if (!isa) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'ISA repayment không tồn tại!')
    }

    const updated = await isaRepaymentModel.update(isaId, {
      status: 'waived',
      waiverReason: reason || null
    })

    await enrollmentModel.updatePaymentStatus(isa.enrollmentId, ENROLLMENT_PAYMENT_STATUS.WAIVED)

    return updated
  } catch (error) {
    throw error
  }
}

const completeIsaRepayment = async (isaId) => {
  try {
    const isa = await isaRepaymentModel.findOneById(isaId)
    if (!isa) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'ISA repayment không tồn tại!')
    }

    const updated = await isaRepaymentModel.update(isaId, { status: 'completed' })
    return updated
  } catch (error) {
    throw error
  }
}

export const isaRepaymentService = {
  createIsaRepayment,
  getIsaRepayments,
  getIsaRepaymentById,
  getMyIsaRepayments,
  submitIncome,
  activateIsaRepayment,
  calculateMonthlyPayment,
  updateMonthlyRecord,
  getIsaStatus,
  capIsaRepayment,
  waiveIsaRepayment,
  completeIsaRepayment
}
