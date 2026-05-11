// backend/src/routes/v1/courseRoute.js

import express from 'express'
import multer from 'multer'
import { courseValidation } from '~/validations/courseValidation'
import { courseController } from '~/controllers/courseController'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

// Configure multer for file upload (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Chỉ chấp nhận file hình ảnh!'), false)
    }
  }
})

// ============ PUBLIC ROUTES (No Auth Required) ============

// Danh sách khóa học với filter
Router.get(
  '/',
  courseValidation.queryCourses,
  courseController.getCourses
)

// Khóa học phổ biến
Router.get(
  '/popular',
  courseController.getPopularCourses
)

// Khóa học mới
Router.get(
  '/new',
  courseController.getNewCourses
)

// Khóa học theo danh mục
Router.get(
  '/category/:categoryId',
  courseValidation.queryCourses,
  courseController.getCoursesByCategory
)

// Chi tiết khóa học
Router.get(
  '/:id',
  courseValidation.checkId,
  courseController.getCourseById
)

// Khóa học liên quan
Router.get(
  '/:id/related',
  courseValidation.checkId,
  courseController.getRelatedCourses
)

// ============ WORKER ROUTES (Auth Required) ============

// Khóa học được gợi ý
Router.get(
  '/me/recommended',
  authMiddleware.isAuthorized,
  courseValidation.queryCourses,
  courseController.getRecommendedCourses
)

// ============ TRAINER ROUTES (Auth + Trainer Required) ============

// Tạo khóa học mới
Router.post(
  '/',
  authMiddleware.isAuthorized,
  upload.single('thumbnail'),
  courseValidation.createCourse,
  courseController.createCourse
)

// Khóa học của tôi
Router.get(
  '/me/my-courses',
  authMiddleware.isAuthorized,
  courseValidation.queryCourses,
  courseController.getMyCourses
)

// Cập nhật khóa học
Router.put(
  '/:id',
  authMiddleware.isAuthorized,
  upload.single('thumbnail'),
  courseValidation.checkId,
  courseValidation.updateCourse,
  courseController.updateCourse
)

// Xóa khóa học
Router.delete(
  '/:id',
  authMiddleware.isAuthorized,
  courseValidation.checkId,
  courseController.deleteCourse
)

// Gửi duyệt khóa học
Router.put(
  '/:id/submit',
  authMiddleware.isAuthorized,
  courseValidation.checkId,
  courseController.submitForApproval
)

// ============ ADMIN ROUTES (Auth + Admin Required) ============

// Danh sách khóa học chờ duyệt
Router.get(
  '/admin/pending',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedAdmin,
  courseValidation.queryCourses,
  courseController.getPendingCourses
)

// Duyệt/từ chối khóa học
Router.put(
  '/:id/approve',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedAdmin,
  courseValidation.checkId,
  courseValidation.updateStatus,
  courseController.approveCourse
)

// Xóa khóa học (admin)
Router.delete(
  '/:id/admin',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedAdmin,
  courseValidation.checkId,
  courseController.deleteCourse
)

export const courseRoute = Router