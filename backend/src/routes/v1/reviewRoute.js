import express from 'express'
import { reviewValidation } from '~/validations/reviewValidation'
import { reviewController } from '~/controllers/reviewController'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

// ============ PUBLIC ROUTES ============

// Lấy reviews theo khóa học (Public)
Router.get(
  '/course/:courseId',
  reviewValidation.checkCourseId,
  reviewValidation.queryReviews,
  reviewController.getReviewsByCourse
)

// Lấy thống kê rating theo khóa học (Public)
Router.get(
  '/course/:courseId/stats',
  reviewValidation.checkCourseId,
  reviewController.getCourseRatingStats
)

// ============ WORKER ROUTES (Auth Required) ============

// Tạo review mới
Router.post(
  '/',
  authMiddleware.isAuthorized,
  reviewValidation.createReview,
  reviewController.createReview
)

// Lấy reviews của tôi
Router.get(
  '/my',
  authMiddleware.isAuthorized,
  reviewController.getMyReviews
)

// Lấy review của tôi cho một khóa học cụ thể
Router.get(
  '/my/:courseId',
  authMiddleware.isAuthorized,
  reviewValidation.checkCourseId,
  reviewController.getMyReviewForCourse
)

// Lấy chi tiết review
Router.get(
  '/:id',
  authMiddleware.isAuthorized,
  reviewValidation.checkId,
  reviewController.getReviewById
)

// Cập nhật review
Router.put(
  '/:id',
  authMiddleware.isAuthorized,
  reviewValidation.checkId,
  reviewValidation.updateReview,
  reviewController.updateReview
)

// Xóa review
Router.delete(
  '/:id',
  authMiddleware.isAuthorized,
  reviewValidation.checkId,
  reviewController.deleteReview
)

// Vote helpful
Router.post(
  '/:id/helpful',
  authMiddleware.isAuthorized,
  reviewValidation.checkId,
  reviewController.voteHelpful
)

// ============ TRAINER ROUTES (Auth Required) ============

// Trả lời review
Router.post(
  '/:id/response',
  authMiddleware.isAuthorized,
  reviewValidation.checkId,
  reviewValidation.responseReview,
  reviewController.addResponse
)

// ============ ADMIN ROUTES (Auth Required) ============

// Lấy reviews chờ duyệt
Router.get(
  '/admin/pending',
  authMiddleware.isAuthorizedAdmin,
  reviewValidation.queryReviews,
  reviewController.getPendingReviews
)

// Duyệt/từ chối/flag review
Router.put(
  '/:id/moderate',
  authMiddleware.isAuthorizedAdmin,
  reviewValidation.checkId,
  reviewValidation.moderateReview,
  reviewController.moderateReview
)

export const reviewRoute = Router
