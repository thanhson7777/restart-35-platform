import { lessonProgressService } from '~/services/lessonProgressService'
import { StatusCodes } from 'http-status-codes'

const trackLessonProgress = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const { lessonId } = req.params
    const result = await lessonProgressService.trackLessonProgress(userId, lessonId, req.body)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cập nhật tiến độ bài học thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getEnrollmentProgress = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const { enrollmentId } = req.params
    const result = await lessonProgressService.getEnrollmentProgress(enrollmentId, userId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy tiến trình khóa học thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const lessonProgressController = {
  trackLessonProgress,
  getEnrollmentProgress
}
