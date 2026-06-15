import { StatusCodes } from 'http-status-codes'
import { forumService } from '~/services/forumService'
import { ObjectId } from 'mongodb'

const getCategories = async (req, res, next) => {
  try {
    const type = req.query.type || 'forum'
    const categories = await forumService.getCategories(type)
    res.status(StatusCodes.OK).json({ success: true, data: categories })
  } catch (error) {
    next(error)
  }
}

const createCategory = async (req, res, next) => {
  try {
    const category = await forumService.createCategory(req.body)
    res.status(StatusCodes.CREATED).json({ success: true, data: category })
  } catch (error) {
    next(error)
  }
}

const createPost = async (req, res, next) => {
  try {
    const post = await forumService.createPost(req.user._id, req.body)
    res.status(StatusCodes.CREATED).json({ success: true, data: post })
  } catch (error) {
    next(error)
  }
}

const getPosts = async (req, res, next) => {
  try {
    const { categoryId, page = 1, limit = 20 } = req.query
    const filter = {}
    if (categoryId) {
      filter.categoryId = new ObjectId(categoryId)
    }
    const skip = (Math.max(1, parseInt(page)) - 1) * parseInt(limit)
    
    const result = await forumService.getPosts(filter, skip, parseInt(limit))
    res.status(StatusCodes.OK).json({ 
      success: true, 
      data: result.posts,
      pagination: { total: result.total, page: parseInt(page), limit: parseInt(limit) }
    })
  } catch (error) {
    next(error)
  }
}

const getPostDetail = async (req, res, next) => {
  try {
    const post = await forumService.getPostDetail(req.params.id)
    if (!post) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Bài viết không tồn tại' })
    }
    res.status(StatusCodes.OK).json({ success: true, data: post })
  } catch (error) {
    next(error)
  }
}

const toggleLike = async (req, res, next) => {
  try {
    const post = await forumService.toggleLike(req.params.id, req.user._id)
    res.status(StatusCodes.OK).json({ success: true, data: post })
  } catch (error) {
    next(error)
  }
}

const createComment = async (req, res, next) => {
  try {
    const comments = await forumService.createComment(req.user._id, req.params.postId, req.body.content)
    res.status(StatusCodes.CREATED).json({ success: true, data: comments })
  } catch (error) {
    next(error)
  }
}

const getComments = async (req, res, next) => {
  try {
    const comments = await forumService.getComments(req.params.postId)
    res.status(StatusCodes.OK).json({ success: true, data: comments })
  } catch (error) {
    next(error)
  }
}

const getMyPostsWithStats = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const skip = (Math.max(1, parseInt(page)) - 1) * parseInt(limit)
    
    const result = await forumService.getMyPostsWithStats(req.user._id, skip, parseInt(limit))
    res.status(StatusCodes.OK).json({
      success: true,
      data: result.posts,
      stats: result.stats,
      pagination: { page: parseInt(page), limit: parseInt(limit) }
    })
  } catch (error) {
    next(error)
  }
}

const deletePost = async (req, res, next) => {
  try {
    await forumService.deletePost(req.params.id, req.user._id)
    res.status(StatusCodes.OK).json({ success: true, message: 'Xóa bài viết thành công' })
  } catch (error) {
    next(error)
  }
}

export const forumController = {
  getCategories,
  createCategory,
  createPost,
  getPosts,
  getPostDetail,
  toggleLike,
  createComment,
  getComments,
  getMyPostsWithStats,
  deletePost
}
