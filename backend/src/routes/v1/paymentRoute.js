import express from 'express'
import { paymentValidation } from '~/validators/paymentValidation'
import { paymentController } from '~/controllers/paymentController'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

// ============ WORKER ROUTES ============

// Tạo thanh toán
Router.post(
  '/',
  authMiddleware.isAuthorized,
  paymentValidation.createPayment,
  paymentController.createPayment
)

// Lịch sử thanh toán của tôi
Router.get(
  '/my',
  authMiddleware.isAuthorized,
  paymentController.getMyPayments
)

// ============ ADMIN ROUTES ============

// Danh sách tất cả thanh toán
Router.get(
  '/',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedAdmin,
  paymentController.getPayments
)

// Chi tiết thanh toán
Router.get(
  '/:id',
  authMiddleware.isAuthorized,
  paymentValidation.checkPaymentId,
  paymentController.getPaymentById
)

// Cập nhật trạng thái thanh toán
Router.put(
  '/:id/status',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedAdmin,
  paymentValidation.checkPaymentId,
  paymentValidation.updatePaymentStatus,
  paymentController.updatePaymentStatus
)

// Hoàn tiền
Router.post(
  '/:id/refund',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedAdmin,
  paymentValidation.checkPaymentId,
  paymentValidation.refundPayment,
  paymentController.refundPayment
)

// Xuất hóa đơn
Router.get(
  '/:id/invoice',
  authMiddleware.isAuthorized,
  paymentValidation.checkPaymentId,
  paymentController.getInvoice
)

// ============ WEBHOOK (No Auth) ============
Router.post(
  '/webhook/:gateway',
  paymentValidation.checkGateway,
  paymentController.handleWebhook
)

export const paymentRoute = Router
