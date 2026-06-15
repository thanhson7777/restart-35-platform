/* eslint-disable no-unused-vars */
/* eslint-disable no-console */
import { StatusCodes } from 'http-status-codes'
import { paymentService } from '~/services/paymentTestService'

const vnpayIpn = async (req, res, next) => {
    try {
        const result = await paymentService.verifyVnpayIpn(req.query)
        console.log('result', result)
        res.status(200).json(result)
    } catch (error) {
        console.error('Lỗi IPN VNPAY:', error)
        res.status(200).json({ RspCode: '99', Message: 'Unknown Error' })
    }
}

const momoCallback = async (req, res, next) => {
    try {
        const momoParams = Object.keys(req.body).length > 0 ? req.body : req.query

        await paymentService.verifyMomoCallback(momoParams)

        res.status(StatusCodes.NO_CONTENT).send()
    } catch (error) {
        console.error('Lỗi IPN MOMO:', error)
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}

export const paymentController = {
    vnpayIpn,
    momoCallback
}