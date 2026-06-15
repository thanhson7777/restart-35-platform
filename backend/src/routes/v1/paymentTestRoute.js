import express from 'express'
import { paymentController } from '~/controllers/paymentTestController'

const Router = express.Router()

Router.get('/vnpay_ipn', paymentController.vnpayIpn)

Router.get('/momo_callback', paymentController.momoCallback)
Router.post('/momo_callback', paymentController.momoCallback)

export const paymentTestRoute = Router
