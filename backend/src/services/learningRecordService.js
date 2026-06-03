import { learningRecordModel } from '~/models/learningRecordModel'
import { enrollmentModel } from '~/models/enrollmentModel'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import {
  DEFAULT_PAGE,
  DEFAULT_ITEM_PER_PAGE,
  LEARNING_EVENT_TYPES
} from '~/utils/constants'

// ============ RECORD EVENT ============
const recordEvent = async (userId, data) => {
  try {
    const { enrollmentId, courseId, event_type, metadata } = data

    const enrollment = await enrollmentModel.findOneById(enrollmentId)
    if (!enrollment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Đăng ký không tồn tại!')
    }

    if (enrollment.userId.toString() !== userId.toString()) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền ghi nhận sự kiện cho đăng ký này!')
    }

    const recordData = {
      enrollmentId,
      userId,
      courseId,
      event_type,
      metadata: metadata || {}
    }

    const result = await learningRecordModel.createNew(recordData)
    const record = { _id: result.insertedId, ...recordData }
    return record
  } catch (error) {
    throw error
  }
}

// ============ GET LEARNING RECORDS ============
const getLearningRecords = async (query) => {
  try {
    const {
      page = DEFAULT_PAGE,
      item_per_page = DEFAULT_ITEM_PER_PAGE,
      enrollmentId,
      userId,
      courseId,
      event_type,
      from,
      to
    } = query

    const skip = (page - 1) * item_per_page
    const limit = parseInt(item_per_page)

    const matchCondition = {}

    if (enrollmentId) matchCondition.enrollmentId = enrollmentId
    if (userId) matchCondition.userId = userId
    if (courseId) matchCondition.courseId = courseId
    if (event_type) matchCondition.event_type = event_type

    if (from || to) {
      matchCondition.createdAt = {}
      if (from) matchCondition.createdAt.$gte = new Date(from)
      if (to) matchCondition.createdAt.$lte = new Date(to)
    }

    const result = await learningRecordModel.findByPaginate(matchCondition, skip, limit)

    return {
      records: result.records,
      pagination: {
        page: parseInt(page),
        item_per_page: limit,
        total: result.total,
        total_pages: Math.ceil(result.total / limit)
      }
    }
  } catch (error) {
    throw error
  }
}

// ============ GET ENROLLMENT HISTORY ============
const getEnrollmentHistory = async (enrollmentId, requestingUserId, requestingRole) => {
  try {
    const enrollment = await enrollmentModel.findOneById(enrollmentId)
    if (!enrollment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Đăng ký không tồn tại!')
    }

    const isOwner = enrollment.userId.toString() === requestingUserId.toString()
    const isAdmin = requestingRole === 'admin'
    const isTrainer = requestingRole === 'trainer'

    if (!isOwner && !isAdmin && !isTrainer) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền xem lịch sử học tập này!')
    }

    const records = await learningRecordModel.findByEnrollment(enrollmentId)
    return records
  } catch (error) {
    throw error
  }
}

// ============ GET MY LEARNING RECORDS ============
const getMyLearningRecords = async (userId, query) => {
  try {
    const records = await learningRecordModel.findByUser(userId, query)
    return records
  } catch (error) {
    throw error
  }
}

