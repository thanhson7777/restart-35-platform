import express from 'express'
import { videoNoteValidation } from '~/validations/videoNoteValidation'
import { videoNoteController } from '~/controllers/videoNoteController'
import { videoNoteModel } from '~/models/videoNoteModel'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

// ============ WORKER ROUTES ============

// Tạo ghi chú mới
Router.post(
  '/',
  authMiddleware.isAuthorized,
  videoNoteValidation.createNote,
  videoNoteController.createVideoNote
)

// Lấy ghi chú theo lessonId (dùng cho VideoLearningPage)
Router.get(
  '/lesson/:lessonId',
  authMiddleware.isAuthorized,
  async (req, res, next) => {
    try {
      const { lessonId } = req.params
      const userId = req.user._id.toString()
      const notes = await videoNoteModel.findByUserAndLesson(lessonId, userId)
      res.json({ success: true, data: notes })
    } catch (error) {
      next(error)
    }
  }
)

// Cập nhật ghi chú
Router.patch(
  '/:id',
  authMiddleware.isAuthorized,
  videoNoteValidation.checkId,
  videoNoteValidation.updateNote,
  videoNoteController.updateVideoNote
)

// Xóa ghi chú
Router.delete(
  '/:id',
  authMiddleware.isAuthorized,
  videoNoteValidation.checkId,
  videoNoteController.deleteVideoNote
)

export const videoNoteRoute = Router
