// backend/src/routes/v1/applicationRoute.js

import express from 'express'
import { applicationController } from '~/controllers/applicationController'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { USER_ROLES } from '~/utils/constants'

const Router = express.Router()

// ============ WORKER ROUTES (Auth Required) ============

// Lấy applications của worker
Router.get(
  '/',
  authMiddleware.isAuthorized,
  applicationController.getMyApplications
)

// Tạo application mới
Router.post(
  '/',
  authMiddleware.isAuthorized,
  applicationController.createApplication
)

// Lấy chi tiết application
Router.get(
  '/:id',
  authMiddleware.isAuthorized,
  applicationController.getApplicationById
)

// Cập nhật application
Router.put(
  '/:id',
  authMiddleware.isAuthorized,
  applicationController.updateApplication
)

// Nộp đơn
Router.post(
  '/:id/submit',
  authMiddleware.isAuthorized,
  applicationController.submitApplication
)

// Xóa application
Router.delete(
  '/:id',
  authMiddleware.isAuthorized,
  applicationController.deleteApplication
)

// Kháng cáo
Router.post(
  '/:id/appeal',
  authMiddleware.isAuthorized,
  applicationController.appealApplication
)

// ============ NGO ROUTES (Auth + NGO Required) ============

// Lấy pending applications cho NGO
Router.get(
  '/ngo/pending',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedNGO,
  applicationController.getPendingApplications
)

// Lấy application để review
Router.get(
  '/ngo/review/:id',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedNGO,
  applicationController.getApplicationForReview
)

// Duyệt đơn
Router.put(
  '/:id/approve',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedNGO,
  applicationController.approveApplication
)

// Từ chối đơn
Router.put(
  '/:id/reject',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedNGO,
  applicationController.rejectApplication
)

// Xếp vào danh sách chờ
Router.put(
  '/:id/waitlist',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedNGO,
  applicationController.waitlistApplication
)

// ============ ADMIN ROUTES (Auth + Admin Required) ============

// Lấy tất cả applications
Router.get(
  '/admin/all',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedAdmin,
  applicationController.getAllApplications
)

export const applicationRoute = Router