// ============ CALCULATE PROGRESS ============
const calculateProgress = async (enrollmentId) => {
  try {
    const enrollment = await enrollmentModel.findOneById(enrollmentId)
    if (!enrollment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Đăng ký không tồn tại!')
    }

    const records = await learningRecordModel.findByEnrollment(enrollmentId)
    if (records.length === 0) {
      return {
        enrollmentId,
        overall: 0,
        video: { completed: 0, total: 0, percentage: 0 },
        quiz: { completed: 0, total: 0, percentage: 0 },
        modules: { completed: 0, total: 0, percentage: 0 },
        details: []
      }
    }

    const videoRecords = records.filter(r =>
      [LEARNING_EVENT_TYPES.VIDEO_STARTED, LEARNING_EVENT_TYPES.VIDEO_COMPLETED,
       LEARNING_EVENT_TYPES.VIDEO_PAUSED, LEARNING_EVENT_TYPES.VIDEO_SEEKED].includes(r.event_type)
    )

    const quizRecords = records.filter(r =>
      [LEARNING_EVENT_TYPES.QUIZ_STARTED, LEARNING_EVENT_TYPES.QUIZ_SUBMITTED].includes(r.event_type)
    )

    const moduleRecords = records.filter(r =>
      r.event_type === LEARNING_EVENT_TYPES.MODULE_COMPLETED
    )

    const quizSubmitted = quizRecords.filter(r => r.event_type === LEARNING_EVENT_TYPES.QUIZ_SUBMITTED)
    const uniqueQuizzes = new Set(quizSubmitted.map(r => r.metadata?.quizId).filter(Boolean))
    const quizPassed = quizSubmitted.filter(r => r.metadata?.passed === true)
    const uniqueModules = new Set(moduleRecords.map(r => r.metadata?.moduleId).filter(Boolean))

    const videoProgressMap = {}
    for (const record of videoRecords) {
      const vid = record.metadata?.videoId
      if (!vid) continue
      if (!videoProgressMap[vid]) {
        videoProgressMap[vid] = { duration: record.metadata?.videoDuration || 0, watched: 0 }
      }
      if (record.metadata?.watchedDuration) {
        videoProgressMap[vid].watched = Math.max(videoProgressMap[vid].watched, record.metadata.watchedDuration)
      }
    }

    let totalVideoPercent = 0
    const videoDetails = Object.entries(videoProgressMap).map(([videoId, data]) => {
      const pct = data.duration > 0 ? Math.min(100, Math.round((data.watched / data.duration) * 100)) : 0
      totalVideoPercent += pct
      return { videoId, watchedDuration: data.watched, videoDuration: data.duration, percentage: pct }
    })

    const videoPercentage = videoDetails.length > 0
      ? Math.round(totalVideoPercent / videoDetails.length)
      : 0

    const quizPercentage = uniqueQuizzes.size > 0
      ? Math.round((quizPassed.length / uniqueQuizzes.size) * 100)
      : 0

    const overall = Math.round((videoPercentage * 0.5 + quizPercentage * 0.5))

    return {
      enrollmentId,
      overall,
      video: {
        totalVideos: videoDetails.length,
        percentage: videoPercentage,
        details: videoDetails
      },
      quiz: {
        totalQuizzes: uniqueQuizzes.size,
        passed: quizPassed.length,
        percentage: quizPercentage
      },
      modules: {
        completed: uniqueModules.size,
        details: Array.from(uniqueModules)
      }
    }
  } catch (error) {
    throw error
  }
}

// ============ DROPOUT RISK ANALYSIS ============
const getDropoutRisk = async (query) => {
  try {
    const { courseId, minDaysInactive = 7 } = query

    const matchCondition = {}
    if (courseId) matchCondition.courseId = courseId

    const inactiveThreshold = new Date()
    inactiveThreshold.setDate(inactiveThreshold.getDate() - minDaysInactive)

    const db = await (await import('~/config/mongodb')).GET_DB()

    const pipeline = [
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$enrollmentId',
          userId: { $first: '$userId' },
          courseId: { $first: '$courseId' },
          lastActivity: { $first: '$createdAt' },
          totalRecords: { $sum: 1 },
          videoCompleted: {
            $sum: {
              $cond: [{ $eq: ['$event_type', LEARNING_EVENT_TYPES.VIDEO_COMPLETED] }, 1, 0]
            }
          },
          quizSubmitted: {
            $sum: {
              $cond: [{ $eq: ['$event_type', LEARNING_EVENT_TYPES.QUIZ_SUBMITTED] }, 1, 0]
            }
          },
          quizPassed: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$event_type', LEARNING_EVENT_TYPES.QUIZ_SUBMITTED] },
                    { $eq: ['$metadata.passed', true] }
                  ]
                }, 1, 0
              ]
            }
          }
        }
      },
      {
        $addFields: {
          inactiveDays: {
            $divide: [
              { $subtract: [new Date(), '$lastActivity'] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      },
      {
        $match: {
          $or: [
            { lastActivity: { $lt: inactiveThreshold } },
            { $expr: { $lt: [{ $ifNull: ['$videoCompleted', 0] }, 1] } }
          ]
        }
      }
    ]

    const risks = await db.collection('learning_records').aggregate(pipeline).toArray()

    const riskAnalysis = risks.map(r => {
      let riskLevel = 'low'
      if (r.inactiveDays > 14 || r.quizPassed === 0) {
        riskLevel = 'high'
      } else if (r.inactiveDays > 7 || r.videoCompleted < 2) {
        riskLevel = 'medium'
      }
      return {
        enrollmentId: r._id,
        userId: r.userId,
        courseId: r.courseId,
        riskLevel,
        inactiveDays: Math.round(r.inactiveDays * 10) / 10,
        videoCompleted: r.videoCompleted,
        quizSubmitted: r.quizSubmitted,
        quizPassed: r.quizPassed
      }
    })

    return {
      totalAnalyzed: risks.length,
      highRisk: riskAnalysis.filter(r => r.riskLevel === 'high').length,
      mediumRisk: riskAnalysis.filter(r => r.riskLevel === 'medium').length,
      lowRisk: riskAnalysis.filter(r => r.riskLevel === 'low').length,
      learners: riskAnalysis
    }
  } catch (error) {
    throw error
  }
}

export const learningRecordService = {
  recordEvent,
  getLearningRecords,
  getEnrollmentHistory,
  getMyLearningRecords,
  calculateProgress,
  getDropoutRisk
}
