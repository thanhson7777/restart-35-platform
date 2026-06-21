import { vnpayInstance } from '~/config/vnpayConfig'
import { paymentModel } from '~/models/paymentModel'
import { enrollmentModel } from '~/models/enrollmentModel'
import { ENROLLMENT_PAYMENT_STATUS, PAYMENT_STATUS, ENROLLMENT_STATUS_V2 } from '~/utils/constants'
import crypto from 'crypto'

const verifyVnpayIpn = async (vnp_Params) => {
    const verifyResult = vnpayInstance.verifyIpnCall(vnp_Params)
    if (!verifyResult.isSuccess) {
        return { RspCode: '97', Message: 'Checksum failed' }
    }

    const txnRef = vnp_Params['vnp_TxnRef']
    const amount = vnp_Params['vnp_Amount']
    const rspCode = vnp_Params['vnp_ResponseCode']
    
    // vnp_TxnRef thường có format paymentId_timestamp, nên ta lấy phần đầu
    const [paymentId] = txnRef.split('_')
    const payment = await paymentModel.findOneById(paymentId)
    if (!payment) return { RspCode: '01', Message: 'Payment not found' }
    
    // vnp_Amount chứa số tiền x 100
    const receivedAmount = parseInt(amount) / 100
    if (receivedAmount !== payment.amount) {
        return { RspCode: '04', Message: 'Invalid amount' }
    }

    if (payment.status === PAYMENT_STATUS.COMPLETED) {
        return { RspCode: '02', Message: 'Payment already confirmed' }
    }

    if (rspCode === '00') {
        // Cập nhật trạng thái payment thành công
        await paymentModel.updateStatus(paymentId, PAYMENT_STATUS.COMPLETED, vnp_Params['vnp_TransactionNo'])
        
        // Cập nhật trạng thái enrollment
        if (payment.enrollmentId) {
            await enrollmentModel.updatePaymentStatus(payment.enrollmentId, ENROLLMENT_PAYMENT_STATUS.PAID)
            await enrollmentModel.updateStatus(payment.enrollmentId, ENROLLMENT_STATUS_V2.ACTIVE)
        } else if (payment.courseId && payment.userId) {
            const { enrollmentService } = await import('~/services/enrollmentService')
            try {
                await enrollmentService.enrollCourse(payment.userId.toString(), payment.courseId.toString(), {
                    paymentId: paymentId,
                    source: 'direct'
                })
            } catch (error) {
                console.error('Auto-enroll error after VNPAY success:', error.message)
            }
        }

        // Trigger Revenue Share
        if (payment.amount > 0) {
            const { revenueShareService } = await import('~/services/revenueShareService')
            await revenueShareService.processRevenueShare(payment)
        }
    } else {
        await paymentModel.updateStatus(paymentId, PAYMENT_STATUS.FAILED, vnp_Params['vnp_TransactionNo'])
    }

    return { RspCode: '00', Message: 'Confirm Success' }
}

const verifyMomoCallback = async (momoParams) => {
    const {
        partnerCode, orderId, requestId, amount, orderInfo, orderType,
        transId, resultCode, message, payType, responseTime, extraData, signature
    } = momoParams

    const accessKey = process.env.MOMO_ACCESS_KEY
    const secretKey = process.env.MOMO_SECRET_KEY

    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`

    const expectedSignature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex')

    if (signature !== expectedSignature) {
        return { RspCode: '97', Message: 'Checksum failed' }
    }

    const [realPaymentId] = orderId.split('_')

    const payment = await paymentModel.findOneById(realPaymentId)
    if (!payment) return { RspCode: '01', Message: 'Payment not found' }

    if (payment.status === PAYMENT_STATUS.COMPLETED) {
        return { RspCode: '02', Message: 'Payment already confirmed' }
    }

    if (String(resultCode) === '0') {
        await paymentModel.updateStatus(realPaymentId, PAYMENT_STATUS.COMPLETED, transId)
        if (payment.enrollmentId) {
            await enrollmentModel.updatePaymentStatus(payment.enrollmentId, ENROLLMENT_PAYMENT_STATUS.PAID)
            await enrollmentModel.updateStatus(payment.enrollmentId, ENROLLMENT_STATUS_V2.ACTIVE)
        } else if (payment.courseId && payment.userId) {
            const { enrollmentService } = await import('~/services/enrollmentService')
            try {
                await enrollmentService.enrollCourse(payment.userId.toString(), payment.courseId.toString(), {
                    paymentId: realPaymentId,
                    source: 'direct'
                })
            } catch (error) {
                console.error('Auto-enroll error after Momo success:', error.message)
            }
        }

        // Trigger Revenue Share
        if (payment.amount > 0) {
            const { revenueShareService } = await import('~/services/revenueShareService')
            await revenueShareService.processRevenueShare(payment)
        }
    } else {
        await paymentModel.updateStatus(realPaymentId, PAYMENT_STATUS.FAILED, transId)
    }

    return { RspCode: '00', Message: 'Success', resultCode }
}

export const paymentService = {
    verifyVnpayIpn,
    verifyMomoCallback
}