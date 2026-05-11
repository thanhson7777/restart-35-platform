import { scheduleModel } from '~/models/scheduleModel'
import { courseModel } from '~/models/courseModel'
import { userModel } from '~/models/userModel'
import { enrollmentModel } from '~/models/enrollmentModel'
import { workerProfileModel } from '~/models/workerProfileModel'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import {
  DEFAULT_PAGE,
  DEFAULT_ITEM_PER_PAGE,
  SCHEDULE_STATUS,
  SESSION_STATUS,
  ENROLLMENT_STATUS,
  USER_ROLES
} from '~/utils/constants'

// ============ CREATE SCHEDULE ============
const createSchedule = async (courseId, data, trainerId) => {
  try {
    const course = await courseModel.findOneById(courseId)
    if (!course) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Khóa học không tồn tại!')
    }

    if (course.providerId.toString() !== trainerId) {
      const user = await userModel.findOneById(trainerId)
      if (user.role !== USER_ROLES.ADMIN) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền tạo lịch cho khóa học này!')
      }
    }

    if (course.status !== 'approved') {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Chỉ khóa học đã được duyệt mới có thể tạo lịch!')
    }

    const existingSchedule = await scheduleModel.findByCourse(courseId)
    if (existingSchedule && !existingSchedule._destroy) {
      throw new ApiError(StatusCodes.CONFLICT, 'Khóa học này đã có lịch học!')
    }

    const scheduleData = {
      courseId: courseId,
      providerId: course.providerId.toString(),
      title: data.title || `Lịch học - ${course.title}`,
      description: data.description || '',
      status: SCHEDULE_STATUS.DRAFT,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      totalSessions: data.sessions ? data.sessions.length : 0,
      completedSessions: 0,
      location: data.location || course.location,
      sessions: (data.sessions || []).map(s => ({
        ...s,
        date: new Date(s.date),
        status: SESSION_STATUS.SCHEDULED,
        attendance: []
      })),
      reminders: []
    }

    const result = await scheduleModel.createNew(scheduleData)
    return await scheduleModel.findOneById(result.insertedId)
  } catch (error) { throw error }
}

// ============ GET SCHEDULE BY COURSE ============
const getScheduleByCourse = async (courseId, trainerId = null) => {
  try {
    const schedule = await scheduleModel.findByCourse(courseId)
    if (!schedule) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy lịch học cho khóa học này!')
    }

    if (trainerId) {
      const course = await courseModel.findOneById(courseId)
      if (course.providerId.toString() !== trainerId) {
        const user = await userModel.findOneById(trainerId)
        if (user.role !== USER_ROLES.ADMIN) {
          throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền xem lịch học này!')
        }
      }
    }

    const course = await courseModel.findOneById(courseId)
    return {
      ...schedule,
      course: course ? {
        _id: course._id,
        title: course.title,
        slug: course.slug,
        thumbnail: course.thumbnail
      } : null
    }
  } catch (error) { throw error }
}

// ============ GET MY SCHEDULES ============
const getMySchedules = async (userId, queryParams) => {
  try {
    const profile = await workerProfileModel.findOneByUserId(userId)
    if (!profile) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Vui lòng hoàn thành hồ sơ trước!')
    }

    const enrollments = await enrollmentModel.findByUser(userId, 0, 100, {
      status: { $in: [ENROLLMENT_STATUS.ENROLLED, ENROLLMENT_STATUS.IN_PROGRESS] }
    })

    const enrolledCourseIds = enrollments.enrollments.map(e => e.courseId.toString())

    if (enrolledCourseIds.length === 0) {
      return {
        schedules: [],
        pagination: {
          totalRecords: 0,
          totalPages: 0,
          currentPage: 1,
          limit: 10
        }
      }
    }

    const { schedules, total } = await scheduleModel.findMySchedules(enrolledCourseIds, queryParams)

    const enrichedSchedules = await Promise.all(
      schedules.map(async (schedule) => {
        const course = await courseModel.findOneById(schedule.courseId)
        return {
          ...schedule,
          course: course ? {
            _id: course._id,
            title: course.title,
            slug: course.slug,
            thumbnail: course.thumbnail
          } : null
        }
      })
    )

    return {
      schedules: enrichedSchedules,
      pagination: {
        totalRecords: total,
        totalPages: Math.ceil(total / (queryParams.limit || DEFAULT_ITEM_PER_PAGE)),
        currentPage: parseInt(queryParams.page) || DEFAULT_PAGE,
        limit: parseInt(queryParams.limit) || DEFAULT_ITEM_PER_PAGE
      }
    }
  } catch (error) { throw error }
}

