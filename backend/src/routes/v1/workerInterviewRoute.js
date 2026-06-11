import express from 'express'
import { interviewController } from '~/controllers/interviewController'
import { interviewValidation } from '~/validations/interviewValidation'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

// Lấy danh sách phỏng vấn của worker
Router.get('/',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedWorker,
  interviewController.getMyInterviews
)

// Lấy chi tiết phỏng vấn
Router.get('/:id',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedWorker,
  interviewValidation.checkId,
  interviewController.getMyInterviewById
)

// Xác nhận tham gia phỏng vấn
Router.patch('/:id/confirm',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedWorker,
  interviewValidation.checkId,
  interviewController.confirmInterview
)

// Yêu cầu hoãn phỏng vấn
Router.patch('/:id/reschedule',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedWorker,
  interviewValidation.checkId,
  interviewValidation.validateWorkerReschedule,
  interviewController.requestReschedule
)

// Lấy phỏng vấn sắp tới
Router.get('/upcoming/list',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedWorker,
  interviewController.getUpcomingInterviews
)

export const workerInterviewRoute = Router
