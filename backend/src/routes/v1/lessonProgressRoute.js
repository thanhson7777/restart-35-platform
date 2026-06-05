import express from 'express'
import { lessonProgressValidation } from '~/validations/lessonProgressValidation'
import { lessonProgressController } from '~/controllers/lessonProgressController'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

// ============ WORKER ROUTES ============

// Cập nhật tiến độ của một bài học video
Router.post(
  '/lessons/:lessonId/progress',
  authMiddleware.isAuthorized,
  lessonProgressValidation.trackProgress,
  lessonProgressController.trackLessonProgress
)

// Lấy tiến độ các bài học của một enrollment
Router.get(
  '/enrollments/:enrollmentId/progress',
  authMiddleware.isAuthorized,
  lessonProgressValidation.checkEnrollmentId,
  lessonProgressController.getEnrollmentProgress
)

export const lessonProgressRoute = Router
