import express from 'express'
import { notificationController } from '~/controllers/notificationController'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

// All notification routes require authentication
Router.use(authMiddleware.isAuthorized)

Router.route('/')
  .get(notificationController.getNotifications)

Router.route('/read-all')
  .put(notificationController.markAllAsRead)

Router.route('/:id/read')
  .put(notificationController.markAsRead)

export const notificationRoute = Router
