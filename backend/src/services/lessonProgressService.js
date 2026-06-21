import { lessonProgressModel } from '~/models/lessonProgressModel'
import { enrollmentModel } from '~/models/enrollmentModel'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'

const trackLessonProgress = async (userId, lessonId, body) => {
  try {
    // [HIDE] Disabled in new simplified progress flow
    // const { watchedSeconds, enrollmentId } = body

    // 1. Verify enrollment exists and belongs to the user
    // const enrollment = await enrollmentModel.findOneById(enrollmentId)
    // if (!enrollment) {
    //   throw new ApiError(StatusCodes.NOT_FOUND, 'Đăng ký học không tồn tại!')
    // }
    // if (enrollment.userId.toString() !== userId.toString()) {
    //   throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền cập nhật tiến độ cho đăng ký này!')
    // }

    // 2. Get lesson details to check total duration
    // const lesson = await courseVideoLessonModel.findOneById(lessonId)
    // if (!lesson) {
    //   throw new ApiError(StatusCodes.NOT_FOUND, 'Bài học không tồn tại!')
    // }

    // const totalSeconds = lesson.duration || 0
    // let percentComplete = 0
    // if (totalSeconds > 0) {
    //   percentComplete = Math.min(Math.round((watchedSeconds / totalSeconds) * 100), 100)
    // } else {
    //   // If duration is 0, mark as completed immediately on track
    //   percentComplete = 100
    // }

    // 3. Upsert lesson progress
    // const progress = await lessonProgressModel.upsertProgress(...)

    // 4. Update overall enrollment progress percentage
    // const allCourseLessons = await courseVideoLessonModel.findByCourse(enrollment.courseId)
    // ...

    return { status: 'disabled', message: 'Tracking is disabled in new flow' }
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

const toggleBookmark = async (userId, lessonId, data) => {
  try {
    const { enrollmentId, title, bookmarked } = data

    // Find existing progress record for this lesson
    const existing = await lessonProgressModel.findOneByEnrollmentAndLesson(enrollmentId, lessonId)

    if (existing) {
      // Update existing record
      const updated = await lessonProgressModel.update(existing._id.toString(), {
        bookmarked,
        bookmarkNote: title || null,
        bookmarkedAt: bookmarked ? Date.now() : null,
      })
      return updated
    } else {
      // Need enrollment info to create a new record with bookmark
      const enrollment = await enrollmentModel.findOneById(enrollmentId)
      if (!enrollment) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Đăng ký học không tồn tại!')
      }
      if (enrollment.userId.toString() !== userId.toString()) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền thao tác với khóa học này!')
      }

      const newProgress = {
        enrollmentId: String(enrollmentId),
        lessonId: String(lessonId),
        courseId: enrollment.courseId.toString(),
        userId: String(userId),
        watchedSeconds: 0,
        totalSeconds: 0,
        percentComplete: 0,
        completed: false,
        bookmarked,
        bookmarkNote: title || null,
        bookmarkedAt: bookmarked ? Date.now() : null,
      }
      const validData = await lessonProgressModel.createNew(newProgress)
      return validData
    }
  } catch (error) {
    throw error
  }
}

const getBookmarksByLesson = async (lessonId, userId) => {
  try {
    const records = await lessonProgressModel.findBookmarksByLessonAndUser(lessonId, userId)
    return records.map(r => ({
      _id: r._id,
      lessonId: r.lessonId,
      enrollmentId: r.enrollmentId,
      title: r.bookmarkNote || `Bookmark at ${new Date(r.bookmarkedAt).toLocaleTimeString()}`,
      timestamp: r.watchedSeconds || 0,
      createdAt: r.bookmarkedAt,
    }))
  } catch (error) {
    throw error
  }
}

const markLessonComplete = async (enrollmentId, lessonId, userId) => {
  try {
    const enrollment = await enrollmentModel.findOneById(enrollmentId)
    if (!enrollment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Đăng ký học không tồn tại!')
    }
    if (enrollment.userId.toString() !== userId.toString()) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền thao tác với khóa học này!')
    }

    const existing = await lessonProgressModel.findOneByEnrollmentAndLesson(enrollmentId, lessonId)
    if (existing) {
      const updated = await lessonProgressModel.update(existing._id.toString(), {
        completed: true,
        completedAt: Date.now(),
        percentComplete: 100,
      })
      return updated
    } else {
      const newProgress = {
        enrollmentId: String(enrollmentId),
        lessonId: String(lessonId),
        courseId: enrollment.courseId.toString(),
        userId: String(userId),
        watchedSeconds: 0,
        totalSeconds: 0,
        percentComplete: 100,
        completed: true,
        completedAt: Date.now(),
      }
      const validData = await lessonProgressModel.createNew(newProgress)
      return validData
    }
  } catch (error) {
    throw error
  }
}

export const lessonProgressService = {
  trackLessonProgress,
  getEnrollmentProgress,
  toggleBookmark,
  getBookmarksByLesson,
  markLessonComplete
}
