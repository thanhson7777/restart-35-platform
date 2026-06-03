import { certificateModel } from '~/models/certificateModel'
import { enrollmentModel } from '~/models/enrollmentModel'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import {
  DEFAULT_PAGE,
  DEFAULT_ITEM_PER_PAGE
} from '~/utils/constants'
import { v4 as uuidv4 } from 'uuid'

// ============ GENERATE CERTIFICATE NUMBER ============
const generateCertificateNumber = () => {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `CERT-${yyyy}${mm}${dd}-${random}`
}

// ============ GENERATE VERIFICATION CODE ============
const generateVerificationCode = () => {
  return uuidv4().replace(/-/g, '').toUpperCase()
}

// ============ CREATE CERTIFICATE ============
const createCertificate = async (adminId, data) => {
  try {
    const { enrollmentId, courseId, type, score, skills, expiryDate } = data

    const enrollment = await enrollmentModel.findOneById(enrollmentId)
    if (!enrollment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Đăng ký không tồn tại!')
    }

    const existing = await certificateModel.isCertificateExistsForEnrollment(enrollmentId)
    if (existing) {
      throw new ApiError(StatusCodes.CONFLICT, 'Chứng chỉ đã được cấp cho đăng ký này!')
    }

    const certificateData = {
      enrollmentId,
      userId: enrollment.userId.toString(),
      courseId,
      type,
      score: score || null,
      skills: skills || [],
      expiryDate: expiryDate || null,
      certificateNumber: generateCertificateNumber(),
      verificationCode: generateVerificationCode(),
      issuedBy: adminId,
      status: 'active'
    }

    const result = await certificateModel.createNew(certificateData)
    const certificate = { _id: result.insertedId, ...certificateData }

    return certificate
  } catch (error) {
    throw error
  }
}

// ============ GET CERTIFICATES ============
const getCertificates = async (query) => {
  try {
    const {
      page = DEFAULT_PAGE,
      item_per_page = DEFAULT_ITEM_PER_PAGE,
      userId,
      courseId,
      status
    } = query

    const skip = (page - 1) * item_per_page
    const limit = parseInt(item_per_page)

    const matchCondition = {}
    if (userId) matchCondition.userId = userId
    if (courseId) matchCondition.courseId = courseId
    if (status) matchCondition.status = status

    const result = await certificateModel.findByPaginate(matchCondition, skip, limit)

    return {
      certificates: result.certificates,
      pagination: {
        page: parseInt(page),
        item_per_page: limit,
        total: result.total,
        total_pages: Math.ceil(result.total / limit)
      }
    }
  } catch (error) {
    throw error
  }
}

// ============ GET CERTIFICATE BY ID ============
const getCertificateById = async (id) => {
  try {
    const certificate = await certificateModel.findOneById(id)
    if (!certificate) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Chứng chỉ không tồn tại!')
    }
    return certificate
  } catch (error) {
    throw error
  }
}

// ============ GET MY CERTIFICATES ============
const getMyCertificates = async (userId, query) => {
  try {
    const result = await certificateModel.findByUser(userId, query)
    return {
      certificates: result.certificates,
      pagination: {
        page: parseInt(query.page || DEFAULT_PAGE),
        item_per_page: parseInt(query.item_per_page || DEFAULT_ITEM_PER_PAGE),
        total: result.total,
        total_pages: Math.ceil(result.total / (parseInt(query.item_per_page) || DEFAULT_ITEM_PER_PAGE))
      }
    }
  } catch (error) {
    throw error
  }
}

// ============ GET CERTIFICATE BY ENROLLMENT ============
const getCertificateByEnrollment = async (enrollmentId, requestingUserId, role) => {
  try {
    const byEnrollment = await certificateModel.findByEnrollment(enrollmentId)

    if (!byEnrollment || byEnrollment.length === 0) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy chứng chỉ cho đăng ký này!')
    }

    const cert = byEnrollment[0]
    const isOwner = cert.userId.toString() === requestingUserId.toString()
    const isAdmin = role === 'admin'

    if (!isOwner && !isAdmin) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền xem chứng chỉ này!')
    }

    return byEnrollment
  } catch (error) {
    throw error
  }
}

// ============ VERIFY CERTIFICATE ============
const verifyCertificate = async (code) => {
  try {
    const certificate = await certificateModel.findByVerificationCode(code)

    if (!certificate) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy chứng chỉ với mã xác thực này!')
    }

    const isExpired = certificate.expiryDate && new Date(certificate.expiryDate) < new Date()

    return {
      valid: certificate.status === 'active' && !isExpired,
      certificate: {
        certificateNumber: certificate.certificateNumber,
        type: certificate.type,
        issuedDate: certificate.issuedDate,
        expiryDate: certificate.expiryDate,
        score: certificate.score,
        skills: certificate.skills,
        status: certificate.status,
        isExpired
      }
    }
  } catch (error) {
    throw error
  }
}

// ============ UPDATE CERTIFICATE ============
const updateCertificate = async (id, data, adminId) => {
  try {
    const certificate = await certificateModel.findOneById(id)
    if (!certificate) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Chứng chỉ không tồn tại!')
    }

    const updateData = { ...data }
    delete updateData.certificateNumber
    delete updateData.verificationCode
    delete updateData._destroy

    updateData.updatedBy = adminId

    const updated = await certificateModel.update(id, updateData)
    return updated
  } catch (error) {
    throw error
  }
}

// ============ REVOKE CERTIFICATE ============
const revokeCertificate = async (id, adminId) => {
  try {
    const certificate = await certificateModel.findOneById(id)
    if (!certificate) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Chứng chỉ không tồn tại!')
    }

    if (certificate.status === 'revoked') {
      throw new ApiError(StatusCodes.CONFLICT, 'Chứng chỉ đã bị thu hồi trước đó!')
    }

    const updated = await certificateModel.update(id, {
      status: 'revoked',
      revokedBy: adminId,
      revokedAt: new Date()
    })

    return updated
  } catch (error) {
    throw error
  }
}

export const certificateService = {
  generateCertificateNumber,
  generateVerificationCode,
  createCertificate,
  getCertificates,
  getCertificateById,
  getMyCertificates,
  getCertificateByEnrollment,
  verifyCertificate,
  updateCertificate,
  revokeCertificate
}
