import { VNPay } from 'vnpay'
import { env } from '~/config/enviroment'

export const vnpayInstance = new VNPay({
    tmnCode: env.VNP_TMN_CODE || 'VNPAY_TEST',
    secureSecret: env.VNP_HASH_SECRET || 'VNPAY_TEST_SECRET_DO_NOT_USE_IN_PRODUCTION_BLABLABLA',
    vnpayHost: 'https://sandbox.vnpayment.vn',
    testMode: true,
    hashAlgorithm: 'SHA512',
    enableIPN: true,
    paymentEndpoint: 'paymentv2/vpcpay.html'
})