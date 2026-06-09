import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { mentorModel } from '~/models/mentorModel'
import { authMiddleware } from '~/middlewares/authMiddleware'
import ApiError from '~/utils/ApiError'

const Router = express.Router()

// GET /v1/mentors - List mentors
Router.get('/', async (req, res, next) => {
  try {
    const { expertise, page = 1, limit = 20 } = req.query
    const filter = { isActive: true, ...(expertise && { expertise: { $in: expertise.split(',') } }) }
    const skip = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit))

    const [mentors, total] = await Promise.all([
      mentorModel
        .find(filter)
        .sort({ rating: -1, sessionCount: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('userId', 'name avatar bio'),
      mentorModel.countDocuments(filter),
    ])

    res.json({
      success: true,
      data: mentors,
      pagination: { total, page: parseInt(page), limit: parseInt(limit) },
    })
  } catch (error) {
    next(error)
  }
})

// GET /v1/mentors/:id - Get single mentor
Router.get('/:id', async (req, res, next) => {
  try {
    const mentor = await mentorModel
      .findById(req.params.id)
      .populate('userId', 'name avatar bio')
    if (!mentor) throw new ApiError(StatusCodes.NOT_FOUND, 'Mentor khong ton tai')
    res.json({ success: true, data: mentor })
  } catch (error) {
    next(error)
  }
})

// POST /v1/mentors/register - Register as mentor
Router.post('/register', authMiddleware.isAuthorized, async (req, res, next) => {
  try {
    const existing = await mentorModel.findOne({ userId: req.user._id })
    if (existing) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Ban da la mentor',
      })
    }
    const { expertise, bio } = req.body
    const mentor = await mentorModel.create({
      userId: req.user._id,
      expertise: expertise || [],
      bio: bio || '',
    })
    await mentor.populate('userId', 'name avatar bio')
    res.status(StatusCodes.CREATED).json({ success: true, data: mentor })
  } catch (error) {
    next(error)
  }
})

// PUT /v1/mentors/profile - Update own mentor profile
Router.put('/profile', authMiddleware.isAuthorized, async (req, res, next) => {
  try {
    const { expertise, bio, availability } = req.body
    const mentor = await mentorModel.findOneAndUpdate(
      { userId: req.user._id },
      { expertise, bio, availability },
      { new: true }
    ).populate('userId', 'name avatar bio')
    if (!mentor) throw new ApiError(StatusCodes.NOT_FOUND, 'Chua dang ky lam mentor')
    res.json({ success: true, data: mentor })
  } catch (error) {
    next(error)
  }
})

export default Router
