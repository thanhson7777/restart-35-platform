import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { forumPostModel } from '~/models/forumPostModel'
import { commentModel } from '~/models/commentModel'
import { authMiddleware } from '~/middlewares/authMiddleware'
import ApiError from '~/utils/ApiError'

const Router = express.Router()

// GET /v1/forum/posts - List posts
Router.get('/posts', async (req, res, next) => {
  try {
    const { category, page = 1, limit = 20 } = req.query
    const filter = { isDeleted: false, ...(category && { category }) }
    const skip = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit))

    const [posts, total] = await Promise.all([
      forumPostModel
        .find(filter)
        .sort({ isPinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('authorId', 'name avatar'),
      forumPostModel.countDocuments(filter),
    ])

    res.json({
      success: true,
      data: posts,
      pagination: { total, page: parseInt(page), limit: parseInt(limit) },
    })
  } catch (error) {
    next(error)
  }
})

// GET /v1/forum/posts/:id - Get single post
Router.get('/posts/:id', async (req, res, next) => {
  try {
    const post = await forumPostModel
      .findOne({ _id: req.params.id, isDeleted: false })
      .populate('authorId', 'name avatar')
    if (!post) throw new ApiError(StatusCodes.NOT_FOUND, 'Bai viet khong ton tai')
    res.json({ success: true, data: post })
  } catch (error) {
    next(error)
  }
})

// POST /v1/forum/posts - Create post
Router.post('/posts', authMiddleware.isAuthorized, async (req, res, next) => {
  try {
    const { title, content, category, tags } = req.body
    if (!title || !content) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Title va content la bat buoc')
    }
    const post = await forumPostModel.create({
      title,
      content,
      category: category || 'general',
      tags: tags || [],
      authorId: req.user._id,
    })
    await post.populate('authorId', 'name avatar')
    res.status(StatusCodes.CREATED).json({ success: true, data: post })
  } catch (error) {
    next(error)
  }
})

// PUT /v1/forum/posts/:id/react - React to post
Router.put('/posts/:id/react', authMiddleware.isAuthorized, async (req, res, next) => {
  try {
    const { type } = req.body
    if (!['thumbsUp', 'thumbsDown'].includes(type)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Loai reaction khong hop le')
    }
    const update = type === 'thumbsUp'
      ? { $inc: { 'reactions.thumbsUp': 1 } }
      : { $inc: { 'reactions.thumbsDown': 1 } }
    const post = await forumPostModel.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('authorId', 'name avatar')
    if (!post) throw new ApiError(StatusCodes.NOT_FOUND, 'Bai viet khong ton tai')
    res.json({ success: true, data: post })
  } catch (error) {
    next(error)
  }
})

// GET /v1/forum/posts/:postId/comments - Get comments
Router.get('/posts/:postId/comments', async (req, res, next) => {
  try {
    const comments = await commentModel
      .find({ postId: req.params.postId })
      .sort({ createdAt: 1 })
      .populate('authorId', 'name avatar')
    res.json({ success: true, data: comments })
  } catch (error) {
    next(error)
  }
})

// POST /v1/forum/posts/:postId/comments - Add comment
Router.post('/posts/:postId/comments', authMiddleware.isAuthorized, async (req, res, next) => {
  try {
    const { content } = req.body
    if (!content) throw new ApiError(StatusCodes.BAD_REQUEST, 'Content la bat buoc')

    const [comment] = await Promise.all([
      commentModel.create({
        postId: req.params.postId,
        authorId: req.user._id,
        content,
      }),
      forumPostModel.findByIdAndUpdate(req.params.postId, { $inc: { commentCount: 1 } }),
    ])

    await comment.populate('authorId', 'name avatar')
    res.status(StatusCodes.CREATED).json({ success: true, data: comment })
  } catch (error) {
    next(error)
  }
})

export default Router
