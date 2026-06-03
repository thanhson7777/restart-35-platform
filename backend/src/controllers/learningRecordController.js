import { learningRecordService } from '~/services/learningRecordService'
import { StatusCodes } from 'http-status-codes'

// ============ CREATE ============
const createLearningRecord = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id.toString()
    const record = await learningRecordService.recordEvent(userId, req.body)

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Ghi nhận sự kiện học tập thành công!',
      data: record
    })
  } catch (error) {
    next(error)
  }
}

// ============ READ ============
const getLearningRecords = async (req, res, next) => {
  try {
    const result = await learningRecordService.getLearningRecords(req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách học tập thành công!',
      data: result.records,
      pagination: result.pagination
    })
  } catch (error) {
    next(error)
  }
}

const getEnrollmentHistory = async (req, res, next) => {
  try {
    const { enrollmentId } = req.params
    const userId = req.jwtDecoded._id.toString()
    const role = req.jwtDecoded.role

    const records = await learningRecordService.getEnrollmentHistory(enrollmentId, userId, role)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy lịch sử học tập thành công!',
      data: records
    })
  } catch (error) {
    next(error)
  }
}

const getMyLearningRecords = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id.toString()
    const records = await learningRecordService.getMyLearningRecords(userId, req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy lịch sử học tập của tôi thành công!',
      data: records
    })
  } catch (error) {
    next(error)
  }
}

// ============ PROGRESS ============
const calculateProgress = async (req, res, next) => {
  try {
    const { enrollmentId } = req.params
    const userId = req.jwtDecoded._id.toString()
    const role = req.jwtDecoded.role

    await learningRecordService.getEnrollmentHistory(enrollmentId, userId, role)
    const progress = await learningRecordService.calculateProgress(enrollmentId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Tính tiến độ học tập thành công!',
      data: progress
    })
  } catch (error) {
    next(error)
  }
}

// ============ ANALYTICS ============
const getDropoutRisk = async (req, res, next) => {
  try {
    const result = await learningRecordService.getDropoutRisk(req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Phân tích nguy cơ bỏ học thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const learningRecordController = {
  createLearningRecord,
  getLearningRecords,
  getEnrollmentHistory,
  getMyLearningRecords,
  calculateProgress,
  getDropoutRisk
}
