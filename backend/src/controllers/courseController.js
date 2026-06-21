import { courseService } from '~/services/courseService'
import { StatusCodes } from 'http-status-codes'
import { USER_ROLES } from '~/utils/constants'
import { courseModel } from '~/models/courseModel'

// ============ CREATE ============
const createCourse = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const course = await courseService.createCourse(userId, req.body, req.file)

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Tạo khóa học thành công!',
      data: course
    })
  } catch (error) { next(error) }
}

const uploadCourseResource = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Vui lòng chọn file tải lên.'
      })
    }

    const { CloudinaryProvider } = await import('~/providers/CloudinaryProvider')
    const uploadResult = await CloudinaryProvider.streamUpload(req.file.buffer, 'course-resources', 'auto')

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Tải file thành công!',
      data: {
        url: uploadResult.secure_url,
        name: req.file.originalname
      }
    })
  } catch (error) {
    next(error)
  }
}

// ============ READ ============
const getCourses = async (req, res, next) => {
  try {
    const result = await courseService.getCourses(req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách khóa học thành công!',
      data: result.courses,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

const getCourseById = async (req, res, next) => {
  try {
    const courseId = req.params.id
    const userId = req.user?._id?.toString() || null
    const course = await courseService.getCourseWithDetails(courseId, userId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thông tin khóa học thành công!',
      data: course
    })
  } catch (error) { next(error) }
}

const getMyCourses = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const result = await courseService.getMyCourses(userId, req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách khóa học của bạn thành công!',
      data: result.courses,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

const getMyCourseStats = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const stats = await courseService.getMyCourseStats(userId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thống kê khóa học thành công!',
      data: stats
    })
  } catch (error) { next(error) }
}

const getRecommendedCourses = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const result = await courseService.getRecommendedCourses(userId, req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy gợi ý khóa học thành công!',
      data: result.courses,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

const getPopularCourses = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10
    const courses = await courseService.getPopularCourses(limit)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy khóa học phổ biến thành công!',
      data: courses
    })
  } catch (error) { next(error) }
}

const getNewCourses = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10
    const courses = await courseService.getNewCourses(limit)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy khóa học mới thành công!',
      data: courses
    })
  } catch (error) { next(error) }
}

const getRelatedCourses = async (req, res, next) => {
  try {
    const courseId = req.params.id
    const limit = parseInt(req.query.limit, 10) || 5
    const courses = await courseService.getRelatedCourses(courseId, limit)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy khóa học liên quan thành công!',
      data: courses
    })
  } catch (error) { next(error) }
}

const getCoursesByCategory = async (req, res, next) => {
  try {
    const categoryId = req.params.categoryId
    const result = await courseService.getCoursesByCategory(categoryId, req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách khóa học theo danh mục thành công!',
      data: result.courses,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

const getFreeCourses = async (req, res, next) => {
  try {
    req.query.isFree = 'true'
    const result = await courseService.getCourses(req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách khóa học miễn phí thành công!',
      data: result.courses,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

const getPaidCourses = async (req, res, next) => {
  try {
    req.query.isFree = 'false'
    const result = await courseService.getCourses(req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách khóa học có phí thành công!',
      data: result.courses,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

// ============ UPDATE ============
const updateCourse = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const courseId = req.params.id
    const course = await courseService.updateCourse(courseId, userId, req.body, req.file)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cập nhật khóa học thành công!',
      data: course
    })
  } catch (error) { next(error) }
}

const submitForApproval = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const courseId = req.params.id
    const course = await courseService.submitForApproval(courseId, userId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Đã gửi khóa học để duyệt!',
      data: course
    })
  } catch (error) { next(error) }
}

const cancelSubmitCourse = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const courseId = req.params.id
    const course = await courseService.cancelSubmitCourse(courseId, userId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Đã hủy yêu cầu duyệt! Khóa học đã được hoàn về trạng thái nháp.',
      data: course
    })
  } catch (error) { next(error) }
}

const approveCourse = async (req, res, next) => {
  try {
    const courseId = req.params.id
    const adminId = req.user._id.toString()
    const { status, rejectionReason } = req.body
    const course = await courseService.approveCourse(courseId, adminId, status, rejectionReason)

    res.status(StatusCodes.OK).json({
      success: true,
      message: course.status === 'rejected'
        ? 'Đã từ chối khóa học!'
        : 'Phê duyệt khóa học thành công!',
      data: course
    })
  } catch (error) { next(error) }
}

