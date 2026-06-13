import express from 'express'
import { interviewController } from '~/controllers/interviewController'
import { interviewValidation } from '~/validations/interviewValidation'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

// ============ ENTERPRISE ROUTES ============

// Tạo lịch phỏng vấn
Router.post('/',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedEnterprise,
  interviewValidation.validateCreateInterview,
  interviewController.createInterview
)

// Lấy danh sách phỏng vấn
Router.get('/',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedEnterprise,
  interviewValidation.validateGetInterviews,
  interviewController.getInterviews
)

// Lấy chi tiết phỏng vấn
Router.get('/:id',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedEnterprise,
  interviewValidation.checkId,
  interviewController.getInterviewById
)

// Hoãn lịch phỏng vấn
Router.patch('/:id/reschedule',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedEnterprise,
  interviewValidation.checkId,
  interviewValidation.validateReschedule,
  interviewController.rescheduleInterview
)

// Hủy phỏng vấn
Router.post('/:id/cancel',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedEnterprise,
  interviewValidation.checkId,
  interviewValidation.validateCancelInterview,
  interviewController.cancelInterview
)

// Cập nhật phỏng vấn
Router.patch('/:id',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedEnterprise,
  interviewValidation.checkId,
  interviewController.updateInterview
)

// Hoàn thành phỏng vấn
Router.post('/:id/complete',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedEnterprise,
  interviewValidation.checkId,
  interviewValidation.validateCompleteInterview,
  interviewController.completeInterview
)

// Đánh dấu không đến
Router.post('/:id/no-show',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedEnterprise,
  interviewValidation.checkId,
  interviewController.markNoShow
)

// Lấy thống kê
Router.get('/stats/summary',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedEnterprise,
  interviewController.getEnterpriseStats
)

// Lấy phỏng vấn sắp tới
Router.get('/upcoming/list',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedEnterprise,
  interviewController.getUpcomingInterviews
)

export const interviewRoute = Router
