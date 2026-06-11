import express from 'express'
import { recruitmentJobController } from '~/controllers/recruitmentJobController'
import { recruitmentJobValidation } from '~/validations/recruitmentJobValidation'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

// ============ ENTERPRISE ROUTES ============

// Tạo tin tuyển dụng mới
Router.post('/',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedEnterprise,
  recruitmentJobValidation.validateCreateJob,
  recruitmentJobController.createJob
)

// Lấy danh sách tin tuyển dụng của enterprise
Router.get('/',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedEnterprise,
  recruitmentJobValidation.validateGetJobs,
  recruitmentJobController.getJobs
)

// Lấy chi tiết tin tuyển dụng
Router.get('/:id',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedEnterprise,
  recruitmentJobValidation.checkId,
  recruitmentJobController.getJobById
)

// Cập nhật tin tuyển dụng
Router.put('/:id',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedEnterprise,
  recruitmentJobValidation.checkId,
  recruitmentJobValidation.validateUpdateJob,
  recruitmentJobController.updateJob
)

// Xóa tin tuyển dụng
Router.delete('/:id',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedEnterprise,
  recruitmentJobValidation.checkId,
  recruitmentJobController.deleteJob
)

// Gửi tin để duyệt
Router.post('/:id/submit',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedEnterprise,
  recruitmentJobValidation.checkId,
  recruitmentJobController.submitForApproval
)

// Đóng tin tuyển dụng
Router.post('/:id/close',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedEnterprise,
  recruitmentJobValidation.checkId,
  recruitmentJobController.closeJob
)

// Lấy danh sách ứng viên của tin
Router.get('/:id/applications',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedEnterprise,
  recruitmentJobValidation.checkId,
  recruitmentJobController.getJobApplications
)

// Lấy thống kê tin tuyển dụng
Router.get('/:id/stats',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedEnterprise,
  recruitmentJobValidation.checkId,
  recruitmentJobController.getJobStats
)

// Lấy danh sách tin bị từ chối
Router.get('/rejected/list',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedEnterprise,
  recruitmentJobController.getRejectedJobs
)

export const recruitmentJobRoute = Router