// ============ ADMIN ============
const getPendingCourses = async (req, res, next) => {
  try {
    const result = await courseService.getPendingCourses(req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách khóa học chờ duyệt thành công!',
      data: result.courses,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

const getAdminCourseStats = async (req, res, next) => {
  try {
    const stats = await courseService.getAdminCourseStats()

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thống kê khóa học thành công!',
      data: stats
    })
  } catch (error) { next(error) }
}

const getAdminCourses = async (req, res, next) => {
  try {
    const result = await courseService.getAdminCourses(req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách khóa học thành công!',
      data: result.courses,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

// ============ DELETE ============
const deleteCourse = async (req, res, next) => {
  try {
    const courseId = req.params.id
    const userId = req.user._id.toString()
    const isAdmin = req.user.role === USER_ROLES.ADMIN

    const result = await courseService.deleteCourse(courseId, userId, isAdmin)

    res.status(StatusCodes.OK).json({
      success: true,
      ...result
    })
  } catch (error) { next(error) }
}

// ============ LESSONS ============
const getCourseLessons = async (req, res, next) => {
  try {
    let lessons = []
    const course = await courseModel.findOneById(req.params.id)
    if (course && course.syllabus && course.syllabus.length > 0) {
      lessons = course.syllabus.map((item, index) => ({
        _id: item._id,
        id: item._id,
        courseId: req.params.id,
        weekNumber: item.week,
        moduleTitle: `Tuần ${item.week}`,
        title: item.title,
        description: item.content || '',
        videoUrl: item.videoUrl || '',
        videoId: item.videoUrl ? item._id : '',
        duration: item.videoDuration ? (item.videoDuration * 60) : 0, // convert minutes to seconds
        thumbnail: course.thumbnail || '',
        order: index,
        slides: [],
        resources: item.fileUrl ? [{ title: item.fileName || 'Tài liệu', url: item.fileUrl }] : [],
        status: 'published'
      }))
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách bài học thành công!',
      data: lessons
    })
  } catch (error) { next(error) }
}

// ============ PREVIEW LESSONS ============
const getPreviewLessons = async (req, res, next) => {
  try {
    let lessons = []
    const course = await courseModel.findOneById(req.params.id)
    if (course && course.syllabus && course.syllabus.length > 0) {
      const videoSyllabus = course.syllabus.filter(item => item.videoUrl)
      const previewItems = videoSyllabus.slice(0, 3)
      lessons = previewItems.map((item, index) => ({
        _id: item._id,
        id: item._id,
        courseId: req.params.id,
        weekNumber: item.week,
        moduleTitle: `Tuần ${item.week}`,
        title: item.title,
        description: item.content || '',
        videoUrl: item.videoUrl || '',
        videoId: item.videoUrl ? item._id : '',
        duration: item.videoDuration ? (item.videoDuration * 60) : 0,
        thumbnail: course.thumbnail || '',
        order: index,
        slides: [],
        resources: item.fileUrl ? [{ title: item.fileName || 'Tài liệu', url: item.fileUrl }] : [],
        status: 'published',
        isPreview: true
      }))
    }

    const previewLessons = lessons.filter(l => l.isPreview === true).slice(0, 3)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách bài học xem trước thành công!',
      data: previewLessons
    })
  } catch (error) { next(error) }
}

export const courseController = {
  // Create
  createCourse,

  // Read
  getCourses,
  getCourseById,
  getMyCourses,
  getMyCourseStats,
  getRecommendedCourses,
  getPopularCourses,
  getNewCourses,
  getRelatedCourses,
  getCoursesByCategory,
  getFreeCourses,
  getPaidCourses,
  getCourseLessons,
  getPreviewLessons,

  // Update
  updateCourse,
  submitForApproval,
  cancelSubmitCourse,
  approveCourse,
  uploadCourseResource,

  // Admin
  getPendingCourses,
  getAdminCourseStats,
  getAdminCourses,

  // Delete
  deleteCourse
}