import express from 'express'
import { servicePackageController } from '~/controllers/servicePackageController'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

// ============ PUBLIC/ENTERPRISE ============
// Ai cũng có thể xem danh sách gói active
Router.get(
  '/active',
  servicePackageController.getActivePackages
)

// Enterprise mua gói
Router.post(
  '/:id/buy',
  authMiddleware.isAuthorized,
  servicePackageController.buyPackage
)

// Webhook VNPay
Router.get(
  '/vnpay-ipn',
  servicePackageController.vnpayIpn
)

// ============ ADMIN ============
// Admin quản lý các gói
Router.post(
  '/',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedAdmin,
  servicePackageController.createPackage
)

Router.get(
  '/',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedAdmin,
  servicePackageController.getPackagesAdmin
)

Router.put(
  '/:id',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedAdmin,
  servicePackageController.updatePackage
)

Router.delete(
  '/:id',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedAdmin,
  servicePackageController.deletePackage
)

export const servicePackageRoute = Router
