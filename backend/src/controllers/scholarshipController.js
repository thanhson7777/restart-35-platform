import { scholarshipService } from '~/services/scholarshipService'
import { StatusCodes } from 'http-status-codes'
import { USER_ROLES } from '~/utils/constants'

// ============ PUBLIC ROUTES ============

// Lấy danh sách scholarships khả dụng
const getScholarships = async (req, res, next) => {
  try {
    const result = await scholarshipService.getAvailableScholarships(req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách học bổng thành công!',
      data: result.scholarships,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

// Lấy chi tiết scholarship
const getScholarshipById = async (req, res, next) => {
  try {
    const { id } = req.params
    const scholarship = await scholarshipService.getScholarshipById(id)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thông tin học bổng thành công!',
      data: scholarship
    })
  } catch (error) { next(error) }
}

// ============ WORKER ROUTES ============

// Lấy scholarships đủ điều kiện cho worker
const getEligibleScholarships = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const result = await scholarshipService.getEligibleScholarships(userId, req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách học bổng phù hợp thành công!',
      data: result.scholarships,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

// Kiểm tra eligibility cụ thể
const checkEligibility = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const { scholarshipId } = req.params

    const result = await scholarshipService.checkEligibility(userId, scholarshipId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Kiểm tra điều kiện thành công!',
      data: result
    })
  } catch (error) { next(error) }
}

// ============ NGO ROUTES ============

// Tạo scholarship mới
const createScholarship = async (req, res, next) => {
  try {
    const ngoId = req.user._id.toString()
    const scholarship = await scholarshipService.createScholarship(ngoId, req.body)

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Tạo học bổng thành công!',
      data: scholarship
    })
  } catch (error) { next(error) }
}

// Lấy scholarships của NGO
const getMyScholarships = async (req, res, next) => {
  try {
    const ngoId = req.user._id.toString()
    const result = await scholarshipService.getScholarshipsByNgo(ngoId, req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách học bổng thành công!',
      data: result.scholarships,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

// Cập nhật scholarship
const updateScholarship = async (req, res, next) => {
  try {
    const ngoId = req.user._id.toString()
    const { id } = req.params

    const scholarship = await scholarshipService.updateScholarship(id, ngoId, req.body)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cập nhật học bổng thành công!',
      data: scholarship
    })
  } catch (error) { next(error) }
}

// Publish scholarship
const publishScholarship = async (req, res, next) => {
  try {
    const ngoId = req.user._id.toString()
    const { id } = req.params

    const scholarship = await scholarshipService.publishScholarship(id, ngoId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Xuất bản học bổng thành công!',
      data: scholarship
    })
  } catch (error) { next(error) }
}

// Pause scholarship
const pauseScholarship = async (req, res, next) => {
  try {
    const ngoId = req.user._id.toString()
    const { id } = req.params

    const scholarship = await scholarshipService.pauseScholarship(id, ngoId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Tạm dừng học bổng thành công!',
      data: scholarship
    })
  } catch (error) { next(error) }
}

// Resume scholarship
const resumeScholarship = async (req, res, next) => {
  try {
    const ngoId = req.user._id.toString()
    const { id } = req.params

    const scholarship = await scholarshipService.resumeScholarship(id, ngoId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Tiếp tục học bổng thành công!',
      data: scholarship
    })
  } catch (error) { next(error) }
}

// Xóa scholarship
const deleteScholarship = async (req, res, next) => {
  try {
    const ngoId = req.user._id.toString()
    const { id } = req.params

    await scholarshipService.deleteScholarship(id, ngoId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Xóa học bổng thành công!'
    })
  } catch (error) { next(error) }
}

// Lấy thống kê scholarship
const getScholarshipStats = async (req, res, next) => {
  try {
    const ngoId = req.user._id.toString()
    const { id } = req.params

    const stats = await scholarshipService.getScholarshipStats(id, ngoId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thống kê thành công!',
      data: stats
    })
  } catch (error) { next(error) }
}

// Thêm khóa học vào scholarship
const addLinkedCourse = async (req, res, next) => {
  try {
    const ngoId = req.user._id.toString()
    const { id } = req.params
    const { courseId, coverage, maxAmount } = req.body

    const scholarship = await scholarshipService.addLinkedCourse(id, ngoId, courseId, coverage, maxAmount)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Thêm khóa học thành công!',
      data: scholarship
    })
  } catch (error) { next(error) }
}

// Xóa khóa học khỏi scholarship
const removeLinkedCourse = async (req, res, next) => {
  try {
    const ngoId = req.user._id.toString()
    const { id, courseId } = req.params

    const scholarship = await scholarshipService.removeLinkedCourse(id, ngoId, courseId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Xóa khóa học thành công!',
      data: scholarship
    })
  } catch (error) { next(error) }
}

// ============ ADMIN ROUTES ============

// Lấy tất cả scholarships cho admin
const getAllScholarshipsAdmin = async (req, res, next) => {
  try {
    const result = await scholarshipService.getAllScholarshipsAdmin(req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách học bổng thành công!',
      data: result.scholarships,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

// Lấy thống kê cho admin
const getAdminStats = async (req, res, next) => {
  try {
    const stats = await scholarshipService.getAdminStats()

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thống kê thành công!',
      data: stats
    })
  } catch (error) { next(error) }
}

// Lấy tất cả applications cho admin
const getAllApplicationsAdmin = async (req, res, next) => {
  try {
    const result = await scholarshipService.getAllApplicationsAdmin(req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách đơn đăng ký thành công!',
      data: result.applications,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

export const scholarshipController = {
  // Public
  getScholarships,
  getScholarshipById,

  // Worker
  getEligibleScholarships,
  checkEligibility,

  // NGO
  createScholarship,
  getMyScholarships,
  updateScholarship,
  publishScholarship,
  pauseScholarship,
  resumeScholarship,
  deleteScholarship,
  getScholarshipStats,
  addLinkedCourse,
  removeLinkedCourse,

  // Admin
  getAllScholarshipsAdmin,
  getAdminStats,
  getAllApplicationsAdmin
}
