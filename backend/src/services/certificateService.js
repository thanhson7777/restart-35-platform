import { certificateModel } from '~/models/certificateModel'
import { enrollmentModel } from '~/models/enrollmentModel'
import { userModel } from '~/models/userModel'
import { courseModel } from '~/models/courseModel'
import { scheduleModel } from '~/models/scheduleModel'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { BrevoProvider } from '~/providers/BrevoProvider'
import {
  DEFAULT_PAGE,
  DEFAULT_ITEM_PER_PAGE,
  CERTIFICATE_TYPES,
  WEBSITE_DOMAIN
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

    const course = await courseModel.findOneById(courseId)
    const user = await userModel.findOneById(enrollment.userId)
    const userName = user?.displayName || user?.username || 'Học viên'
    const courseTitle = course?.title || 'Khóa học'

    const certificateNumber = generateCertificateNumber()
    const verificationCode = generateVerificationCode()

    // Generate PDF and upload to Cloudinary
    let credentialUrl = ''
    try {
      const { pdfService } = await import('./pdfService')
      const { CloudinaryProvider } = await import('~/providers/CloudinaryProvider')

      const pdfBuffer = await pdfService.generateCertificatePDF({
        userName,
        courseTitle,
        certificateNumber,
        verificationCode,
        issuedDate: new Date()
      })

      const uploadResult = await CloudinaryProvider.streamUpload(pdfBuffer, 'certificates')
      credentialUrl = uploadResult?.secure_url || ''
    } catch (pdfError) {
      console.warn('Failed to generate/upload certificate PDF, using fallback mock URL:', pdfError.message)
      credentialUrl = `https://res.cloudinary.com/mock-cloud/image/upload/v1700000000/mock_cert_${verificationCode}.pdf`
    }

    const certificateData = {
      enrollmentId,
      userId: enrollment.userId.toString(),
      courseId,
      type,
      score: score || null,
      skills: skills || [],
      expiryDate: expiryDate || null,
      certificateNumber,
      verificationCode,
      credentialUrl,
      issuedBy: adminId,
      status: 'active'
    }

    const result = await certificateModel.createNew(certificateData)
    const certificate = { _id: result.insertedId, ...certificateData, issuedDate: new Date() }

    // Send email notification to user
    try {
      const user = await userModel.findOneById(enrollment.userId)
      if (user?.email) {
        await sendCertificateIssuedEmail(certificate, enrollment, user.email, user.displayName || user.username)
      }
    } catch (emailError) {
      console.error('Failed to send certificate email:', emailError.message)
    }

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

    const enrichedCertificates = await Promise.all(result.certificates.map(async (cert) => {
      const user = await userModel.findOneById(cert.userId)
      const course = await courseModel.findOneById(cert.courseId)
      return {
        ...cert,
        worker: user ? {
          fullName: user.displayName || user.username || 'Học viên',
          email: user.email || ''
        } : null,
        courseName: course?.title || 'Khóa học',
        userName: user?.displayName || user?.username || 'Học viên', // Keep for backward compatibility if needed
        courseTitle: course?.title || 'Khóa học' // Keep for backward compatibility if needed
      }
    }))

    return {
      certificates: enrichedCertificates,
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
    const user = await userModel.findOneById(certificate.userId)
    const course = await courseModel.findOneById(certificate.courseId)
    certificate.userName = user?.displayName || user?.username || 'Học viên'
    certificate.courseTitle = course?.title || 'Khóa học'
    return certificate
  } catch (error) {
    throw error
  }
}

