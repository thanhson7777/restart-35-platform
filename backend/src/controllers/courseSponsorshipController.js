import { courseSponsorshipService } from '~/services/courseSponsorshipService'
import { StatusCodes } from 'http-status-codes'

const createCourseSponsorship = async (req, res, next) => {
  try {
    const sponsorId = req.user._id.toString()
    const sponsorship = await courseSponsorshipService.createCourseSponsorship(sponsorId, req.body)

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Tạo chương trình tài trợ thành công!',
      data: sponsorship
    })
  } catch (error) { next(error) }
}

const getCourseSponsorships = async (req, res, next) => {
  try {
    const actorId = req.user?._id?.toString()
    const role = req.user?.role
    const result = await courseSponsorshipService.getCourseSponsorships(actorId, role, req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách chương trình tài trợ thành công!',
      data: result.sponsorships,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

const getCourseSponsorshipById = async (req, res, next) => {
  try {
    const sponsorship = await courseSponsorshipService.getCourseSponsorshipById(
      req.params.id,
      req.user._id.toString(),
      req.user.role
    )

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy chi tiết chương trình tài trợ thành công!',
      data: sponsorship
    })
  } catch (error) { next(error) }
}

const updateCourseSponsorship = async (req, res, next) => {
  try {
    const sponsorship = await courseSponsorshipService.updateCourseSponsorship(
      req.params.id,
      req.user._id.toString(),
      req.user.role,
      req.body
    )

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cập nhật chương trình tài trợ thành công!',
      data: sponsorship
    })
  } catch (error) { next(error) }
}

const approveCourseSponsorship = async (req, res, next) => {
  try {
    const sponsorship = await courseSponsorshipService.approveCourseSponsorship(req.params.id)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Duyệt chương trình tài trợ thành công!',
      data: sponsorship
    })
  } catch (error) { next(error) }
}

const pauseCourseSponsorship = async (req, res, next) => {
  try {
    const sponsorship = await courseSponsorshipService.pauseCourseSponsorship(
      req.params.id,
      req.user._id.toString(),
      req.user.role
    )

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Tạm dừng chương trình tài trợ thành công!',
      data: sponsorship
    })
  } catch (error) { next(error) }
}

const resumeCourseSponsorship = async (req, res, next) => {
  try {
    const sponsorship = await courseSponsorshipService.resumeCourseSponsorship(
      req.params.id,
      req.user._id.toString(),
      req.user.role
    )

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Tiếp tục chương trình tài trợ thành công!',
      data: sponsorship
    })
  } catch (error) { next(error) }
}

const linkCourse = async (req, res, next) => {
  try {
    const sponsorship = await courseSponsorshipService.linkCourse(
      req.params.id,
      req.user._id.toString(),
      req.user.role,
      req.body
    )

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Liên kết khóa học thành công!',
      data: sponsorship
    })
  } catch (error) { next(error) }
}

const unlinkCourse = async (req, res, next) => {
  try {
    const sponsorship = await courseSponsorshipService.unlinkCourse(
      req.params.id,
      req.user._id.toString(),
      req.user.role,
      req.body.courseId
    )

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Gỡ liên kết khóa học thành công!',
      data: sponsorship
    })
  } catch (error) { next(error) }
}

const getCourseSponsorshipLearners = async (req, res, next) => {
  try {
    const result = await courseSponsorshipService.getCourseSponsorshipLearners(
      req.params.id,
      req.user._id.toString(),
      req.user.role,
      req.query
    )

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách learner tài trợ thành công!',
      data: result.learners,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

const decideSponsorshipLearner = async (req, res, next) => {
  try {
    const { id: sponsorshipId, enrollmentId } = req.params
    const sponsorId = req.user._id.toString()
    const { status } = req.body

    const result = await courseSponsorshipService.decideSponsorshipLearner(
      sponsorshipId,
      enrollmentId,
      sponsorId,
      status
    )

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Đã cập nhật trạng thái xét duyệt thành công!',
      data: result
    })
  } catch (error) { next(error) }
}

const getCourseSponsorshipStats = async (req, res, next) => {
  try {
    const stats = await courseSponsorshipService.getCourseSponsorshipStats(
      req.params.id,
      req.user._id.toString(),
      req.user.role
    )

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thống kê tài trợ thành công!',
      data: stats
    })
  } catch (error) { next(error) }
}

export const courseSponsorshipController = {
  createCourseSponsorship,
  getCourseSponsorships,
  getCourseSponsorshipById,
  updateCourseSponsorship,
  approveCourseSponsorship,
  pauseCourseSponsorship,
  resumeCourseSponsorship,
  linkCourse,
  unlinkCourse,
  getCourseSponsorshipLearners,
  decideSponsorshipLearner,
  getCourseSponsorshipStats
}
