// backend/src/routes/v1/scholarshipRoute.js

import express from 'express'
import { scholarshipController } from '~/controllers/scholarshipController'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { USER_ROLES } from '~/utils/constants'

const Router = express.Router()

// ============ PUBLIC ROUTES (No Auth Required) ============

// Danh sách scholarships khả dụng
Router.get(
  '/',
  scholarshipController.getScholarships
)

// Chi tiết scholarship
Router.get(
  '/:id',
  scholarshipController.getScholarshipById
)

// ============ WORKER ROUTES (Auth Required) ============

// Lấy scholarships đủ điều kiện cho worker
Router.get(
  '/worker/eligible',
  authMiddleware.isAuthorized,
  scholarshipController.getEligibleScholarships
)

// Kiểm tra eligibility cụ thể
Router.get(
  '/worker/check-eligibility/:scholarshipId',
  authMiddleware.isAuthorized,
  scholarshipController.checkEligibility
)

// ============ NGO ROUTES (Auth + NGO Required) ============

// Tạo scholarship mới
Router.post(
  '/',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedNGO,
  scholarshipController.createScholarship
)

// Lấy scholarships của NGO
Router.get(
  '/my/list',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedNGO,
  scholarshipController.getMyScholarships
)

// Cập nhật scholarship
Router.put(
  '/:id',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedNGO,
  scholarshipController.updateScholarship
)

// Publish scholarship
Router.put(
  '/:id/publish',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedNGO,
  scholarshipController.publishScholarship
)

// Pause scholarship
Router.put(
  '/:id/pause',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedNGO,
  scholarshipController.pauseScholarship
)

// Resume scholarship
Router.put(
  '/:id/resume',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedNGO,
  scholarshipController.resumeScholarship
)

// Xóa scholarship
Router.delete(
  '/:id',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedNGO,
  scholarshipController.deleteScholarship
)

// Lấy thống kê scholarship
Router.get(
  '/:id/stats',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedNGO,
  scholarshipController.getScholarshipStats
)

// Thêm khóa học vào scholarship
Router.post(
  '/:id/courses',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedNGO,
  scholarshipController.addLinkedCourse
)

// Xóa khóa học khỏi scholarship
Router.delete(
  '/:id/courses/:courseId',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedNGO,
  scholarshipController.removeLinkedCourse
)

export const scholarshipRoute = Router
