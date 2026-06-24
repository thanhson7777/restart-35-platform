import { walletModel } from '~/models/walletModel'
import { transactionModel } from '~/models/transactionModel'
import { vnpayInstance } from '~/config/vnpayConfig'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'

// 1. Get Wallet Info
const getMyWallet = async (req, res, next) => {
  try {
    const wallet = await walletModel.findOrCreateByUserId(req.user._id)
    res.status(StatusCodes.OK).json({ data: wallet })
  } catch (error) {
    next(error)
  }
}

// 2. Get Transaction History
const getMyTransactions = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.max(1, parseInt(req.query.limit) || 10)
    const skip = (page - 1) * limit

    const wallet = await walletModel.findOrCreateByUserId(req.user._id)
    
    const matchCondition = { walletId: String(wallet._id) }
    
    const result = await transactionModel.findByPaginate(matchCondition, skip, limit)

    res.status(StatusCodes.OK).json({ 
      data: result.transactions,
      pagination: {
        page: page,
        item_per_page: limit,
        total: result.total,
        total_pages: Math.ceil(result.total / limit)
      }
    })
  } catch (error) {
    next(error)
  }
}

// 3. Create VNPay Topup URL
const createTopupUrl = async (req, res, next) => {
  try {
    const { amount, returnUrl } = req.body
    if (!amount || amount < 10000) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Số tiền nạp tối thiểu là 10,000đ')
    }

    const ipAddr = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '127.0.0.1'

    // Lấy ví
    const wallet = await walletModel.findOrCreateByUserId(req.user._id)

    // Tạo transaction pending
    const tx = await transactionModel.createNew({
      walletId: String(wallet._id),
      userId: req.user._id,
      type: 'DEPOSIT',
      amount: amount,
      description: `Nạp tiền vào ví`,
      status: 'PENDING'
    })

    const paymentUrl = vnpayInstance.buildPaymentUrl({
      vnp_Amount: amount,
      vnp_IpAddr: ipAddr,
      vnp_TxnRef: tx._id.toString(),
      vnp_OrderInfo: `Nap tien vao vi ${req.user._id}`,
      vnp_ReturnUrl: returnUrl || 'http://localhost:5173/ngo/dashboard/wallet'
    })

    res.status(StatusCodes.OK).json({ data: paymentUrl })
  } catch (error) {
    next(error)
  }
}

// 4. Handle VNPay IPN (Webhook from VNPay)
const vnpayIpnWallet = async (req, res, next) => {
  try {
    const verifyResult = vnpayInstance.verifyIpnCall(req.query)
    
    if (!verifyResult.isSuccess) {
      return res.status(200).json({ RspCode: '97', Message: 'Invalid signature' })
    }

    const txId = verifyResult.vnp_TxnRef
    const tx = await transactionModel.findOneById(txId)

    if (!tx) {
      return res.status(200).json({ RspCode: '01', Message: 'Transaction not found' })
    }

    if (tx.status !== 'PENDING') {
      return res.status(200).json({ RspCode: '02', Message: 'Transaction already confirmed' })
    }

    if (verifyResult.vnp_ResponseCode === '00' && verifyResult.vnp_TransactionStatus === '00') {
      // Thành công
      await transactionModel.updateStatus(txId, 'COMPLETED')

      const wallet = await walletModel.findOneById(tx.walletId)
      if (wallet) {
        await walletModel.update(wallet.userId, {
          availableBalance: (wallet.availableBalance || 0) + tx.amount
        })
      }

      return res.status(200).json({ RspCode: '00', Message: 'Confirm Success' })
    } else {
      // Thất bại
      await transactionModel.updateStatus(txId, 'FAILED')
      return res.status(200).json({ RspCode: '00', Message: 'Confirm Success but payment failed' })
    }
  } catch (error) {
    console.error('Wallet VNPay IPN error:', error)
    return res.status(200).json({ RspCode: '99', Message: 'Unknown error' })
  }
}

export const walletController = {
  getMyWallet,
  getMyTransactions,
  createTopupUrl,
  vnpayIpnWallet
}
