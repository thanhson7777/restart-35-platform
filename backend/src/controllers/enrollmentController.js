import { enrollmentService } from '~/services/enrollmentService'
import { StatusCodes } from 'http-status-codes'
import { USER_ROLES } from '~/utils/constants'

// ============ ENROLL COURSE ============
const enrollCourse = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const { courseId, scheduleId, motivation, source, scholarshipId } = req.body

    const result = await enrollmentService.enrollCourse(userId, courseId, {
      scheduleId,
      motivation,
      source,
      scholarshipId
    })

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: result.result.status === 'waitlist'
        ? 'Bạn đã được thêm vào danh sách chờ!'
        : 'Đăng ký khóa học thành công!',
      data: result.enrollment,
      result: result.result
    })
  } catch (error) { next(error) }
}

// ============ GET MY ENROLLMENTS ============
const getMyEnrollments = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const result = await enrollmentService.getMyEnrollments(userId, req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách đăng ký thành công!',
      data: result.enrollments,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

// ============ GET ENROLLMENT BY ID ============
const getEnrollmentById = async (req, res, next) => {
  try {
    const enrollmentId = req.params.id
    const userId = req.user._id.toString()
    const userRole = req.user.role

    const enrollment = await enrollmentService.getEnrollmentById(enrollmentId, userId, userRole)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thông tin đăng ký thành công!',
      data: enrollment
    })
  } catch (error) { next(error) }
}

// ============ UPDATE PROGRESS ============
const updateProgress = async (req, res, next) => {
  try {
    const enrollmentId = req.params.id
    const trainerId = req.user._id.toString()
    const { progress, assessments, attendance, notes } = req.body

    const enrollment = await enrollmentService.updateProgress(enrollmentId, {
      percentage: progress.percentage,
      currentLesson: progress.currentLesson,
      totalLessons: progress.totalLessons,
      assessments,
      notes
    }, trainerId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cập nhật tiến độ thành công!',
      data: enrollment
    })
  } catch (error) { next(error) }
}

// ============ UPDATE STATUS ============
const updateStatus = async (req, res, next) => {
  try {
    const enrollmentId = req.params.id
    const trainerId = req.user._id.toString()
    const { status, dropReason, notes, startDate, endDate } = req.body

    const enrollment = await enrollmentService.updateStatus(
      enrollmentId,
      status,
      { dropReason, notes, startDate, endDate },
      trainerId
    )

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cập nhật trạng thái thành công!',
      data: enrollment
    })
  } catch (error) { next(error) }
}

// ============ COMPLETE ITEM ============
const completeItem = async (req, res, next) => {
  try {
    const enrollmentId = req.params.id
    const userId = req.user._id.toString()
    const { itemId } = req.body

    if (!itemId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Thiếu itemId cần hoàn thành!')
    }

    const enrollment = await enrollmentService.completeItem(enrollmentId, itemId, userId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Đánh dấu hoàn thành thành công!',
      data: enrollment
    })
  } catch (error) { next(error) }
}

// ============ CANCEL ENROLLMENT ============
const cancelEnrollment = async (req, res, next) => {
  try {
    const enrollmentId = req.params.id
    const userId = req.user._id.toString()
    const { reason } = req.body

    const enrollment = await enrollmentService.cancelEnrollment(enrollmentId, userId, reason)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Hủy đăng ký thành công!',
      data: enrollment
    })
  } catch (error) { next(error) }
}

