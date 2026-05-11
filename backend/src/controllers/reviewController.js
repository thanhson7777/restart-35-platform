import { reviewService } from '~/services/reviewService'
import { StatusCodes } from 'http-status-codes'

// ============ CREATE REVIEW ============
const createReview = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const review = await reviewService.createReview(req.body.courseId, userId, req.body)

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Gửi đánh giá thành công! Đánh giá của bạn đang chờ duyệt.',
      data: review
    })
  } catch (error) { next(error) }
}

// ============ GET REVIEWS BY COURSE ============
const getReviewsByCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params
    const isPublic = !req.user
    const result = await reviewService.getReviewsByCourse(courseId, req.query, isPublic)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách đánh giá thành công!',
      data: result.reviews,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

// ============ GET MY REVIEWS ============
const getMyReviews = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const result = await reviewService.getMyReviews(userId, req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy đánh giá của bạn thành công!',
      data: result.reviews,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

// ============ GET MY REVIEW FOR COURSE ============
const getMyReviewForCourse = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const { courseId } = req.params
    const review = await reviewService.getMyReviewForCourse(userId, courseId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: review ? 'Lấy đánh giá thành công!' : 'Bạn chưa đánh giá khóa học này!',
      data: review
    })
  } catch (error) { next(error) }
}

// ============ GET REVIEW BY ID ============
const getReviewById = async (req, res, next) => {
  try {
    const review = await reviewService.getReviewById(req.params.id)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy đánh giá thành công!',
      data: review
    })
  } catch (error) { next(error) }
}

// ============ UPDATE REVIEW ============
const updateReview = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const review = await reviewService.updateReview(req.params.id, userId, req.body)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cập nhật đánh giá thành công! Đánh giá sẽ được duyệt lại.',
      data: review
    })
  } catch (error) { next(error) }
}

// ============ DELETE REVIEW ============
const deleteReview = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const userRole = req.user.role
    await reviewService.deleteReview(req.params.id, userId, userRole)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Xóa đánh giá thành công!'
    })
  } catch (error) { next(error) }
}

// ============ ADD RESPONSE (TRAINER) ============
const addResponse = async (req, res, next) => {
  try {
    const trainerId = req.user._id.toString()
    const { id, courseId } = req.params
    const review = await reviewService.addResponse(id, courseId, req.body, trainerId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Trả lời đánh giá thành công!',
      data: review
    })
  } catch (error) { next(error) }
}

// ============ MODERATE REVIEW (ADMIN) ============
const moderateReview = async (req, res, next) => {
  try {
    const adminId = req.user._id.toString()
    const { id } = req.params
    const { action, reason } = req.body

    const review = await reviewService.moderateReview(id, action, reason, adminId)

    const messages = {
      approve: 'Phê duyệt đánh giá thành công!',
      reject: 'Từ chối đánh giá thành công!',
      flag: 'Đánh dấu đánh giá thành công!'
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: messages[action] || 'Cập nhật thành công!',
      data: review
    })
  } catch (error) { next(error) }
}

// ============ VOTE HELPFUL ============
const voteHelpful = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const result = await reviewService.voteHelpful(req.params.id, userId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: result.voted ? 'Đã vote đánh giá này hữu ích!' : 'Đã bỏ vote!',
      data: result.review
    })
  } catch (error) { next(error) }
}

// ============ GET COURSE RATING STATS ============
const getCourseRatingStats = async (req, res, next) => {
  try {
    const { courseId } = req.params
    const stats = await reviewService.getCourseRatingStats(courseId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thống kê đánh giá thành công!',
      data: stats
    })
  } catch (error) { next(error) }
}

// ============ GET PENDING REVIEWS (ADMIN) ============
const getPendingReviews = async (req, res, next) => {
  try {
    const result = await reviewService.getPendingReviews(req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách đánh giá chờ duyệt thành công!',
      data: result.reviews,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

export const reviewController = {
  // Worker
  createReview,
  getMyReviews,
  getMyReviewForCourse,
  updateReview,
  deleteReview,
  voteHelpful,

  // Public/Trainer
  getReviewsByCourse,
  getReviewById,
  getCourseRatingStats,
  addResponse,

  // Admin
  getPendingReviews,
  moderateReview
}
