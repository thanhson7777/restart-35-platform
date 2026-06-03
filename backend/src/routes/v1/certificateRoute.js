import express from 'express'
import { certificateValidation } from '~/validators/certificateValidation'
import { certificateController } from '~/controllers/certificateController'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

// ============ PUBLIC ROUTES ============

// Xác thực certificate (public — không cần auth)
Router.get(
  '/verify/:code',
  certificateController.verifyCertificate
)

// ============ WORKER ROUTES ============

// Chứng chỉ của tôi
Router.get(
  '/my',
  authMiddleware.isAuthorized,
  certificateController.getMyCertificates
)

// ============ ADMIN ROUTES ============

// Danh sách certificates
Router.get(
  '/',
  authMiddleware.isAuthorizedAdmin,
  certificateController.getCertificates
)

// Cấp certificate
Router.post(
  '/',
  authMiddleware.isAuthorizedAdmin,
  certificateValidation.createCertificate,
  certificateController.createCertificate
)

// Chi tiết certificate
Router.get(
  '/:id',
  authMiddleware.isAuthorizedAdmin,
  certificateValidation.checkCertificateId,
  certificateController.getCertificateById
)

// Certificate theo enrollment
Router.get(
  '/enrollment/:enrollmentId',
  authMiddleware.isAuthorizedAdmin,
  certificateController.getCertificateByEnrollment
)

// Cập nhật certificate
Router.put(
  '/:id',
  authMiddleware.isAuthorizedAdmin,
  certificateValidation.checkCertificateId,
  certificateValidation.updateCertificate,
  certificateController.updateCertificate
)

// Thu hồi certificate
Router.put(
  '/:id/revoke',
  authMiddleware.isAuthorizedAdmin,
  certificateValidation.checkCertificateId,
  certificateValidation.revokeCertificate,
  certificateController.revokeCertificate
)

export const certificateRoute = Router
