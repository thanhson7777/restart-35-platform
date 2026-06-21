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
  ENROLLMENT_STATUS_V2,
  USER_ROLES
} from '~/utils/constants'

// ============ AUTO GENERATE SCHEDULE ============
const generateAutoSchedule = async (courseId, trainerId) => {
  try {
    const course = await courseModel.findOneById(courseId)
    if (!course) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Khóa học không tồn tại!')
    }

    if (course.providerId.toString() !== trainerId) {
      const user = await userModel.findOneById(trainerId)
      if (user.role !== USER_ROLES.ADMIN) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền tự động tạo lịch cho khóa học này!')
      }
    }

    const scheduleConfig = course.scheduleConfig
    if (!scheduleConfig || !scheduleConfig.totalSessions || !scheduleConfig.sessionsPerWeek || scheduleConfig.preferredDays.length === 0) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Khóa học chưa cấu hình lịch tự động hợp lệ (scheduleConfig)!')
    }

    const existingSchedule = await scheduleModel.findByCourse(courseId)
    if (existingSchedule && !existingSchedule._destroy) {
      throw new ApiError(StatusCodes.CONFLICT, 'Khóa học này đã có lịch học, không thể tạo tự động đè lên!')
    }

    // Mapping preferredDays to JS Date.getDay() (0 = Sunday, 1 = Monday...)
    const dayMap = {
      'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
      'Thursday': 4, 'Friday': 5, 'Saturday': 6
    }
    const allowedDays = scheduleConfig.preferredDays.map(d => dayMap[d])

    let currentDate = scheduleConfig.expectedStartDate ? new Date(scheduleConfig.expectedStartDate) : new Date()
    currentDate.setHours(0, 0, 0, 0)
    
    // Ensure we start on an allowed day or find the next one
    while (!allowedDays.includes(currentDate.getDay())) {
      currentDate.setDate(currentDate.getDate() + 1)
    }

    const startDate = new Date(currentDate)
    const sessions = []
    
    // Determine start/end time based on preferredTime
    let startHour = 8, startMinute = 0; // default Morning
    if (scheduleConfig.preferredTime === 'Afternoon') {
      startHour = 13; startMinute = 30;
    } else if (scheduleConfig.preferredTime === 'Evening') {
      startHour = 18; startMinute = 0;
    }

    let sessionDuration = scheduleConfig.sessionDurationMinutes || 90;

    for (let i = 1; i <= scheduleConfig.totalSessions; i++) {
      // Create session
      const sessionDate = new Date(currentDate)
      
      const startTimeStr = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`
      // Calculate end time
      const endTotalMinutes = startHour * 60 + startMinute + sessionDuration
      const endHour = Math.floor(endTotalMinutes / 60)
      const endMinute = endTotalMinutes % 60
      const endTimeStr = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`

      sessions.push({
        sessionNumber: i,
        title: `Buổi ${i}`,
        date: sessionDate,
        startTime: startTimeStr,
        endTime: endTimeStr,
        duration: sessionDuration,
        instructorId: course.providerId.toString(),
        location: course.location || { type: 'online' },
        status: SESSION_STATUS.SCHEDULED,
        attendance: []
      })

      // Move to next allowed day
      do {
        currentDate.setDate(currentDate.getDate() + 1)
      } while (!allowedDays.includes(currentDate.getDay()))
    }

    const scheduleData = {
      courseId: courseId,
      providerId: course.providerId.toString(),
      title: `Lịch học - ${course.title}`,
      description: 'Lịch học được tạo tự động bởi hệ thống',
      status: SCHEDULE_STATUS.DRAFT,
      startDate: startDate,
      endDate: currentDate, // last session's date
      totalSessions: sessions.length,
      completedSessions: 0,
      location: course.location || { type: 'online' },
      sessions: sessions,
      reminders: []
    }

    const result = await scheduleModel.createNew(scheduleData)
    return await scheduleModel.findOneById(result.insertedId)
  } catch (error) { throw error }
}

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

    // We no longer block schedule creation based on course.status
    // so trainers can create schedules while waiting for approval.

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
      return null
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

