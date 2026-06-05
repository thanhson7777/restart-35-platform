import { lessonProgressModel } from '~/models/lessonProgressModel'
import { enrollmentModel } from '~/models/enrollmentModel'
import { courseVideoLessonModel } from '~/models/courseVideoLessonModel'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'

const trackLessonProgress = async (userId, lessonId, body) => {
  try {
    const { watchedSeconds, enrollmentId } = body

    // 1. Verify enrollment exists and belongs to the user
    const enrollment = await enrollmentModel.findOneById(enrollmentId)
    if (!enrollment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Đăng ký học không tồn tại!')
    }
    if (enrollment.userId.toString() !== userId.toString()) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền cập nhật tiến độ cho đăng ký này!')
    }

    // 2. Get lesson details to check total duration
    const lesson = await courseVideoLessonModel.findOneById(lessonId)
    if (!lesson) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Bài học không tồn tại!')
    }

    const totalSeconds = lesson.duration || 0
    let percentComplete = 0
    if (totalSeconds > 0) {
      percentComplete = Math.min(Math.round((watchedSeconds / totalSeconds) * 100), 100)
    } else {
      // If duration is 0, mark as completed immediately on track
      percentComplete = 100
    }

    // 3. Upsert lesson progress
    const progress = await lessonProgressModel.upsertProgress(
      enrollmentId,
      lessonId,
      userId,
      enrollment.courseId,
      {
        watchedSeconds,
        totalSeconds,
        percentComplete
      }
    )

    // 4. Update overall enrollment progress percentage
    const allCourseLessons = await courseVideoLessonModel.findByCourse(enrollment.courseId)
    const totalLessonsCount = allCourseLessons.length

    if (totalLessonsCount > 0) {
      const completedProgressRecords = await lessonProgressModel.findByEnrollment(enrollmentId)
      const completedCount = completedProgressRecords.filter(r => r.completed).length
      const overallPercent = Math.round((completedCount / totalLessonsCount) * 100)

      await enrollmentModel.updateProgress(enrollmentId, {
        percentage: overallPercent,
        currentLesson: completedCount,
        totalLessons: totalLessonsCount
      })
    }

    return progress
  } catch (error) {
    throw error
  }
}

const getEnrollmentProgress = async (enrollmentId, userId) => {
  try {
    const enrollment = await enrollmentModel.findOneById(enrollmentId)
    if (!enrollment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Đăng ký học không tồn tại!')
    }
    if (enrollment.userId.toString() !== userId.toString()) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền truy cập thông tin này!')
    }

    const records = await lessonProgressModel.findByEnrollment(enrollmentId)
    return records.map(r => ({
      lessonId: r.lessonId,
      percentComplete: r.percentComplete,
      completed: r.completed,
      watchedSeconds: r.watchedSeconds,
      totalSeconds: r.totalSeconds
    }))
  } catch (error) {
    throw error
  }
}

export const lessonProgressService = {
  trackLessonProgress,
  getEnrollmentProgress
}