// ============ GET MY CERTIFICATES ============
const getMyCertificates = async (userId, query) => {
  try {
    const result = await certificateModel.findByUser(userId, query)
    
    const enrichedCertificates = await Promise.all(result.certificates.map(async (cert) => {
      const user = await userModel.findOneById(cert.userId)
      const course = await courseModel.findOneById(cert.courseId)
      return {
        ...cert,
        userName: user?.displayName || user?.username || 'Học viên',
        courseTitle: course?.title || 'Khóa học'
      }
    }))

    return {
      certificates: enrichedCertificates,
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
      return []
    }

    const cert = byEnrollment[0]
    const isOwner = cert.userId.toString() === requestingUserId.toString()
    const isAdmin = role === 'admin'

    if (!isOwner && !isAdmin) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền xem chứng chỉ này!')
    }

    const user = await userModel.findOneById(cert.userId)
    const course = await courseModel.findOneById(cert.courseId)
    
    // Get Trainer from issuedBy
    let trainerName = 'Giảng viên'
    if (cert.issuedBy) {
      const issuer = await userModel.findOneById(cert.issuedBy)
      if (issuer) {
        trainerName = issuer.displayName || issuer.username
      }
    }
    
    const enriched = byEnrollment.map(c => ({
      ...c,
      userName: user?.displayName || user?.username || 'Học viên',
      courseTitle: course?.title || 'Khóa học',
      trainerName
    }))

    return enriched
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

    const user = await userModel.findOneById(certificate.userId)
    const course = await courseModel.findOneById(certificate.courseId)
    const userName = user?.displayName || user?.username || 'Học viên'
    const courseTitle = course?.title || 'Khóa học'

    // Get Trainer from issuedBy
    let trainerName = 'Giảng viên'
    if (certificate.issuedBy) {
      const issuer = await userModel.findOneById(certificate.issuedBy)
      if (issuer) {
        trainerName = issuer.displayName || issuer.username
      }
    }

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
        isExpired,
        userName,
        courseTitle,
        trainerName,
        credentialUrl: certificate.credentialUrl
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

// ============ SEND CERTIFICATE ISSUED EMAIL ============
const sendCertificateIssuedEmail = async (certificate, enrollment, userEmail, userName) => {
  const verificationLink = `${WEBSITE_DOMAIN}/certificates/verify/${certificate.verificationCode}`
  const courseName = enrollment?.courseId?.title || 'Khóa học đã hoàn thành'
  const issuedDate = new Date(certificate.issuedDate).toLocaleDateString('vi-VN')

  const htmlContent = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.8; color: #333333; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #059669; padding: 35px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-family: 'Arial', sans-serif; letter-spacing: 2px; text-transform: uppercase;">
          Restart-35
        </h1>
        <p style="color: #a7f3d0; margin: 10px 0 0 0; font-size: 14px;">Nền tảng hỗ trợ tái hòa nhập và lập nghiệp</p>
      </div>
      <div style="padding: 50px 30px; background-color: #ffffff; text-align: center;">
        <h2 style="color: #059669; margin-top: 0; font-size: 22px;">
          Chuc mung ban da hoan thanh khoa hoc!
        </h2>
        <p style="font-size: 15px; color: #555555; margin-bottom: 25px;">Kính chào <strong>${userName || 'bạn'}</strong>,</p>
        <p style="font-size: 15px; color: #555555;">
          Chúc mừng bạn đã hoàn thành khóa học <strong>${courseName}</strong>.
          Chứng chỉ của bạn đã được cấp và sẵn sàng sử dụng.
        </p>

        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 24px; margin: 30px 0; text-align: left;">
          <p style="margin: 0 0 12px 0; font-size: 14px; color: #555555;"><strong>Thông tin chứng chỉ:</strong></p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; font-size: 14px; color: #555555;">Mã chứng chỉ:</td>
              <td style="padding: 6px 0; font-size: 14px; font-weight: bold; color: #059669; text-align: right;">${certificate.certificateNumber}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 14px; color: #555555;">Ngày cấp:</td>
              <td style="padding: 6px 0; font-size: 14px; font-weight: bold; text-align: right;">${issuedDate}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 14px; color: #555555;">Điểm số:</td>
              <td style="padding: 6px 0; font-size: 14px; font-weight: bold; text-align: right;">${certificate.score !== null ? `${certificate.score}/100` : 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 14px; color: #555555;">Mã xác thực:</td>
              <td style="padding: 6px 0; font-size: 14px; font-weight: bold; text-align: right; color: #059669;">${certificate.verificationCode}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 15px; color: #555555; margin-bottom: 20px;">
          Xác thực chứng chỉ của bạn tại đây:
        </p>
        <a href="${verificationLink}" style="display: inline-block; background-color: #059669; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px;">
          Xem &amp; Xác thực chứng chỉ
        </a>
        <p style="font-size: 12px; color: #999999; margin-top: 20px;">
          Hoặc copy link: ${verificationLink}
        </p>
      </div>
      <div style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #eaeaea;">
        <p style="margin: 0; font-size: 12px; color: #999999;">
          Email này được gửi tự động từ Restart-35. Vui lòng không reply.
        </p>
      </div>
    </div>
  `

  const subject = `Chuc mung ban da hoan thanh khoa hoc ${courseName}!`
  await BrevoProvider.sendEmail(userEmail, subject, htmlContent)
}

// ============ AUTO CREATE CERTIFICATE FOR ENROLLMENT ============
// Called automatically when enrollment is completed
const createCertificateForEnrollment = async (enrollmentId, issuedBy = null) => {
  try {
    const enrollment = await enrollmentModel.findOneById(enrollmentId)
    if (!enrollment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Đăng ký không tồn tại!')
    }

    const existing = await certificateModel.isCertificateExistsForEnrollment(enrollmentId)
    if (existing) {
      console.log(`Certificate already exists for enrollment ${enrollmentId}, skipping auto-create`)
      return null
    }

    const score = enrollment.assessments?.length > 0
      ? Math.round(
          enrollment.assessments.reduce((sum, a) => sum + (a.score || 0), 0)
          / enrollment.assessments.length
        )
      : null

    const course = await courseModel.findOneById(enrollment.courseId)
    const user = await userModel.findOneById(enrollment.userId)
    const userName = user?.displayName || user?.username || 'Học viên'
    const courseTitle = course?.title || 'Khóa học'

    const certificateNumber = generateCertificateNumber()
    const verificationCode = generateVerificationCode()

    // Generate PDF and upload to Cloudinary
    let credentialUrl = ''
    try {
      const { pdfService } = await import('./pdfService')
      const { CloudinaryProvider } = await import('~/providers/CloudinaryProvider')

      const pdfBuffer = await pdfService.generateCertificatePDF({
        userName,
        courseTitle,
        certificateNumber,
        verificationCode,
        issuedDate: new Date()
      })

      const uploadResult = await CloudinaryProvider.streamUpload(pdfBuffer, 'certificates')
      credentialUrl = uploadResult?.secure_url || ''
    } catch (pdfError) {
      console.warn('Failed to generate/upload certificate PDF, using fallback mock URL:', pdfError.message)
      credentialUrl = `https://res.cloudinary.com/mock-cloud/image/upload/v1700000000/mock_cert_${verificationCode}.pdf`
    }

    const certificateData = {
      enrollmentId: enrollmentId.toString(),
      userId: enrollment.userId.toString(),
      courseId: enrollment.courseId.toString(),
      type: CERTIFICATE_TYPES.COMPLETION,
      score,
      skills: course?.skills || [],
      certificateNumber,
      verificationCode,
      credentialUrl,
      issuedBy: issuedBy || null,
      status: 'active'
    }

    const result = await certificateModel.createNew(certificateData)
    const created = { _id: result.insertedId, ...certificateData }
    console.log(`Certificate auto-created for enrollment ${enrollmentId}: ${certificateData.certificateNumber}`)

    // Auto-merge skills into WorkerProfile
    try {
      if (certificateData.skills && certificateData.skills.length > 0) {
        const { workerProfileModel } = await import('~/models/workerProfileModel')
        await workerProfileModel.addSkillsToProfile(enrollment.userId.toString(), certificateData.skills)
        console.log(`Auto-merged skills to profile for user ${enrollment.userId}`)
      }
    } catch (skillErr) {
      console.warn(`Failed to merge skills into worker profile for user ${enrollment.userId}:`, skillErr)
    }

    // Send email notification to user
    try {
      const user = await userModel.findOneById(enrollment.userId)
      if (user?.email) {
        await sendCertificateIssuedEmail(created, enrollment, user.email, user.displayName || user.username)
        console.log(`Certificate email sent for enrollment ${enrollmentId}`)
      }
    } catch (emailError) {
      console.error(`Failed to send certificate email for enrollment ${enrollmentId}:`, emailError.message)
    }

    return created
  } catch (error) {
    throw error
  }
}

export const certificateService = {
  generateCertificateNumber,
  generateVerificationCode,
  createCertificate,
  createCertificateForEnrollment,
  getCertificates,
  getCertificateById,
  getMyCertificates,
  getCertificateByEnrollment,
  verifyCertificate,
  updateCertificate,
  revokeCertificate
}
