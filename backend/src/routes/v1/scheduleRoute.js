import express from 'express'
import { scheduleValidation } from '~/validations/scheduleValidation'
import { scheduleController } from '~/controllers/scheduleController'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

// ============ WORKER ROUTES (Auth Required) ============

// Lấy lịch học của tôi
Router.get(
  '/my',
  authMiddleware.isAuthorized,
  scheduleValidation.querySchedules,
  scheduleController.getMySchedules
)

// Lấy lịch sắp tới
Router.get(
  '/upcoming',
  authMiddleware.isAuthorized,
  scheduleController.getUpcomingSchedule
)

// Lấy lịch theo khóa học (Public - Worker cũng có thể xem)
Router.get(
  '/course/:courseId',
  authMiddleware.isAuthorized,
  scheduleValidation.checkCourseId,
  scheduleController.getScheduleByCourse
)

// Lấy lịch theo khóa học (Public - không cần auth)
Router.get(
  '/public/course/:courseId',
  scheduleController.getScheduleByCoursePublic
)

// Lấy chi tiết lịch học
Router.get(
  '/:id',
  authMiddleware.isAuthorized,
  scheduleValidation.checkId,
  scheduleController.getScheduleById
)

// Lấy điểm danh buổi học
Router.get(
  '/:id/sessions/:sessionNumber/attendance',
  authMiddleware.isAuthorized,
  scheduleValidation.checkId,
  scheduleValidation.checkSessionNumber,
  scheduleController.getSessionAttendance
)

// Học viên tự check-in bằng PIN/QR
Router.post(
  '/:id/sessions/:sessionNumber/checkin',
  authMiddleware.isAuthorized,
  scheduleValidation.checkId,
  scheduleValidation.checkSessionNumber,
  scheduleController.studentCheckin
)

// ============ TRAINER ROUTES (Auth Required) ============

// Tự động tạo lịch học từ course scheduleConfig
Router.post(
  '/course/:id/auto-generate',
  authMiddleware.isAuthorized,
  scheduleController.generateAutoSchedule
)

// Tạo lịch học mới
Router.post(
  '/',
  authMiddleware.isAuthorized,
  scheduleValidation.createSchedule,
  scheduleController.createSchedule
)

// Lấy danh sách lịch học của trainer
Router.get(
  '/trainer/list',
  authMiddleware.isAuthorized,
  scheduleValidation.querySchedules,
  scheduleController.getTrainerSchedules
)

// Lấy thống kê lịch học
Router.get(
  '/trainer/stats',
  authMiddleware.isAuthorized,
  scheduleController.getScheduleStats
)

// Cập nhật lịch học
Router.put(
  '/:id',
  authMiddleware.isAuthorized,
  scheduleValidation.checkId,
  scheduleValidation.updateSchedule,
  scheduleController.updateSchedule
)

// Công bố lịch học
Router.put(
  '/:id/publish',
  authMiddleware.isAuthorized,
  scheduleValidation.checkId,
  scheduleController.publishSchedule
)

// Xóa lịch học
Router.delete(
  '/:id',
  authMiddleware.isAuthorized,
  scheduleValidation.checkId,
  scheduleController.deleteSchedule
)

// Thêm buổi học
Router.post(
  '/:id/sessions',
  authMiddleware.isAuthorized,
  scheduleValidation.checkId,
  scheduleValidation.addSession,
  scheduleController.addSession
)

// Cập nhật buổi học
Router.put(
  '/:id/sessions/:sessionNumber',
  authMiddleware.isAuthorized,
  scheduleValidation.checkId,
  scheduleValidation.checkSessionNumber,
  scheduleValidation.updateSession,
  scheduleController.updateSession
)

// Đổi lịch buổi học
Router.put(
  '/:id/sessions/:sessionNumber/reschedule',
  authMiddleware.isAuthorized,
  scheduleValidation.checkId,
  scheduleValidation.checkSessionNumber,
  scheduleValidation.rescheduleSession,
  scheduleController.rescheduleSession
)

// Hủy buổi học
Router.put(
  '/:id/sessions/:sessionNumber/cancel',
  authMiddleware.isAuthorized,
  scheduleValidation.checkId,
  scheduleValidation.checkSessionNumber,
  scheduleValidation.cancelSession,
  scheduleController.cancelSession
)

// Đánh dấu hoàn thành buổi học
Router.put(
  '/:id/sessions/:sessionNumber/complete',
  authMiddleware.isAuthorized,
  scheduleValidation.checkId,
  scheduleValidation.checkSessionNumber,
  scheduleController.markSessionComplete
)

// Ghi điểm danh
Router.post(
  '/:id/sessions/:sessionNumber/attendance',
  authMiddleware.isAuthorized,
  scheduleValidation.checkId,
  scheduleValidation.checkSessionNumber,
  scheduleValidation.recordAttendance,
  scheduleController.recordAttendance
)

export const scheduleRoute = Router
