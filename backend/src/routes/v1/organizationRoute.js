import express from 'express'
import { organizationValidation } from '~/validators/organizationValidation'
import { organizationController } from '~/controllers/organizationController'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

// ============ ADMIN ROUTES ============

Router.route('/')
  .get(
    authMiddleware.isAuthorized,
    authMiddleware.isAuthorizedAdmin,
    organizationController.getOrganizations
  )
  .post(
    authMiddleware.isAuthorized,
    authMiddleware.isAuthorizedAdmin,
    organizationValidation.createOrganization,
    organizationController.createOrganization
  )
    
Router.route('/stats')
  .get(
    authMiddleware.isAuthorized,
    authMiddleware.isAuthorizedAdmin,
    organizationController.getOrganizationStats
  )

Router.route('/:id')
  .get(
    authMiddleware.isAuthorized,
    organizationValidation.checkOrganizationId,
    organizationController.getOrganizationById
  )
  .put(
    authMiddleware.isAuthorized,
    organizationValidation.checkOrganizationId,
    organizationValidation.updateOrganization,
    organizationController.updateOrganization
  )
  .delete(
    authMiddleware.isAuthorized,
    authMiddleware.isAuthorizedAdmin,
    organizationValidation.checkOrganizationId,
    organizationController.deleteOrganization
  )

Router.route('/:id/members')
  .get(
    authMiddleware.isAuthorized,
    authMiddleware.isAuthorizedAdmin,
    organizationValidation.checkOrganizationId,
    organizationController.getOrganizationMembers
  )

Router.route('/:id/quota')
  .get(
    authMiddleware.isAuthorized,
    authMiddleware.isAuthorizedAdmin,
    organizationValidation.checkOrganizationId,
    organizationController.getOrganizationQuota
  )
  .put(
    authMiddleware.isAuthorized,
    authMiddleware.isAuthorizedAdmin,
    organizationValidation.checkOrganizationId,
    organizationValidation.updateQuota,
    organizationController.updateOrganizationQuota
  )

export const organizationRoute = Router
