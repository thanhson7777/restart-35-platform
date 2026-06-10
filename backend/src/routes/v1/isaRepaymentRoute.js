import express from 'express'
import { isaRepaymentValidation } from '~/validators/isaRepaymentValidation'
import { isaRepaymentController } from '~/controllers/isaRepaymentController'
import { authMiddleware } from '~/middlewares/authMiddleware'
import multer from 'multer'

const Router = express.Router()

// Configure multer for file upload (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'].includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Chỉ chấp nhận file jpg, png, pdf'), false)
    }
  }
})

// ============ WORKER ROUTES ============

// ISA của tôi
Router.get(
  '/my',
  authMiddleware.isAuthorized,
  isaRepaymentController.getMyIsaRepayments
)

// Nộp thu nhập (hỗ trợ upload file chứng minh thu nhập)
Router.post(
  '/:id/submit-income',
  authMiddleware.isAuthorized,
  upload.single('proofDocument'),
  isaRepaymentValidation.checkIsaRepaymentId,
  isaRepaymentValidation.submitIncome,
  isaRepaymentController.submitIncome
)

// ============ ADMIN ROUTES ============

// Tạo ISA record
Router.post(
  '/',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedAdmin,
  isaRepaymentValidation.createIsaRepayment,
  isaRepaymentController.createIsaRepayment
)

// Danh sách ISA
Router.get(
  '/',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedAdmin,
  isaRepaymentController.getIsaRepayments
)

// Kích hoạt ISA
Router.put(
  '/:id/activate',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedAdmin,
  isaRepaymentValidation.checkIsaRepaymentId,
  isaRepaymentController.activateIsaRepayment
)

// ============ SHARED ROUTES (Owner + Admin) ============

// Chi tiết ISA
Router.get(
  '/:id',
  authMiddleware.isAuthorized,
  isaRepaymentValidation.checkIsaRepaymentId,
  isaRepaymentController.getIsaRepaymentById
)

// Tính phí tháng X
Router.get(
  '/:id/calculate/:month',
  authMiddleware.isAuthorized,
  isaRepaymentValidation.checkIsaRepaymentId,
  isaRepaymentController.calculateMonthlyPayment
)

// Cập nhật bản ghi tháng
Router.put(
  '/:id/monthly-record/:month',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedAdmin,
  isaRepaymentValidation.checkIsaRepaymentId,
  isaRepaymentValidation.checkMonth,
  isaRepaymentValidation.updateMonthlyRecord,
  isaRepaymentController.updateMonthlyRecord
)

// Trạng thái ISA tổng hợp
Router.get(
  '/:id/status',
  authMiddleware.isAuthorized,
  isaRepaymentValidation.checkIsaRepaymentId,
  isaRepaymentController.getIsaStatus
)

export const isaRepaymentRoute = Router
