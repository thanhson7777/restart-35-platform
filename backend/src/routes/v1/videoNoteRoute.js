import express from 'express'
import { videoNoteValidation } from '~/validations/videoNoteValidation'
import { videoNoteController } from '~/controllers/videoNoteController'
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
