import express from 'express'
import { applicationController } from '~/controllers/applicationController'
import { applicationValidation } from '~/validations/applicationValidation'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

// ============ WORKER APPLY TO JOB ============

// Ứng tuyển vào job
Router.post('/:jobId/apply',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedWorker,
  applicationValidation.checkJobId,
  applicationValidation.validateApplyJob,
  applicationController.applyToJob
)

// Lấy danh sách đơn đã nộp của worker
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

export const workerApplicationRoute = Router
