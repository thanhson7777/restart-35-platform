import { StatusCodes } from 'http-status-codes'
import { notificationService } from '~/services/notificationService'

const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20

    const result = await notificationService.getUserNotifications(userId, page, limit)
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const markAsRead = async (req, res, next) => {
  try {
    const notificationId = req.params.id
    const userId = req.user._id

    const updatedNotification = await notificationService.markAsRead(notificationId, userId)
    res.status(StatusCodes.OK).json({
      message: 'Đánh dấu đã đọc thành công',
      data: updatedNotification
    })
  } catch (error) {
    next(error)
  }
}

const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id

    await notificationService.markAllAsRead(userId)
    res.status(StatusCodes.OK).json({
      message: 'Đã đánh dấu tất cả là đã đọc'
    })
  } catch (error) {
    next(error)
  }
}

export const notificationController = {
  getNotifications,
  markAsRead,
  markAllAsRead
}
