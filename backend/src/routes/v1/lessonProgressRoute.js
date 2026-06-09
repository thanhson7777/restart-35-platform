import express from 'express'
import { lessonProgressValidation } from '~/validations/lessonProgressValidation'
import { lessonProgressController } from '~/controllers/lessonProgressController'
import { lessonProgressService } from '~/services/lessonProgressService'
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

// Lấy bookmarks theo lessonId
Router.get(
  '/lessons/:lessonId/bookmarks',
  authMiddleware.isAuthorized,
  async (req, res, next) => {
    try {
      const { lessonId } = req.params
      const userId = req.user._id.toString()
      const bookmarks = await lessonProgressService.getBookmarksByLesson(lessonId, userId)
      res.json({ success: true, data: bookmarks })
    } catch (error) {
      next(error)
    }
  }
)

// Toggle bookmark cho một bài học
Router.post(
  '/lessons/:lessonId/bookmark',
  authMiddleware.isAuthorized,
  async (req, res, next) => {
    try {
      const { lessonId } = req.params
      const userId = req.user._id.toString()
      const result = await lessonProgressService.toggleBookmark(userId, lessonId, req.body)
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }
)

export const lessonProgressRoute = Router
