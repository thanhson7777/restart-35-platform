import { paymentService } from '~/services/paymentService'
import { StatusCodes } from 'http-status-codes'

// ============ CREATE ============
const createPayment = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id.toString()
    const payment = await paymentService.createPayment(userId, req.body)

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Tạo thanh toán thành công!',
      data: payment
    })
  } catch (error) {
    next(error)
  }
}

// ============ READ ============
const getPayments = async (req, res, next) => {
  try {
    const result = await paymentService.getPayments(req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách thanh toán thành công!',
      data: result.payments,
      pagination: result.pagination
    })
  } catch (error) {
    next(error)
  }
}

const getMyPayments = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id.toString()
    const result = await paymentService.getMyPayments(userId, req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy lịch sử thanh toán thành công!',
      data: result.payments,
      pagination: result.pagination
    })
  } catch (error) {
    next(error)
  }
}

const getPaymentById = async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.jwtDecoded._id.toString()
    const userRole = req.jwtDecoded.role
    const payment = await paymentService.getPaymentById(id)

    if (payment.userId.toString() !== userId && userRole !== 'admin') {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: 'Bạn không có quyền xem thanh toán này!'
      })
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thông tin thanh toán thành công!',
      data: payment
    })
  } catch (error) {
    next(error)
  }
}

// ============ UPDATE ============
const updatePaymentStatus = async (req, res, next) => {
  try {
    const { id } = req.params
    const { status, transactionId } = req.body
    const payment = await paymentService.updatePaymentStatus(id, status, transactionId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cập nhật trạng thái thanh toán thành công!',
      data: payment
    })
  } catch (error) {
    next(error)
  }
}

const refundPayment = async (req, res, next) => {
  try {
    const { id } = req.params
    const { reason } = req.body
    const payment = await paymentService.refundPayment(id, reason)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Hoàn tiền thành công!',
      data: payment
    })
  } catch (error) {
    next(error)
  }
}

// ============ INVOICE ============
const getInvoice = async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.jwtDecoded._id.toString()
    const userRole = req.jwtDecoded.role
    const payment = await paymentService.getPaymentById(id)

    if (payment.userId.toString() !== userId && userRole !== 'admin') {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: 'Bạn không có quyền xuất hóa đơn này!'
      })
    }

    const invoice = await paymentService.generateInvoice(id)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Xuất hóa đơn thành công!',
      data: invoice
    })
  } catch (error) {
    next(error)
  }
}

// ============ WEBHOOK ============
const handleWebhook = async (req, res, next) => {
  try {
    const { gateway } = req.params
    const { status, transactionId, paymentId } = await paymentService.webhookHandler(gateway, req.body)

    if (paymentId && status) {
      await paymentService.updatePaymentStatus(paymentId, status, transactionId)
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Webhook xu ly thanh cong!',
      data: { status, transactionId, paymentId }
    })
  } catch (error) {
    next(error)
  }
}

export const paymentController = {
  createPayment,
  getPayments,
  getMyPayments,
  getPaymentById,
  updatePaymentStatus,
  refundPayment,
  getInvoice,
  handleWebhook
}
