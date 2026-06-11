import express from 'express'
import { applicationController } from '~/controllers/applicationController'
import { applicationValidation } from '~/validations/applicationValidation'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

// ============ ENTERPRISE ROUTES ============

// Lấy danh sách đơn ứng tuyển của enterprise
Router.get('/',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedEnterprise,
  applicationValidation.validateGetApplications,
  applicationController.getApplications
)

// Lấy chi tiết đơn ứng tuyển
Router.get('/:id',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedEnterprise,
  applicationValidation.checkId,
  applicationController.getApplicationById
)

// Xem worker profile của ứng viên
Router.get('/:id/profile',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedEnterprise,
  applicationValidation.checkId,
  applicationController.getWorkerProfile
)

// Cập nhật trạng thái đơn
Router.patch('/:id/status',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedEnterprise,
  applicationValidation.checkId,
  applicationValidation.validateUpdateApplicationStatus,
  applicationController.updateApplicationStatus
)

// Shortlist ứng viên
Router.post('/:id/shortlist',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedEnterprise,
  applicationValidation.checkId,
  applicationValidation.validateShortlist,
  applicationController.shortlistApplication
)

// Từ chối ứng viên
Router.post('/:id/reject',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedEnterprise,
  applicationValidation.checkId,
  applicationValidation.validateRejectApplication,
  applicationController.rejectApplication
)

// Lấy interview của application
Router.get('/:id/interview',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedEnterprise,
  applicationValidation.checkId,
  applicationController.getApplicationInterview
)

export const enterpriseApplicationRoute = Router
