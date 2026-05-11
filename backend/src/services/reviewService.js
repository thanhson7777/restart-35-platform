/* eslint-disable indent */
/* eslint-disable no-console */
import { reviewModel, REVIEW_STATUS } from '~/models/reviewModel'
import { courseModel } from '~/models/courseModel'
import { enrollmentModel } from '~/models/enrollmentModel'
import { workerProfileModel } from '~/models/workerProfileModel'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import {
  DEFAULT_PAGE,
  DEFAULT_ITEM_PER_PAGE,
  ENROLLMENT_STATUS,
  USER_ROLES
} from '~/utils/constants'

// ============ CREATE REVIEW ============
const createReview = async (courseId, userId, data) => {
  try {
    const course = await courseModel.findOneById(courseId)
    if (!course) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Khóa học không tồn tại!')
    }

    const enrollment = await enrollmentModel.findOneByUserAndCourse(userId, courseId)
    if (!enrollment) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Bạn chưa đăng ký khóa học này!')
    }

    if (enrollment.status !== ENROLLMENT_STATUS.COMPLETED) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Bạn cần hoàn thành khóa học trước khi đánh giá!')
    }

    const existingReview = await reviewModel.findByUserAndCourse(userId, courseId)
    if (existingReview && !existingReview._destroy) {
      throw new ApiError(StatusCodes.CONFLICT, 'Bạn đã đánh giá khóa học này rồi!')
    }

    const workerProfile = await workerProfileModel.findOneByUserId(userId)

    const reviewData = {
      courseId: courseId,
      userId: userId,
      rating: {
        overall: data.rating.overall,
        content: data.rating.content || data.rating.overall,
        instructor: data.rating.instructor || data.rating.overall,
        materials: data.rating.materials || data.rating.overall,
        support: data.rating.support || data.rating.overall
      },
      title: data.title,
      content: data.content,
      workerProfile: workerProfile ? {
        industry: workerProfile.industry || null,
        age: workerProfile.age || null,
        previousJob: workerProfile.previousJob || null
      } : null,
      status: REVIEW_STATUS.PENDING
    }

    const result = await reviewModel.createNew(reviewData)
    const review = await reviewModel.findOneById(result.insertedId)

    console.log(`New review created for course ${courseId} by user ${userId}`)

    return review
  } catch (error) { throw error }
}

// ============ GET REVIEWS BY COURSE ============
const getReviewsByCourse = async (courseId, queryParams, isPublic = false) => {
  try {
    const course = await courseModel.findOneById(courseId)
    if (!course) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Khóa học không tồn tại!')
    }

    const params = {
      page: parseInt(queryParams.page) || DEFAULT_PAGE,
      limit: parseInt(queryParams.limit) || DEFAULT_ITEM_PER_PAGE,
      sortBy: queryParams.sortBy || 'createdAt',
      order: queryParams.order || 'desc',
      rating: queryParams.rating
    }

    if (isPublic) {
      params.status = REVIEW_STATUS.APPROVED
    }

    const { reviews, total } = await reviewModel.findByCourse(courseId, params)

    return {
      reviews,
      pagination: {
        totalRecords: total,
        totalPages: Math.ceil(total / params.limit),
        currentPage: params.page,
        limit: params.limit
      }
    }
  } catch (error) { throw error }
}

// ============ GET MY REVIEWS ============
const getMyReviews = async (userId, queryParams) => {
  try {
    const params = {
      page: parseInt(queryParams.page) || DEFAULT_PAGE,
      limit: parseInt(queryParams.limit) || DEFAULT_ITEM_PER_PAGE
    }

    const { reviews, total } = await reviewModel.findByUser(userId, params)

    return {
      reviews,
      pagination: {
        totalRecords: total,
        totalPages: Math.ceil(total / params.limit),
        currentPage: params.page,
        limit: params.limit
      }
    }
  } catch (error) { throw error }
}

// ============ GET MY REVIEW FOR COURSE ============
const getMyReviewForCourse = async (userId, courseId) => {
  try {
    const review = await reviewModel.findByUserAndCourse(userId, courseId)
    if (!review || review._destroy) {
      return null
    }
    return review
  } catch (error) { throw error }
}

// ============ GET REVIEW BY ID ============
const getReviewById = async (reviewId) => {
  try {
    const review = await reviewModel.findOneById(reviewId)
    if (!review) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Review không tồn tại!')
    }
    return review
  } catch (error) { throw error }
}

// ============ UPDATE REVIEW ============
const updateReview = async (reviewId, userId, data) => {
  try {
    const review = await reviewModel.findOneById(reviewId)
    if (!review) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Review không tồn tại!')
    }

    if (review.userId !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền cập nhật review này!')
    }

    const updateData = {}
    if (data.rating) {
      updateData.rating = {
        ...review.rating,
        ...data.rating
      }
    }
    if (data.title) updateData.title = data.title
    if (data.content) updateData.content = data.content

    const updatedReview = await reviewModel.update(reviewId, updateData)

    console.log(`Review ${reviewId} updated by user ${userId}`)

    return updatedReview
  } catch (error) { throw error }
}