// ============ GET SCHEDULE BY COURSE (Public) ============
const getScheduleByCoursePublic = async (courseId) => {
  try {
    const schedule = await scheduleModel.findByCourse(courseId)
    if (!schedule || !schedule.sessions || schedule.sessions.length === 0) {
      return []
    }

    // Map sessions and resolve instructor names
    const sessionsWithNames = await Promise.all(
      schedule.sessions.map(async (session) => {
        let instructorName = 'Đang cập nhật'
        if (session.instructorId) {
          try {
            const instructor = await userModel.findOneById(session.instructorId)
            if (instructor) {
              instructorName = instructor.displayName || instructor.fullName || instructor.email
            }
          } catch (_) { /* ignore */ }
        }
        return {
          _id: session._id?.toString() || `sess-${session.sessionNumber}`,
          sessionNumber: session.sessionNumber,
          title: session.title,
          date: session.date,
          startTime: session.startTime,
          endTime: session.endTime,
          duration: session.duration,
          topic: session.topic,
          instructorName,
          location: session.location,
          status: session.status,
        }
      })
    )

    return sessionsWithNames
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
      status: { $in: [ENROLLMENT_STATUS_V2.ACTIVE, ENROLLMENT_STATUS_V2.COMPLETED] }
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
          sessions: (schedule.sessions || []).map(session => {
            const userAtt = (session.attendance || []).find(a => a.userId === userId)
            const myAttendance = userAtt ? userAtt.status : (session.status === 'completed' ? 'absent' : 'upcoming')
            const { attendance, ...restSession } = session // Remove full attendance array for privacy
            return {
              ...restSession,
              myAttendance
            }
          }),
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
      status: { $in: [ENROLLMENT_STATUS_V2.ACTIVE, ENROLLMENT_STATUS_V2.COMPLETED] }
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

// Helper: Sync attendance stats from schedule sessions to learner's enrollment document
const syncEnrollmentAttendance = async (enrollmentId, courseId, userId, schedule = null) => {
  try {
    if (!schedule) {
      schedule = await scheduleModel.findByCourse(courseId)
    }
    if (!schedule || !schedule.sessions) return

    let present = 0
    let absent = 0
    let late = 0
    let totalSessions = 0

    for (const session of schedule.sessions) {
      if (session.status === SESSION_STATUS.COMPLETED || (session.attendance && session.attendance.length > 0)) {
        totalSessions++
        const record = session.attendance?.find(a => a.userId === userId)
        if (record) {
          if (record.status === 'present') present++
          else if (record.status === 'absent') absent++
          else if (record.status === 'late') late++
        } else {
          if (session.status === SESSION_STATUS.COMPLETED) {
            absent++
          }
        }
      }
    }

    await enrollmentModel.updateAttendance(enrollmentId, {
      present,
      absent,
      late,
      totalSessions
    })

    // Auto-complete if all sessions in schedule have been processed (Option B)
    if (schedule.sessions && totalSessions >= schedule.sessions.length) {
      const currentEnroll = await enrollmentModel.findOneById(enrollmentId)
      if (currentEnroll && currentEnroll.status !== 'completed' && currentEnroll.status !== 'dropped' && currentEnroll.status !== 'failed') {
        const { enrollmentService } = await import('~/services/enrollmentService')
        await enrollmentService.completeEnrollment(enrollmentId, schedule.providerId.toString(), {
          score: 100,
          notes: 'Hệ thống tự động tốt nghiệp sau khi hoàn thành điểm danh tất cả các buổi.'
        })
      }
    }

  } catch (error) {
    console.error(`Failed to sync enrollment attendance for user ${userId}:`, error)
  }
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

    const updated = await scheduleModel.markSessionComplete(scheduleId, sessionNumber)

    // Sync stats for all enrolled students
    const enrolls = await enrollmentModel.findByCourse(schedule.courseId, 0, 1000, {
      status: { $in: [ENROLLMENT_STATUS_V2.ACTIVE, ENROLLMENT_STATUS_V2.COMPLETED] }
    })
    if (enrolls && enrolls.enrollments) {
      for (const enroll of enrolls.enrollments) {
        await syncEnrollmentAttendance(enroll._id, schedule.courseId, enroll.userId, updated)
      }
    }

    return updated
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
      status: { $in: [ENROLLMENT_STATUS_V2.ACTIVE, ENROLLMENT_STATUS_V2.COMPLETED] }
    })

    const enrolledUserIds = enrollment.enrollments.map(e => e.userId.toString())
    for (const record of attendanceData) {
      if (!enrolledUserIds.includes(record.userId)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, `Người dùng ${record.userId} không đăng ký khóa học này!`)
      }
    }

    const updated = await scheduleModel.recordAttendance(scheduleId, sessionNumber, attendanceData)

    // Sync stats into enrollment for each updated student
    for (const record of attendanceData) {
      const studentEnroll = await enrollmentModel.findOneByUserAndCourse(record.userId, schedule.courseId)
      if (studentEnroll) {
        await syncEnrollmentAttendance(studentEnroll._id, schedule.courseId, record.userId, updated)

        // Auto mark session as completed if student was present or late
        if (record.status === 'present' || record.status === 'late') {
          try {
            const { enrollmentService } = await import('~/services/enrollmentService')
            await enrollmentService.completeItem(studentEnroll._id, session.sessionNumber.toString(), record.userId)
          } catch (err) {
            console.error(`Failed to auto-complete session for user ${record.userId}:`, err)
          }
        }
      }
    }

    return updated
  } catch (error) { throw error }
}

