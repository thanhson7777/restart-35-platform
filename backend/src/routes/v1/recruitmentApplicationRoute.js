import express from 'express'
import { applicationController } from '~/controllers/applicationController'
import { applicationValidation } from '~/validations/applicationValidation'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

// ============ WORKER ROUTES (apply to job) ============

// Ứng tuyển vào job
Router.post('/jobs/:jobId/apply',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedWorker,
  applicationValidation.checkJobId,
  applicationValidation.validateApplyJob,
  applicationController.applyToJob
)

// Lấy danh sách đơn đã nộp
Router.get('/my/applications',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedWorker,
  applicationController.getMyApplications
)

// Lấy chi tiết đơn đã nộp
Router.get('/my/applications/:id',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedWorker,
  applicationValidation.checkId,
  applicationController.getMyApplicationById
)

// Rút đơn ứng tuyển
Router.delete('/my/applications/:id',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedWorker,
  applicationValidation.checkId,
  applicationController.withdrawApplication
)

export const recruitmentApplicationRoute = Router
