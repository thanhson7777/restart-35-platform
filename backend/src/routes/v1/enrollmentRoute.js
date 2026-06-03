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

// Hủy đăng ký (legacy)
Router.put(
  '/:id/cancel',
  authMiddleware.isAuthorized,
  enrollmentValidation.checkId,
  enrollmentValidation.cancelEnrollment,
  enrollmentController.cancelEnrollment
)

// DROP — Worker tự bỏ (phải đặt TRƯỚC /:id)
Router.put(
  '/:id/drop',
  authMiddleware.isAuthorized,
  enrollmentValidation.checkId,
  enrollmentValidation.dropEnrollment,
  enrollmentController.dropEnrollment
)

// ============ TRAINER/ADMIN ROUTES ============

// Tạm ngưng enrollment
Router.put(
  '/:id/suspend',
  authMiddleware.isAuthorized,
  enrollmentValidation.checkId,
  enrollmentValidation.suspendEnrollment,
  enrollmentController.suspendEnrollment
)

// Hoàn thành enrollment
Router.put(
  '/:id/complete',
  authMiddleware.isAuthorized,
  enrollmentValidation.checkId,
  enrollmentValidation.completeEnrollment,
  enrollmentController.completeEnrollment
)

// Fail enrollment
Router.put(
  '/:id/fail',
  authMiddleware.isAuthorized,
  enrollmentValidation.checkId,
  enrollmentValidation.failEnrollment,
  enrollmentController.failEnrollment
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

// Lấy thống kê admin
Router.get(
  '/admin/stats',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedAdmin,
  enrollmentController.getAdminStats
)

// Export enrollments
Router.get(
  '/admin/export',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedAdmin,
  enrollmentController.exportEnrollments
)

export const enrollmentRoute = Router
