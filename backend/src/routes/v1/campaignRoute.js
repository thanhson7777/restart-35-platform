import express from 'express'
import { campaignController } from '~/controllers/campaignController'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { multerUploadMiddleware } from '~/middlewares/multerUploadMiddleware'
const Router = express.Router()

// PUBLIC OR GENERAL ROUTES
Router.route('/')
  .get(campaignController.getCampaigns)

// VNPay Webhook (IPN)
Router.get('/vnpay-ipn', campaignController.vnpayIpnCampaign)

Router.route('/:id')
  .get(campaignController.getCampaignById)

// WORKER ROUTES
Router.route('/')
  .post(authMiddleware.isAuthorized, authMiddleware.isAuthorizedWorker, campaignController.createCampaign)

Router.route('/:id/milestones')
  .post(
    authMiddleware.isAuthorized, 
    authMiddleware.isAuthorizedWorker, 
    multerUploadMiddleware.uploadMulter.single('proofImage'),
    campaignController.addMilestone
  )

// NGO ROUTES
Router.route('/:id/approve')
  .put(authMiddleware.isAuthorized, authMiddleware.isAuthorizedNGO, campaignController.approveCampaign)

Router.route('/:id/reject')
  .put(authMiddleware.isAuthorized, authMiddleware.isAuthorizedNGO, campaignController.rejectCampaign)

// DONOR ROUTES (User/Enterprise)
Router.route('/:id/donate')
  .post(authMiddleware.isAuthorized, campaignController.donateToCampaign)

// VNPAY CALLBACK
Router.route('/payment/vnpay_return')
  .post(campaignController.vnpayCallback)

export const campaignRoute = Router