// ============ GET UPCOMING SCHEDULE ============
const getUpcomingSchedule = async (userId, limit = 5) => {
  try {
    const enrollments = await enrollmentModel.findByUser(userId, 0, 100, {
      status: { $in: [ENROLLMENT_STATUS.ENROLLED, ENROLLMENT_STATUS.IN_PROGRESS] }
    })

    const enrolledCourseIds = enrollments.enrollments.map(e => e.courseId.toString())

    if (enrolledCourseIds.length === 0) {
      return []
    }

    const fromDate = new Date()
    const schedules = await scheduleModel.findUpcomingByUser(enrolledCourseIds, fromDate, limit)

    const enrichedSchedules = await Promise.all(
      schedules.map(async (schedule) => {
        const course = await courseModel.findOneById(schedule.courseId)
        return {
          ...schedule,
          course: course ? {
            _id: course._id,
            title: course.title,
            slug: course.slug,
            thumbnail: course.thumbnail
          } : null
        }
      })
    )

    return enrichedSchedules
  } catch (error) { throw error }
}

// ============ GET SCHEDULE BY ID ============
const getScheduleById = async (scheduleId, userId = null) => {
  try {
    const schedule = await scheduleModel.findOneById(scheduleId)
    if (!schedule) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy lịch học!')
    }

    if (userId) {
      const course = await courseModel.findOneById(schedule.courseId)
      const isTrainer = course && course.providerId.toString() === userId

      if (!isTrainer) {
        const enrollment = await enrollmentModel.findOneByUserAndCourse(userId, schedule.courseId)
        if (!enrollment) {
          const user = await userModel.findOneById(userId)
          if (user.role !== USER_ROLES.ADMIN) {
            throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền xem lịch học này!')
          }
        }
      }
    }

    const course = await courseModel.findOneById(schedule.courseId)
    return {
      ...schedule,
      course: course ? {
        _id: course._id,
        title: course.title,
        slug: course.slug,
        thumbnail: course.thumbnail
      } : null
    }
  } catch (error) { throw error }
}

// ============ UPDATE SCHEDULE ============
const updateSchedule = async (scheduleId, data, trainerId) => {
  try {
    const schedule = await scheduleModel.findOneById(scheduleId)
    if (!schedule) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy lịch học!')
    }

    if (schedule.providerId.toString() !== trainerId) {
      const user = await userModel.findOneById(trainerId)
      if (user.role !== USER_ROLES.ADMIN) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền cập nhật lịch học này!')
      }
    }

    if (data.startDate) data.startDate = new Date(data.startDate)
    if (data.endDate) data.endDate = new Date(data.endDate)

    return await scheduleModel.update(scheduleId, data)
  } catch (error) { throw error }
}

// ============ PUBLISH SCHEDULE ============
const publishSchedule = async (scheduleId, trainerId) => {
  try {
    const schedule = await scheduleModel.findOneById(scheduleId)
    if (!schedule) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy lịch học!')
    }

    if (schedule.providerId.toString() !== trainerId) {
      const user = await userModel.findOneById(trainerId)
      if (user.role !== USER_ROLES.ADMIN) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền công bố lịch học này!')
      }
    }

    if (schedule.sessions.length === 0) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Lịch học phải có ít nhất 1 buổi học!')
    }

    return await scheduleModel.updateStatus(scheduleId, SCHEDULE_STATUS.PUBLISHED)
  } catch (error) { throw error }
}

// ============ DELETE SCHEDULE ============
const deleteSchedule = async (scheduleId, trainerId) => {
  try {
    const schedule = await scheduleModel.findOneById(scheduleId)
    if (!schedule) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy lịch học!')
    }

    if (schedule.providerId.toString() !== trainerId) {
      const user = await userModel.findOneById(trainerId)
      if (user.role !== USER_ROLES.ADMIN) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền xóa lịch học này!')
      }
    }

    if ([SCHEDULE_STATUS.IN_PROGRESS, SCHEDULE_STATUS.COMPLETED].includes(schedule.status)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Không thể xóa lịch học đang diễn ra hoặc đã hoàn thành!')
    }

    return await scheduleModel.deleteSchedule(scheduleId)
  } catch (error) { throw error }
}

