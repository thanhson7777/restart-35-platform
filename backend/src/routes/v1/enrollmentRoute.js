import express from 'express'
import { enrollmentValidation } from '~/validations/enrollmentValidation'
import { enrollmentController } from '~/controllers/enrollmentController'
import { videoNoteController } from '~/controllers/videoNoteController'
import { lessonProgressService } from '~/services/lessonProgressService'
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

// Lấy thống kê enrollment (đặt trước :id để tránh trùng khớp)
Router.get(
  '/stats',
  authMiddleware.isAuthorized,
  enrollmentController.getEnrollmentStats
)

// Lấy danh sách học viên của trainer (đặt trước :id để tránh trùng khớp)
Router.get(
  '/trainer/list',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedTrainerOrAdmin,
  enrollmentValidation.queryEnrollments,
  enrollmentController.getTrainerEnrollments
)

// Lấy chi tiết enrollment
Router.get(
  '/:id',
  authMiddleware.isAuthorized,
  enrollmentValidation.checkId,
  enrollmentController.getEnrollmentById
)

// Lấy nguy cơ bỏ học của enrollment
Router.get(
  '/:id/risk',
  authMiddleware.isAuthorized,
  enrollmentValidation.checkId,
  enrollmentController.getEnrollmentRiskDetail
)

// Lấy danh sách ghi chú video của enrollment
Router.get(
  '/:id/notes',
  authMiddleware.isAuthorized,
  enrollmentValidation.checkId,
  videoNoteController.getNotesByEnrollment
)

// Đánh dấu hoàn thành một hạng mục
Router.post(
  '/:id/complete-item',
  authMiddleware.isAuthorized,
  enrollmentValidation.checkId,
  enrollmentController.completeItem
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

// Hoàn thành một bài học cụ thể (worker)
Router.put(
  '/:enrollmentId/lessons/:lessonId/complete',
  authMiddleware.isAuthorized,
  enrollmentValidation.checkId,
  async (req, res, next) => {
    try {
      const { enrollmentId, lessonId } = req.params
      const userId = req.user._id.toString()
      const result = await lessonProgressService.markLessonComplete(enrollmentId, lessonId, userId)
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }
)

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

// Yêu cầu can thiệp thủ công
Router.post(
  '/:id/intervention',
  authMiddleware.isAuthorized,
  enrollmentValidation.checkId,
  enrollmentController.triggerManualIntervention
)

// Thống kê đã được di chuyển lên trên tránh trùng route :id

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

// Lấy danh sách nguy cơ bỏ học
Router.get(
  '/admin/risk-list',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedAdmin,
  enrollmentController.getRiskList
)

export const enrollmentRoute = Router
