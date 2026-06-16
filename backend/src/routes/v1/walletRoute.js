import express from 'express'
import { walletController } from '~/controllers/walletController'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

// VNPay Webhook (IPN) - Không cần auth
Router.get('/vnpay-ipn', walletController.vnpayIpnWallet)

// Các route cần auth
Router.use(authMiddleware.isAuthorized)

Router.route('/my-wallet')
  .get(walletController.getMyWallet)

Router.route('/my-transactions')
  .get(walletController.getMyTransactions)

Router.route('/topup')
  .post(walletController.createTopupUrl)

export const walletRoute = Router