// ============ ADD SESSION ============
const addSession = async (scheduleId, sessionData, trainerId) => {
  try {
    const schedule = await scheduleModel.findOneById(scheduleId)
    if (!schedule) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy lịch học!')
    }

    if (schedule.providerId.toString() !== trainerId) {
      const user = await userModel.findOneById(trainerId)
      if (user.role !== USER_ROLES.ADMIN) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền thêm buổi học!')
      }
    }

    const existingSession = schedule.sessions.find(s => s.sessionNumber === sessionData.sessionNumber)
    if (existingSession) {
      throw new ApiError(StatusCodes.CONFLICT, `Buổi học số ${sessionData.sessionNumber} đã tồn tại!`)
    }

    const newSession = {
      ...sessionData,
      date: new Date(sessionData.date),
      status: SESSION_STATUS.SCHEDULED,
      attendance: []
    }

    return await scheduleModel.addSession(scheduleId, newSession)
  } catch (error) { throw error }
}

// ============ UPDATE SESSION ============
const updateSession = async (scheduleId, sessionNumber, sessionData, trainerId) => {
  try {
    const schedule = await scheduleModel.findOneById(scheduleId)
    if (!schedule) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy lịch học!')
    }

    if (schedule.providerId.toString() !== trainerId) {
      const user = await userModel.findOneById(trainerId)
      if (user.role !== USER_ROLES.ADMIN) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền cập nhật buổi học!')
      }
    }

    const session = schedule.sessions.find(s => s.sessionNumber === sessionNumber)
    if (!session) {
      throw new ApiError(StatusCodes.NOT_FOUND, `Không tìm thấy buổi học số ${sessionNumber}!`)
    }

    if (sessionData.date) sessionData.date = new Date(sessionData.date)

    return await scheduleModel.updateSession(scheduleId, sessionNumber, sessionData)
  } catch (error) { throw error }
}

// ============ RESCHEDULE SESSION ============
const rescheduleSession = async (scheduleId, sessionNumber, newDate, newStartTime, newEndTime, reason, trainerId) => {
  try {
    const schedule = await scheduleModel.findOneById(scheduleId)
    if (!schedule) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy lịch học!')
    }

    if (schedule.providerId.toString() !== trainerId) {
      const user = await userModel.findOneById(trainerId)
      if (user.role !== USER_ROLES.ADMIN) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền đổi lịch!')
      }
    }

    const session = schedule.sessions.find(s => s.sessionNumber === sessionNumber)
    if (!session) {
      throw new ApiError(StatusCodes.NOT_FOUND, `Không tìm thấy buổi học số ${sessionNumber}!`)
    }

    if (session.status === SESSION_STATUS.COMPLETED) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Không thể đổi lịch buổi học đã hoàn thành!')
    }

    const oldDate = session.date
    const result = await scheduleModel.rescheduleSession(scheduleId, sessionNumber, newDate, newStartTime, newEndTime)

    console.log(`Session ${sessionNumber} rescheduled from ${oldDate} to ${newDate}`)

    return result
  } catch (error) { throw error }
}

// ============ CANCEL SESSION ============
const cancelSession = async (scheduleId, sessionNumber, reason, trainerId) => {
  try {
    const schedule = await scheduleModel.findOneById(scheduleId)
    if (!schedule) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy lịch học!')
    }

    if (schedule.providerId.toString() !== trainerId) {
      const user = await userModel.findOneById(trainerId)
      if (user.role !== USER_ROLES.ADMIN) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền hủy buổi học!')
      }
    }

    const session = schedule.sessions.find(s => s.sessionNumber === sessionNumber)
    if (!session) {
      throw new ApiError(StatusCodes.NOT_FOUND, `Không tìm thấy buổi học số ${sessionNumber}!`)
    }

    if (session.status === SESSION_STATUS.COMPLETED) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Không thể hủy buổi học đã hoàn thành!')
    }

    return await scheduleModel.cancelSession(scheduleId, sessionNumber, reason)
  } catch (error) { throw error }
}

// ============ MARK SESSION COMPLETE ============
const markSessionComplete = async (scheduleId, sessionNumber, trainerId) => {
  try {
    const schedule = await scheduleModel.findOneById(scheduleId)
    if (!schedule) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy lịch học!')
    }

    if (schedule.providerId.toString() !== trainerId) {
      const user = await userModel.findOneById(trainerId)
      if (user.role !== USER_ROLES.ADMIN) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền đánh dấu hoàn thành!')
      }
    }

    const session = schedule.sessions.find(s => s.sessionNumber === sessionNumber)
    if (!session) {
      throw new ApiError(StatusCodes.NOT_FOUND, `Không tìm thấy buổi học số ${sessionNumber}!`)
    }

    if (session.status === SESSION_STATUS.COMPLETED) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Buổi học đã được đánh dấu hoàn thành!')
    }

    return await scheduleModel.markSessionComplete(scheduleId, sessionNumber)
  } catch (error) { throw error }
}

