import express from 'express'
import mongoose from 'mongoose'
import { StatusCodes } from 'http-status-codes'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { mentorSessionModel } from '~/models/mentorSessionModel'
import { mentorModel } from '~/models/mentorModel'
import ApiError from '~/utils/ApiError'

const Router = express.Router()

// Helper: enrich session with mentor user info
const enrichSession = (session) => {
  if (!session) return null
  const mentorUser = session.mentorId?.userId
  return {
    ...session,
    mentorName: mentorUser?.name || 'Mentor',
    mentorAvatar: mentorUser?.avatar || null,
    mentorBio: mentorUser?.bio || session.mentorId?.bio || '',
    expertise: session.mentorId?.expertise || [],
  }
}

// GET /v1/mentor-sessions/my - Worker's sessions
Router.get('/my', authMiddleware.isAuthorized, async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id.toString()
    const { status, page = 1, limit = 20 } = req.query
    const filters = status ? { status } : {}
    const skip = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit))

    const { sessions, total } = await mentorSessionModel.findByWorker(userId, filters, skip, parseInt(limit))
    const enriched = sessions.map(enrichSession)

    res.status(StatusCodes.OK).json({
      success: true,
      data: enriched,
      pagination: { total, page: parseInt(page), limit: parseInt(limit) },
    })
  } catch (error) {
    next(error)
  }
})

// GET /v1/mentor-sessions/upcoming - Worker's upcoming sessions
Router.get('/upcoming', authMiddleware.isAuthorized, async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id.toString()
    const limit = parseInt(req.query.limit) || 5
    const sessions = await mentorSessionModel.getUpcomingForWorker(userId, limit)
    const enriched = sessions.map(enrichSession)

    res.status(StatusCodes.OK).json({
      success: true,
      data: enriched,
    })
  } catch (error) {
    next(error)
  }
})

// GET /v1/mentor-sessions/:id - Get session detail
Router.get('/:id', authMiddleware.isAuthorized, async (req, res, next) => {
  try {
    const session = await mentorSessionModel.findById(req.params.id)
    if (!session) throw new ApiError(StatusCodes.NOT_FOUND, 'Khong tim thay session')
    res.status(StatusCodes.OK).json({ success: true, data: enrichSession(session) })
  } catch (error) {
    next(error)
  }
})

// POST /v1/mentor-sessions - Book a session
Router.post('/', authMiddleware.isAuthorized, async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id.toString()
    const { mentorId, scheduledAt, duration, topic, notes } = req.body

    if (!mentorId) throw new ApiError(StatusCodes.BAD_REQUEST, 'Mentor ID la bat buoc')
    if (!scheduledAt) throw new ApiError(StatusCodes.BAD_REQUEST, 'Thoi gian la bat buoc')

    const mentor = await mentorModel.findById(mentorId)
    if (!mentor) throw new ApiError(StatusCodes.NOT_FOUND, 'Mentor khong ton tai')

    const session = await mentorSessionModel.createNew({
      mentorId,
      workerId: userId,
      scheduledAt: new Date(scheduledAt),
      duration: parseInt(duration) || 60,
      topic: topic || '',
      notes: notes || '',
      status: 'pending',
    })

    await mentorModel.findByIdAndUpdate(mentorId, { $inc: { sessionCount: 1 } })

    const enriched = enrichSession({ ...session.toObject ? session.toObject() : session })

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Dat lich thanh cong!',
      data: enriched,
    })
  } catch (error) {
    next(error)
  }
})

// PUT /v1/mentor-sessions/:id - Update session (cancel)
Router.put('/:id', authMiddleware.isAuthorized, async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id.toString()
    const session = await mentorSessionModel.findById(req.params.id)
    if (!session) throw new ApiError(StatusCodes.NOT_FOUND, 'Khong tim thay session')

    const isWorker = session.workerId.toString() === userId
    const isMentor = session.mentorId.toString() === userId

    if (!isWorker && !isMentor) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Ban khong co quyen')
    }

    if (req.body.status === 'cancelled') {
      const updated = await mentorSessionModel.updateStatus(req.params.id, {
        status: 'cancelled',
        cancelledBy: userId,
        cancelReason: req.body.cancelReason || '',
      })
      return res.status(StatusCodes.OK).json({ success: true, message: 'Da huy lich', data: updated })
    }

    // Only mentor can confirm
    if (req.body.status === 'confirmed' && !isMentor) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Chi mentor moi co the xac nhan')
    }

    const updated = await mentorSessionModel.updateStatus(req.params.id, req.body)
    res.status(StatusCodes.OK).json({ success: true, data: updated })
  } catch (error) {
    next(error)
  }
})

// PUT /v1/mentor-sessions/:id/complete - Mark complete + rating
Router.put('/:id/complete', authMiddleware.isAuthorized, async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id.toString()
    const session = await mentorSessionModel.findById(req.params.id)
    if (!session) throw new ApiError(StatusCodes.NOT_FOUND, 'Khong tim thay session')
    if (session.workerId.toString() !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Chi worker moi co the danh gia')
    }

    const { rating, feedback } = req.body
    if (!rating || rating < 1 || rating > 5) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Rating phai tu 1-5')
    }

    const updated = await mentorSessionModel.updateStatus(req.params.id, {
      status: 'completed',
      workerRating: rating,
      workerFeedback: feedback || '',
    })

    // Update mentor rating
    if (session.mentorId) {
      const sessions = await mongoose.model('mentor_sessions')
        .find({ mentorId: session.mentorId, status: 'completed', workerRating: { $exists: true } })
      const avgRating = sessions.reduce((sum, s) => sum + s.workerRating, 0) / sessions.length
      await mentorModel.findByIdAndUpdate(session.mentorId, { rating: Math.round(avgRating * 10) / 10 })
    }

    res.status(StatusCodes.OK).json({ success: true, message: 'Da hoan thanh', data: updated })
  } catch (error) {
    next(error)
  }
})

export default Router
