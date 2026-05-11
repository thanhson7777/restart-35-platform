import { scheduleService } from '~/services/scheduleService'
import { StatusCodes } from 'http-status-codes'

// ============ CREATE SCHEDULE ============
const createSchedule = async (req, res, next) => {
  try {
    const trainerId = req.user._id.toString()
    const schedule = await scheduleService.createSchedule(req.body.courseId, req.body, trainerId)

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Tạo lịch học thành công!',
      data: schedule
    })
  } catch (error) { next(error) }
}

// ============ GET SCHEDULE BY COURSE ============
const getScheduleByCourse = async (req, res, next) => {
  try {
    const trainerId = req.user._id.toString()
    const schedule = await scheduleService.getScheduleByCourse(req.params.courseId, trainerId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy lịch học thành công!',
      data: schedule
    })
  } catch (error) { next(error) }
}

// ============ GET MY SCHEDULES ============
const getMySchedules = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const result = await scheduleService.getMySchedules(userId, req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy lịch học thành công!',
      data: result.schedules,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

// ============ GET UPCOMING SCHEDULE ============
const getUpcomingSchedule = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const limit = parseInt(req.query.limit) || 5
    const schedules = await scheduleService.getUpcomingSchedule(userId, limit)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy lịch sắp tới thành công!',
      data: schedules
    })
  } catch (error) { next(error) }
}

// ============ GET SCHEDULE BY ID ============
const getScheduleById = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const schedule = await scheduleService.getScheduleById(req.params.id, userId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy lịch học thành công!',
      data: schedule
    })
  } catch (error) { next(error) }
}

// ============ UPDATE SCHEDULE ============
const updateSchedule = async (req, res, next) => {
  try {
    const trainerId = req.user._id.toString()
    const schedule = await scheduleService.updateSchedule(req.params.id, req.body, trainerId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cập nhật lịch học thành công!',
      data: schedule
    })
  } catch (error) { next(error) }
}

// ============ PUBLISH SCHEDULE ============
const publishSchedule = async (req, res, next) => {
  try {
    const trainerId = req.user._id.toString()
    const schedule = await scheduleService.publishSchedule(req.params.id, trainerId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Công bố lịch học thành công!',
      data: schedule
    })
  } catch (error) { next(error) }
}

// ============ DELETE SCHEDULE ============
const deleteSchedule = async (req, res, next) => {
  try {
    const trainerId = req.user._id.toString()
    await scheduleService.deleteSchedule(req.params.id, trainerId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Xóa lịch học thành công!'
    })
  } catch (error) { next(error) }
}

// ============ ADD SESSION ============
const addSession = async (req, res, next) => {
  try {
    const trainerId = req.user._id.toString()
    const schedule = await scheduleService.addSession(req.params.id, req.body, trainerId)

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Thêm buổi học thành công!',
      data: schedule
    })
  } catch (error) { next(error) }
}

// ============ UPDATE SESSION ============
const updateSession = async (req, res, next) => {
  try {
    const trainerId = req.user._id.toString()
    const { id, sessionNumber } = req.params
    const schedule = await scheduleService.updateSession(id, parseInt(sessionNumber), req.body, trainerId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cập nhật buổi học thành công!',
      data: schedule
    })
  } catch (error) { next(error) }
}

// ============ RESCHEDULE SESSION ============
const rescheduleSession = async (req, res, next) => {
  try {
    const trainerId = req.user._id.toString()
    const { id, sessionNumber } = req.params
    const { newDate, newStartTime, newEndTime, reason } = req.body

    const schedule = await scheduleService.rescheduleSession(
      id,
      parseInt(sessionNumber),
      newDate,
      newStartTime,
      newEndTime,
      reason,
      trainerId
    )

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Đổi lịch buổi học thành công!',
      data: schedule
    })
  } catch (error) { next(error) }
}

// ============ CANCEL SESSION ============
const cancelSession = async (req, res, next) => {
  try {
    const trainerId = req.user._id.toString()
    const { id, sessionNumber } = req.params
    const { reason } = req.body

    const schedule = await scheduleService.cancelSession(id, parseInt(sessionNumber), reason, trainerId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Hủy buổi học thành công!',
      data: schedule
    })
  } catch (error) { next(error) }
}

// ============ MARK SESSION COMPLETE ============
const markSessionComplete = async (req, res, next) => {
  try {
    const trainerId = req.user._id.toString()
    const { id, sessionNumber } = req.params

    const schedule = await scheduleService.markSessionComplete(id, parseInt(sessionNumber), trainerId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Đánh dấu hoàn thành buổi học thành công!',
      data: schedule
    })
  } catch (error) { next(error) }
}

// ============ RECORD ATTENDANCE ============
const recordAttendance = async (req, res, next) => {
  try {
    const trainerId = req.user._id.toString()
    const { id, sessionNumber } = req.params
    const { attendance } = req.body

    const schedule = await scheduleService.recordAttendance(id, parseInt(sessionNumber), attendance, trainerId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Ghi điểm danh thành công!',
      data: schedule
    })
  } catch (error) { next(error) }
}

// ============ GET SESSION ATTENDANCE ============
const getSessionAttendance = async (req, res, next) => {
  try {
    const trainerId = req.user._id.toString()
    const { id, sessionNumber } = req.params

    const attendance = await scheduleService.getSessionAttendance(id, parseInt(sessionNumber), trainerId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy điểm danh thành công!',
      data: attendance
    })
  } catch (error) { next(error) }
}

// ============ GET TRAINER SCHEDULES ============
const getTrainerSchedules = async (req, res, next) => {
  try {
    const trainerId = req.user._id.toString()
    const result = await scheduleService.getTrainerSchedules(trainerId, req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách lịch học thành công!',
      data: result.schedules,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

// ============ GET SCHEDULE STATS ============
const getScheduleStats = async (req, res, next) => {
  try {
    const trainerId = req.user._id.toString()
    const stats = await scheduleService.getScheduleStats(trainerId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thống kê thành công!',
      data: stats
    })
  } catch (error) { next(error) }
}

export const scheduleController = {
  // Worker
  getMySchedules,
  getUpcomingSchedule,
  getScheduleByCourse,
  getScheduleById,
  getSessionAttendance,

  // Trainer
  createSchedule,
  updateSchedule,
  publishSchedule,
  deleteSchedule,
  addSession,
  updateSession,
  rescheduleSession,
  cancelSession,
  markSessionComplete,
  recordAttendance,
  getTrainerSchedules,
  getScheduleStats
}
