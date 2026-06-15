// backend/src/routes/v1/courseRoute.js

import express from 'express'
import multer from 'multer'
import { courseValidation } from '~/validations/courseValidation'
import { courseController } from '~/controllers/courseController'
import { courseModel } from '~/models/courseModel'
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

const uploadResource = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (req, file, cb) => {
    // Allow images, PDFs, word, excel, ppt, zip, rar
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/zip',
      'application/x-zip-compressed',
      'application/x-rar-compressed'
    ]
    if (file.mimetype.startsWith('image/') || allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Chỉ chấp nhận file hình ảnh, PDF, Word, Excel, PPT hoặc tệp nén (ZIP/RAR)!'), false)
    }
  }
})

/**
 * @route   GET /v1/courses/map-data
 * @desc    Lấy dữ liệu khóa học có địa điểm cho bản đồ
 * @access  Public
 */
Router.get('/map-data', async (req, res, next) => {
  try {
    const courses = await courseModel
      .find({ status: 'published' })
      .select('title thumbnail category fee isFree offlineVenue')
      .limit(500)
      .lean();

    const data = courses
      .filter(c => c.offlineVenue && (c.offlineVenue.address || c.offlineVenue.city))
      .map(c => ({
        _id: c._id.toString(),
        title: c.title,
        category: c.category?.name,
        thumbnail: c.thumbnail,
        venue: c.offlineVenue?.address || c.offlineVenue?.city,
        lat: c.offlineVenue?.lat || null,
        lng: c.offlineVenue?.lng || null,
        price: c.isFree ? 0 : (c.fee || 0),
      }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

const parseMultipartBody = (req, res, next) => {
  const jsonFields = ['duration', 'location', 'skills', 'prerequisites', 'requirements', 'syllabus', 'outcomes', 'scheduleConfig', 'fundingConfig']
  const booleanFields = ['isFree', 'scholarshipEligibility']
  const numberFields = ['fee', 'maxStudents']
  
  jsonFields.forEach(field => {
    if (typeof req.body[field] === 'string' && req.body[field].trim() !== '') {
      try {
        req.body[field] = JSON.parse(req.body[field])
      } catch (e) { /* Let validation handle it */ }
    }
  })

  booleanFields.forEach(field => {
    if (req.body[field] === 'true') req.body[field] = true
    if (req.body[field] === 'false') req.body[field] = false
  })

  numberFields.forEach(field => {
    if (typeof req.body[field] === 'string' && req.body[field].trim() !== '') {
      const parsed = Number(req.body[field])
      if (!isNaN(parsed)) req.body[field] = parsed
    }
  })

  // Safe fix for thumbnail: if it's not a valid string URL, remove it. New files are in req.file.
  if (req.body.thumbnail !== undefined) {
    if (typeof req.body.thumbnail !== 'string' || (!req.body.thumbnail.startsWith('http') && req.body.thumbnail !== '')) {
      delete req.body.thumbnail;
    }
  }

  next()
}

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

// Khóa học miễn phí
Router.get(
  '/free',
  courseValidation.queryCourses,
  courseController.getFreeCourses
)

// Khóa học có phí
Router.get(
  '/paid',
  courseValidation.queryCourses,
  courseController.getPaidCourses
)

// Khóa học liên quan
Router.get(
  '/:id/related',
  courseValidation.checkId,
  courseController.getRelatedCourses
)

// Bài học xem trước
Router.get(
  '/:id/preview-lessons',
  courseValidation.checkId,
  courseController.getPreviewLessons
)

// Bài học của khóa
Router.get(
  '/:id/lessons',
  courseValidation.checkId,
  courseController.getCourseLessons
)

// Chi tiết khóa học
Router.get(
  '/:id',
  courseValidation.checkId,
  courseController.getCourseById
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
  parseMultipartBody,
  courseValidation.createCourse,
  courseController.createCourse
)

// Thống kê khóa học của tôi
Router.get(
  '/me/my-courses/stats',
  authMiddleware.isAuthorized,
  courseController.getMyCourseStats
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
  parseMultipartBody,
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

// Upload tài liệu giáo trình
Router.post(
  '/upload-resource',
  authMiddleware.isAuthorized,
  uploadResource.single('file'),
  courseController.uploadCourseResource
)

// ============ ADMIN ROUTES (Auth + Admin Required) ============

// Thống kê khóa học
Router.get(
  '/admin/stats',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedAdmin,
  courseController.getAdminCourseStats
)

// Danh sách khóa học chờ duyệt
Router.get(
  '/admin/pending',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedAdmin,
  courseValidation.queryCourses,
  courseController.getPendingCourses
)

// Danh sách tất cả khóa học (admin)
Router.get(
  '/admin/all',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedAdmin,
  courseValidation.queryCourses,
  courseController.getAdminCourses
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
export { parseMultipartBody }