// ============ STUDENT SELF CHECK-IN ============
const studentCheckin = async (scheduleId, sessionNumber, studentId, pin) => {
  try {
    const schedule = await scheduleModel.findOneById(scheduleId)
    if (!schedule) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy lịch học!')
    }

    const session = schedule.sessions.find(s => s.sessionNumber === sessionNumber)
    if (!session) {
      throw new ApiError(StatusCodes.NOT_FOUND, `Không tìm thấy buổi học số ${sessionNumber}!`)
    }

    if (session.status === SESSION_STATUS.CANCELLED) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Buổi học này đã bị hủy!')
    }

    // Verify PIN code (case-insensitive, last 6 chars of session._id)
    const expectedPin = session._id.toString().substring(18).toUpperCase()
    if (!pin || pin.trim().toUpperCase() !== expectedPin) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Mã PIN điểm danh không chính xác!')
    }

    // Verify student enrollment
    const studentEnrollment = await enrollmentModel.findOneByUserAndCourse(studentId, schedule.courseId)
    if (!studentEnrollment) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Bạn không đăng ký khóa học này!')
    }

    if ([ENROLLMENT_STATUS_V2.DROPPED, ENROLLMENT_STATUS_V2.SUSPENDED, ENROLLMENT_STATUS_V2.FAILED].includes(studentEnrollment.status)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Đăng ký học của bạn đã bị hủy hoặc bạn đã rút lui!')
    }

    const attendanceRecord = {
      userId: studentId,
      status: 'present',
      checkedAt: Date.now()
    }

    const updatedSchedule = await scheduleModel.recordAttendance(scheduleId, sessionNumber, [attendanceRecord])

    // Sync stats into enrollment
    await syncEnrollmentAttendance(studentEnrollment._id, schedule.courseId, studentId, updatedSchedule)

    // Auto mark session as completed for self check-in
    try {
      const { enrollmentService } = await import('~/services/enrollmentService')
      await enrollmentService.completeItem(studentEnrollment._id, session.sessionNumber.toString(), studentId)
    } catch (err) {
      console.error(`Failed to auto-complete session for self check-in ${studentId}:`, err)
    }

    return updatedSchedule
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
            slug: course.slug,
            status: course.status
          } : null
        }
      })
    )

    // Conflict Check Logic
    // We only check within the returned schedules for simplicity, 
    // or ideally fetch all active schedules for the provider.
    // Let's fetch all active schedules for thorough conflict checking.
    const allProviderSchedules = await scheduleModel.findByProvider(trainerId, 0, 1000)
    const allSessions = []
    
    // Flatten all sessions
    if (allProviderSchedules && allProviderSchedules.schedules) {
      allProviderSchedules.schedules.forEach(sch => {
        if (sch.status !== SCHEDULE_STATUS.COMPLETED && sch.sessions) {
          sch.sessions.forEach(sess => {
            if (sess.status !== SESSION_STATUS.CANCELLED && sess.status !== SESSION_STATUS.COMPLETED) {
              allSessions.push({ ...sess, scheduleId: sch._id.toString() })
            }
          })
        }
      })
    }

    const parseMinutes = (timeStr) => {
      if (!timeStr) return 0
      const [h, m] = timeStr.split(':').map(Number)
      return h * 60 + m
    }

    const checkTimeOverlap = (sess1, sess2) => {
      const d1 = new Date(sess1.date).setHours(0,0,0,0)
      const d2 = new Date(sess2.date).setHours(0,0,0,0)
      if (d1 !== d2) return false

      const start1 = parseMinutes(sess1.startTime)
      const end1 = parseMinutes(sess1.endTime)
      const start2 = parseMinutes(sess2.startTime)
      const end2 = parseMinutes(sess2.endTime)

      return (start1 < end2 && start2 < end1)
    }

    // Flag conflicts in the enrichedSchedules
    enrichedSchedules.forEach(schedule => {
      if (schedule.sessions) {
        schedule.sessions.forEach(sess => {
          if (sess.status === SESSION_STATUS.CANCELLED || sess.status === SESSION_STATUS.COMPLETED) return
          
          // Check against all other sessions
          const hasConflict = allSessions.some(otherSess => {
            // skip if same session
            if (otherSess.scheduleId === schedule._id.toString() && otherSess.sessionNumber === sess.sessionNumber) {
              return false
            }
            return checkTimeOverlap(sess, otherSess)
          })

          if (hasConflict) {
            sess.isConflict = true
          }
        })
      }
    })

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
  generateAutoSchedule,

  // Read
  getScheduleByCourse,
  getScheduleByCoursePublic,
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
  getSessionAttendance,
  studentCheckin
}