// ============ GET COURSE ENROLLMENTS (Trainer/Admin) ============
const getCourseEnrollments = async (req, res, next) => {
  try {
    const courseId = req.params.courseId
    const userId = req.user._id.toString()

    const result = await enrollmentService.getEnrollmentsByCourse(courseId, req.query, userId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách học viên thành công!',
      data: result.enrollments,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

// ============ GET TRAINER ENROLLMENTS (Trainer/Admin) ============
const getTrainerEnrollments = async (req, res, next) => {
  try {
    const trainerId = req.user._id.toString()
    const result = await enrollmentService.getTrainerEnrollments(req.query, trainerId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách học viên của giảng viên thành công!',
      data: result.enrollments,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

// ============ GET ALL ENROLLMENTS (Admin) ============
const getAllEnrollments = async (req, res, next) => {
  try {
    const result = await enrollmentService.getAllEnrollments(req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách đăng ký thành công!',
      data: result.enrollments,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

// ============ GET ENROLLMENT STATS ============
const getEnrollmentStats = async (req, res, next) => {
  try {
    const courseId = req.query.courseId || null
    const userId = req.user._id.toString()
    const userRole = req.user.role

    const stats = await enrollmentService.getEnrollmentStats(courseId, userId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thống kê thành công!',
      data: stats
    })
  } catch (error) { next(error) }
}

// ============ GET ADMIN STATS ============
const getAdminStats = async (req, res, next) => {
  try {
    const stats = await enrollmentService.getAdminStats()

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thống kê thành công!',
      data: stats
    })
  } catch (error) { next(error) }
}

// ============ EXPORT ENROLLMENTS ============
const exportEnrollments = async (req, res, next) => {
  try {
    const { format = 'csv', status, courseId, startDate, endDate } = req.query

    const filters = {}
    if (status) filters.status = status
    if (courseId) filters.courseId = courseId
    if (startDate) filters.enrolledAt = { $gte: new Date(startDate) }
    if (endDate) filters.enrolledAt = { ...filters.enrolledAt, $lte: new Date(endDate) }

    const enrollments = await enrollmentService.getEnrollmentsForExport(filters)

    // Convert to CSV
    const headers = [
      'ID', 'Họ tên', 'Email', 'Khóa học', 'Trạng thái',
      'Tiến độ (%)', 'Học phí', 'Đã thanh toán', 'Còn nợ',
      'Ngày đăng ký', 'Ngày bắt đầu', 'Ngày hoàn thành', 'Nguồn'
    ]

    const rows = enrollments.map(e => [
      e.enrollmentId,
      e.userName,
      e.userEmail,
      e.courseTitle,
      e.status,
      e.progress,
      e.totalFee,
      e.paidFee,
      e.pendingFee,
      e.enrolledAt ? new Date(e.enrolledAt).toLocaleDateString('vi-VN') : '',
      e.startDate ? new Date(e.startDate).toLocaleDateString('vi-VN') : '',
      e.completedAt ? new Date(e.completedAt).toLocaleDateString('vi-VN') : '',
      e.source
    ])

    if (format === 'csv') {
      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n')

      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename=enrollments_${Date.now()}.csv`)
      return res.send(csvContent)
    }

    if (format === 'xlsx') {
      const XLSX = await import('xlsx')
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Enrollments')
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', `attachment; filename=enrollments_${Date.now()}.xlsx`)
      return res.send(buffer)
    }

    // Default to JSON
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Xuất dữ liệu thành công!',
      data: enrollments,
      count: enrollments.length
    })
  } catch (error) { next(error) }
}

// ============ DROP ENROLLMENT (Worker tự bỏ) ============
const dropEnrollment = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id.toString()
    const { id } = req.params
    const { dropReason } = req.body

    const enrollment = await enrollmentService.dropEnrollment(id, userId, dropReason)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Đã hủy đăng ký khóa học thành công!',
      data: enrollment
    })
  } catch (error) { next(error) }
}

// ============ SUSPEND ENROLLMENT (Trainer/Admin) ============
const suspendEnrollment = async (req, res, next) => {
  try {
    const trainerId = req.jwtDecoded._id.toString()
    const { id } = req.params
    const { reason } = req.body

    const enrollment = await enrollmentService.suspendEnrollment(id, trainerId, reason)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Đã tạm ngưng đăng ký khóa học!',
      data: enrollment
    })
  } catch (error) { next(error) }
}

// ============ COMPLETE ENROLLMENT (Trainer/Admin) ============
const completeEnrollment = async (req, res, next) => {
  try {
    const trainerId = req.jwtDecoded._id.toString()
    const { id } = req.params
    const { score, notes } = req.body

    const enrollment = await enrollmentService.completeEnrollment(id, trainerId, { score, notes })

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Đã hoàn thành đăng ký khóa học!',
      data: enrollment
    })
  } catch (error) { next(error) }
}

// ============ FAIL ENROLLMENT (Trainer/Admin) ============
const failEnrollment = async (req, res, next) => {
  try {
    const trainerId = req.jwtDecoded._id.toString()
    const { id } = req.params
    const { reason } = req.body

    const enrollment = await enrollmentService.failEnrollment(id, trainerId, reason)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Đã đánh dấu học viên không đạt khóa học!',
      data: enrollment
    })
  } catch (error) { next(error) }
}

// ============ GET RISK LIST (Admin) ============
const getRiskList = async (req, res, next) => {
  try {
    const result = await enrollmentService.getRiskList(req.query)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách nguy cơ bỏ học thành công!',
      data: result.enrollments,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

// ============ GET RISK DETAIL ============
const getEnrollmentRiskDetail = async (req, res, next) => {
  try {
    const enrollmentId = req.params.id
    const userId = req.user._id.toString()
    const userRole = req.user.role

    const risk = await enrollmentService.getEnrollmentRiskDetail(enrollmentId, userId, userRole)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thông tin nguy cơ bỏ học thành công!',
      data: risk
    })
  } catch (error) { next(error) }
}

// ============ TRIGGER MANUAL INTERVENTION ============
const triggerManualIntervention = async (req, res, next) => {
  try {
    const enrollmentId = req.params.id
    const trainerId = req.user._id.toString()
    const { type } = req.body

    const result = await enrollmentService.triggerManualIntervention(enrollmentId, type, trainerId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Kích hoạt biện pháp can thiệp thành công!',
      data: result
    })
  } catch (error) { next(error) }
}

export const enrollmentController = {
  // Worker
  enrollCourse,
  getMyEnrollments,
  getEnrollmentById,
  completeItem,
  cancelEnrollment,
  dropEnrollment,
  getEnrollmentRiskDetail,

  // Trainer
  updateProgress,
  updateStatus,
  getCourseEnrollments,
  getTrainerEnrollments,
  getEnrollmentStats,
  suspendEnrollment,
  completeEnrollment,
  failEnrollment,
  triggerManualIntervention,

  // Admin
  getAllEnrollments,
  getAdminStats,
  exportEnrollments,
  getRiskList
}