// ============ DELETE REVIEW ============
const deleteReview = async (reviewId, userId, userRole) => {
  try {
    const review = await reviewModel.findOneById(reviewId)
    if (!review) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Review không tồn tại!')
    }

    if (review.userId !== userId && userRole !== USER_ROLES.ADMIN) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền xóa review này!')
    }

    await reviewModel.deleteReview(reviewId)

    console.log(`Review ${reviewId} deleted`)

    return true
  } catch (error) { throw error }
}

// ============ ADD RESPONSE (TRAINER) ============
const addResponse = async (reviewId, courseId, responseData, trainerId) => {
  try {
    const review = await reviewModel.findOneById(reviewId)
    if (!review) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Review không tồn tại!')
    }

    if (review.courseId !== courseId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Review không thuộc khóa học này!')
    }

    const course = await courseModel.findOneById(courseId)
    if (!course) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Khóa học không tồn tại!')
    }

    if (course.providerId.toString() !== trainerId) {
      const user = await workerProfileModel.findOneByUserId(trainerId)
      if (!user || user.role !== USER_ROLES.ADMIN) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền trả lời review này!')
      }
    }

    const updatedReview = await reviewModel.addResponse(reviewId, {
      content: responseData.content,
      respondedBy: trainerId
    })

    console.log(`Response added to review ${reviewId}`)

    return updatedReview
  } catch (error) { throw error }
}

// ============ MODERATE REVIEW (ADMIN) ============
const moderateReview = async (reviewId, action, reason, adminId) => {
  try {
    const review = await reviewModel.findOneById(reviewId)
    if (!review) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Review không tồn tại!')
    }

    let updatedReview
    switch (action) {
      case 'approve':
        updatedReview = await reviewModel.approveReview(reviewId)
        console.log(`Review ${reviewId} approved by admin ${adminId}`)
        break
      case 'reject':
        updatedReview = await reviewModel.rejectReview(reviewId, reason)
        console.log(`Review ${reviewId} rejected by admin ${adminId}`)
        break
      case 'flag':
        updatedReview = await reviewModel.flagReview(reviewId, reason)
        console.log(`Review ${reviewId} flagged by admin ${adminId}`)
        break
      default:
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Action không hợp lệ!')
    }

    return updatedReview
  } catch (error) { throw error }
}

// ============ VOTE HELPFUL ============
const voteHelpful = async (reviewId, userId) => {
  try {
    const review = await reviewModel.findOneById(reviewId)
    if (!review) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Review không tồn tại!')
    }

    if (review.userId === userId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Bạn không thể vote review của chính mình!')
    }

    const updatedReview = await reviewModel.voteHelpful(reviewId, userId)

    return {
      review: updatedReview,
      voted: updatedReview.helpful?.voters?.includes(userId) || false
    }
  } catch (error) { throw error }
}

// ============ GET COURSE RATING STATS ============
const getCourseRatingStats = async (courseId) => {
  try {
    const course = await courseModel.findOneById(courseId)
    if (!course) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Khóa học không tồn tại!')
    }

    const stats = await reviewModel.getCourseRatingStats(courseId)

    return stats
  } catch (error) { throw error }
}

// ============ GET PENDING REVIEWS (ADMIN) ============
const getPendingReviews = async (queryParams) => {
  try {
    const params = {
      page: parseInt(queryParams.page) || DEFAULT_PAGE,
      limit: parseInt(queryParams.limit) || DEFAULT_ITEM_PER_PAGE
    }

    const { reviews, total } = await reviewModel.findPending(params)

    return {
      reviews,
      pagination: {
        totalRecords: total,
        totalPages: Math.ceil(total / params.limit),
        currentPage: params.page,
        limit: params.limit
      }
    }
  } catch (error) { throw error }
}

// ============ AUTO APPROVE REVIEW ============
const autoApproveReview = async (reviewId) => {
  try {
    const review = await reviewModel.findOneById(reviewId)
    if (!review) {
      throw new Error('Review not found')
    }

    const spamKeywords = ['spam', 'http://', 'https://', 'www.', '.com', '.vn']
    const content = (review.title + ' ' + review.content).toLowerCase()
    const hasSpam = spamKeywords.some(keyword => content.includes(keyword))

    if (hasSpam) {
      await reviewModel.flagReview(reviewId, 'Auto-flagged: Contains spam keywords')
      return { approved: false, reason: 'spam' }
    }

    if (review.rating.overall >= 4) {
      const approvedReview = await reviewModel.approveReview(reviewId)
      return { approved: true, review: approvedReview }
    }

    return { approved: false, reason: 'pending_review' }
  } catch (error) {
    throw new Error(error.message)
  }
}

export const reviewService = {
  // Create
  createReview,
  autoApproveReview,

  // Read
  getReviewsByCourse,
  getMyReviews,
  getMyReviewForCourse,
  getReviewById,
  getCourseRatingStats,
  getPendingReviews,

  // Update
  updateReview,
  addResponse,
  moderateReview,
  voteHelpful,

  // Delete
  deleteReview
}
