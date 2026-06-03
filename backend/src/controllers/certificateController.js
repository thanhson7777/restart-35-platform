import { certificateService } from '~/services/certificateService'
import { StatusCodes } from 'http-status-codes'

// ============ CREATE ============
const createCertificate = async (req, res, next) => {
  try {
    const adminId = req.jwtDecoded._id.toString()
    const certificate = await certificateService.createCertificate(adminId, req.body)

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Cấp chứng chỉ thành công!',
      data: certificate
    })
  } catch (error) {
    next(error)
  }
}

// ============ READ ============
const getCertificates = async (req, res, next) => {
  try {
    const result = await certificateService.getCertificates(req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách chứng chỉ thành công!',
      data: result.certificates,
      pagination: result.pagination
    })
  } catch (error) {
    next(error)
  }
}

const getMyCertificates = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id.toString()
    const result = await certificateService.getMyCertificates(userId, req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy chứng chỉ của tôi thành công!',
      data: result.certificates,
      pagination: result.pagination
    })
  } catch (error) {
    next(error)
  }
}

const getCertificateById = async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.jwtDecoded._id.toString()
    const role = req.jwtDecoded.role

    const certificate = await certificateService.getCertificateById(id)
    const isOwner = certificate.userId.toString() === userId
    const isAdmin = role === 'admin'

    if (!isOwner && !isAdmin) {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: 'Bạn không có quyền xem chứng chỉ này!'
      })
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy chi tiết chứng chỉ thành công!',
      data: certificate
    })
  } catch (error) {
    next(error)
  }
}

const verifyCertificate = async (req, res, next) => {
  try {
    const { code } = req.params
    const result = await certificateService.verifyCertificate(code)

    res.status(StatusCodes.OK).json({
      success: true,
      message: result.valid ? 'Chứng chỉ hợp lệ!' : 'Chứng chỉ không hợp lệ hoặc đã bị thu hồi!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getCertificateByEnrollment = async (req, res, next) => {
  try {
    const { enrollmentId } = req.params
    const userId = req.jwtDecoded._id.toString()
    const role = req.jwtDecoded.role

    const certificates = await certificateService.getCertificateByEnrollment(enrollmentId, userId, role)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy chứng chỉ theo đăng ký thành công!',
      data: certificates
    })
  } catch (error) {
    next(error)
  }
}

// ============ UPDATE ============
const updateCertificate = async (req, res, next) => {
  try {
    const { id } = req.params
    const adminId = req.jwtDecoded._id.toString()

    const certificate = await certificateService.updateCertificate(id, req.body, adminId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cập nhật chứng chỉ thành công!',
      data: certificate
    })
  } catch (error) {
    next(error)
  }
}

const revokeCertificate = async (req, res, next) => {
  try {
    const { id } = req.params
    const adminId = req.jwtDecoded._id.toString()

    const certificate = await certificateService.revokeCertificate(id, adminId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Thu hồi chứng chỉ thành công!',
      data: certificate
    })
  } catch (error) {
    next(error)
  }
}

export const certificateController = {
  createCertificate,
  getCertificates,
  getMyCertificates,
  getCertificateById,
  verifyCertificate,
  getCertificateByEnrollment,
  updateCertificate,
  revokeCertificate
}
