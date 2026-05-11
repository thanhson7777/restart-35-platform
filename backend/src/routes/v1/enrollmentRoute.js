import express from 'express'
import { enrollmentValidation } from '~/validations/enrollmentValidation'
import { enrollmentController } from '~/controllers/enrollmentController'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

// ============ WORKER ROUTES (Auth Required) ============

// Đăng ký khóa học
Router.post(
  '/',
  authMiddleware.isAuthorized,
  enrollmentValidation.createEnrollment,
  enrollmentController.enrollCourse
)

// Lấy danh sách đăng ký của tôi
Router.get(
  '/',
  authMiddleware.isAuthorized,
  enrollmentValidation.queryEnrollments,
  enrollmentController.getMyEnrollments
)

// Lấy chi tiết enrollment
Router.get(
  '/:id',
  authMiddleware.isAuthorized,
  enrollmentValidation.checkId,
  enrollmentController.getEnrollmentById
)

// Hủy đăng ký
Router.put(
  '/:id/cancel',
  authMiddleware.isAuthorized,
  enrollmentValidation.checkId,
  enrollmentValidation.cancelEnrollment,
  enrollmentController.cancelEnrollment
)

// ============ TRAINER ROUTES (Auth Required) ============

// Lấy danh sách học viên của khóa học
Router.get(
  '/course/:courseId',
  authMiddleware.isAuthorized,
  enrollmentValidation.checkCourseId,
  enrollmentValidation.queryEnrollments,
  enrollmentController.getCourseEnrollments
)

// Cập nhật tiến độ học viên
Router.put(
  '/:id/progress',
  authMiddleware.isAuthorized,
  enrollmentValidation.checkId,
  enrollmentValidation.updateProgress,
  enrollmentController.updateProgress
)

// Cập nhật trạng thái học viên
Router.put(
  '/:id/status',
  authMiddleware.isAuthorized,
  enrollmentValidation.checkId,
  enrollmentValidation.updateStatus,
  enrollmentController.updateStatus
)

// Lấy thống kê enrollment
Router.get(
  '/stats',
  authMiddleware.isAuthorized,
  enrollmentController.getEnrollmentStats
)

// ============ ADMIN ROUTES (Auth + Admin Required) ============

// Lấy tất cả enrollments
Router.get(
  '/admin/all',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedAdmin,
  enrollmentValidation.queryEnrollments,
  enrollmentController.getAllEnrollments
)

export const enrollmentRoute = Router
