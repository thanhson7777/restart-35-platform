import { isaRepaymentService } from '~/services/isaRepaymentService'
import { StatusCodes } from 'http-status-codes'

// ============ CREATE ============
const createIsaRepayment = async (req, res, next) => {
  try {
    const isa = await isaRepaymentService.createIsaRepayment(req.body.enrollmentId, req.body)

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Tạo ISA repayment thành công!',
      data: isa
    })
  } catch (error) {
    next(error)
  }
}

// ============ READ ============
const getIsaRepayments = async (req, res, next) => {
  try {
    const result = await isaRepaymentService.getIsaRepayments(req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách ISA repayments thành công!',
      data: result.repayments,
      pagination: result.pagination
    })
  } catch (error) {
    next(error)
  }
}

const getMyIsaRepayments = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id.toString()
    const repayments = await isaRepaymentService.getMyIsaRepayments(userId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách ISA của tôi thành công!',
      data: repayments
    })
  } catch (error) {
    next(error)
  }
}

const getIsaRepaymentById = async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.jwtDecoded._id.toString()
    const userRole = req.jwtDecoded.role
    const isa = await isaRepaymentService.getIsaRepaymentById(id)

    if (isa.userId.toString() !== userId && userRole !== 'admin') {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: 'Bạn không có quyền xem ISA này!'
      })
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thông tin ISA thành công!',
      data: isa
    })
  } catch (error) {
    next(error)
  }
}

// ============ SUBMIT INCOME ============
const submitIncome = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id.toString()
    const { id } = req.params
    const { month, year, income, incomeProof } = req.body

    const isa = await isaRepaymentService.submitIncome(userId, id, month, year, income, incomeProof)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Nộp thu nhập thành công!',
      data: isa
    })
  } catch (error) {
    next(error)
  }
}

// ============ ACTIVATE ============
const activateIsaRepayment = async (req, res, next) => {
  try {
    const { id } = req.params
    const isa = await isaRepaymentService.activateIsaRepayment(id)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Kích hoạt ISA thành công!',
      data: isa
    })
  } catch (error) {
    next(error)
  }
}

// ============ CALCULATE ============
const calculateMonthlyPayment = async (req, res, next) => {
  try {
    const { id, month } = req.params
    const result = await isaRepaymentService.calculateMonthlyPayment(id, parseInt(month))

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Tính phí ISA thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

// ============ UPDATE MONTHLY RECORD ============
const updateMonthlyRecord = async (req, res, next) => {
  try {
    const { id, month } = req.params
    const { year, ...data } = req.body

    const isa = await isaRepaymentService.updateMonthlyRecord(id, parseInt(month), parseInt(year), data)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cập nhật bản ghi tháng thành công!',
      data: isa
    })
  } catch (error) {
    next(error)
  }
}

// ============ STATUS ============
const getIsaStatus = async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.jwtDecoded._id.toString()
    const userRole = req.jwtDecoded.role
    const isa = await isaRepaymentService.getIsaRepaymentById(id)

    if (isa.userId.toString() !== userId && userRole !== 'admin') {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: 'Bạn không có quyền xem ISA này!'
      })
    }

    const status = await isaRepaymentService.getIsaStatus(id)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy trạng thái ISA thành công!',
      data: status
    })
  } catch (error) {
    next(error)
  }
}

export const isaRepaymentController = {
  createIsaRepayment,
  getIsaRepayments,
  getMyIsaRepayments,
  getIsaRepaymentById,
  submitIncome,
  activateIsaRepayment,
  calculateMonthlyPayment,
  updateMonthlyRecord,
  getIsaStatus
}