// ============ RECORD ATTENDANCE ============
const recordAttendance = async (scheduleId, sessionNumber, attendanceData, trainerId) => {
  try {
    const schedule = await scheduleModel.findOneById(scheduleId)
    if (!schedule) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy lịch học!')
    }

    if (schedule.providerId.toString() !== trainerId) {
      const user = await userModel.findOneById(trainerId)
      if (user.role !== USER_ROLES.ADMIN) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền ghi điểm danh!')
      }
    }

    const session = schedule.sessions.find(s => s.sessionNumber === sessionNumber)
    if (!session) {
      throw new ApiError(StatusCodes.NOT_FOUND, `Không tìm thấy buổi học số ${sessionNumber}!`)
    }

    const enrollment = await enrollmentModel.findByCourse(schedule.courseId, 0, 1000, {
      status: { $in: [ENROLLMENT_STATUS.ENROLLED, ENROLLMENT_STATUS.IN_PROGRESS] }
    })

    const enrolledUserIds = enrollment.enrollments.map(e => e.userId.toString())
    for (const record of attendanceData) {
      if (!enrolledUserIds.includes(record.userId)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, `Người dùng ${record.userId} không đăng ký khóa học này!`)
      }
    }

    return await scheduleModel.recordAttendance(scheduleId, sessionNumber, attendanceData)
  } catch (error) { throw error }
}

// ============ GET SESSION ATTENDANCE ============
const getSessionAttendance = async (scheduleId, sessionNumber, trainerId = null) => {
  try {
    const schedule = await scheduleModel.findOneById(scheduleId)
    if (!schedule) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy lịch học!')
    }

    if (trainerId) {
      if (schedule.providerId.toString() !== trainerId) {
        const user = await userModel.findOneById(trainerId)
        if (user.role !== USER_ROLES.ADMIN) {
          throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền xem điểm danh!')
        }
      }
    }

    const session = schedule.sessions.find(s => s.sessionNumber === sessionNumber)
    if (!session) {
      throw new ApiError(StatusCodes.NOT_FOUND, `Không tìm thấy buổi học số ${sessionNumber}!`)
    }

    const attendance = await scheduleModel.getSessionAttendance(scheduleId, sessionNumber)

    const enrichedAttendance = await Promise.all(
      (attendance || []).map(async (record) => {
        const user = await userModel.findOneById(record.userId)
        return {
          ...record,
          user: user ? {
            _id: user._id,
            displayName: user.displayName,
            email: user.email,
            phone: user.phone
          } : null
        }
      })
    )

    return enrichedAttendance
  } catch (error) { throw error }
}

// ============ GET TRAINER SCHEDULES ============
const getTrainerSchedules = async (trainerId, queryParams) => {
  try {
    const { page = DEFAULT_PAGE, limit = DEFAULT_ITEM_PER_PAGE } = queryParams
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const { schedules, total } = await scheduleModel.findByProvider(trainerId, skip, parseInt(limit))

    const enrichedSchedules = await Promise.all(
      schedules.map(async (schedule) => {
        const course = await courseModel.findOneById(schedule.courseId)
        return {
          ...schedule,
          course: course ? {
            _id: course._id,
            title: course.title,
            slug: course.slug
          } : null
        }
      })
    )

    return {
      schedules: enrichedSchedules,
      pagination: {
        totalRecords: total,
        totalPages: Math.ceil(total / parseInt(limit)),
        currentPage: parseInt(page),
        limit: parseInt(limit)
      }
    }
  } catch (error) { throw error }
}

// ============ GET SCHEDULE STATS ============
const getScheduleStats = async (trainerId) => {
  try {
    return await scheduleModel.getStatsByProvider(trainerId)
  } catch (error) { throw error }
}

export const scheduleService = {
  // Create
  createSchedule,

  // Read
  getScheduleByCourse,
  getMySchedules,
  getUpcomingSchedule,
  getScheduleById,
  getTrainerSchedules,
  getScheduleStats,

  // Update
  updateSchedule,
  publishSchedule,

  // Delete
  deleteSchedule,

  // Session Management
  addSession,
  updateSession,
  rescheduleSession,
  cancelSession,
  markSessionComplete,

  // Attendance
  recordAttendance,
  getSessionAttendance
}
