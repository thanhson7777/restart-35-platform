import express from 'express'
import { recruitmentJobController } from '~/controllers/recruitmentJobController'
import { recruitmentJobValidation } from '~/validations/recruitmentJobValidation'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

// Lấy danh sách tin chờ duyệt
Router.get('/pending',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedAdmin,
  recruitmentJobController.getPendingJobs
)

// Xem chi tiết tin trước khi duyệt
Router.get('/:id/review',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedAdmin,
  recruitmentJobValidation.checkId,
  recruitmentJobController.getJobForReview
)

// Duyệt tin
Router.post('/:id/approve',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedAdmin,
  recruitmentJobValidation.checkId,
  recruitmentJobController.approveJob
)

// Từ chối tin
Router.post('/:id/reject',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedAdmin,
  recruitmentJobValidation.checkId,
  recruitmentJobValidation.validateRejectJob,
  recruitmentJobController.rejectJob
)

// Thống kê đơn ứng tuyển theo doanh nghiệp
Router.get('/applications/enterprise-stats',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedAdmin,
  recruitmentJobController.getEnterpriseApplicationStats
)

// Lấy danh sách tất cả đơn ứng tuyển
Router.get('/applications',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedAdmin,
  recruitmentJobController.getAllApplicationsAdmin
)

export const adminJobRoute = Router
