import express from 'express'
import { userValidation } from '~/validations/userValidation'
import { userController } from '~/controllers/userController'
import { multerUploadMiddleware } from '~/middlewares/multerUploadMiddleware'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

Router.route('/register')
  .post(
    userValidation.createNew,
    userController.createNew
  )

Router.route('/verify')
  .put(
    userValidation.verifyAccount,
    userController.verifyAccount
  )

Router.route('/login')
  .post(
    userValidation.login,
    userController.login
  )

Router.route('/logout')
  .delete(userController.logout)

Router.route('/me')
  .get(
    authMiddleware.isAuthorized,
    userController.getMe
  )

Router.route('/refresh_token')
  .put(userController.refreshToken)

Router.route('/update')
  .put(
    authMiddleware.isAuthorized,
    multerUploadMiddleware.uploadMulter.single('avatar'),
    userValidation.update,
    userController.update
  )

Router.route('/')
  .get(
    authMiddleware.isAuthorized,
    authMiddleware.isAuthorizedAdmin,
    userController.getUsers
  )

Router.route('/stats')
  .get(
    authMiddleware.isAuthorized,
    authMiddleware.isAuthorizedAdmin,
    userController.getUserStats
  )

Router.route('/:id/status')
  .patch(
    authMiddleware.isAuthorized,
    authMiddleware.isAuthorizedAdmin,
    userValidation.checkProductId,
    userValidation.updateUserStatus,
    userController.updateUserStatus
  )

Router.route('/change-password')
  .put(
    authMiddleware.isAuthorized,
    userController.changePassword
  )

export const userRoute = Router