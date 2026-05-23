import express from 'express'
import { workerProfileValidation } from '~/validations/workerProfileValidation'
import { workerProfileController } from '~/controllers/workerProfileController'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

// ============ Worker Routes (Auth Required) ============

// Tạo hồ sơ mới
Router.route('/')
  .post(
    authMiddleware.isAuthorized,
    workerProfileController.createNew
  )

// Lấy hồ sơ của user hiện tại
Router.route('/me')
  .get(
    authMiddleware.isAuthorized,
    workerProfileController.getMyProfile
  )

// Auto-save (debounce)
Router.route('/autosave')
  .put(
    authMiddleware.isAuthorized,
    workerProfileValidation.autosave,
    workerProfileController.autosave
  )

// Hoàn thành hồ sơ
Router.route('/complete')
  .put(
    authMiddleware.isAuthorized,
    workerProfileController.completeProfile
  )

// Mở lại hồ sơ để chỉnh sửa
Router.route('/reopen')
  .put(
    authMiddleware.isAuthorized,
    workerProfileController.reopenProfile
  )

// Cập nhật từng bước
Router.route('/step/:step')
  .put(
    authMiddleware.isAuthorized,
    workerProfileController.updateStep
  )

// ============ Admin Routes (Auth + Admin Required) ============

// Danh sách hồ sơ (admin)
Router.route('/')
  .get(
    authMiddleware.isAuthorized,
    authMiddleware.isAuthorizedAdmin,
    workerProfileController.getProfiles
  )

// Lấy hồ sơ theo ID (admin)
Router.route('/:id')
  .get(
    authMiddleware.isAuthorized,
    authMiddleware.isAuthorizedAdmin,
    workerProfileValidation.checkId,
    workerProfileController.getProfileById
  )

export const workerProfileRoute = Router
