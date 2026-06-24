import { paymentModel } from '~/models/paymentModel'
import { enrollmentModel } from '~/models/enrollmentModel'
import { courseModel } from '~/models/courseModel'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { GET_DB } from '~/config/mongodb'
import {
  DEFAULT_PAGE,
  DEFAULT_ITEM_PER_PAGE,
  PAYMENT_STATUS,
  ENROLLMENT_PAYMENT_STATUS
} from '~/utils/constants'
import { env } from '~/config/enviroment'

// ============ CREATE ============
const createPayment = async (userId, data) => {
  try {
    const { enrollmentId, courseId, method, amount, installments } = data

    if (enrollmentId) {
      const enrollment = await enrollmentModel.findOneById(enrollmentId)
      if (!enrollment) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Đăng ký không tồn tại!')
      }

      if (enrollment.userId.toString() !== userId.toString()) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền thanh toán đăng ký này!')
      }
    }

    const course = await courseModel.findOneById(courseId)
    if (!course) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Khóa học không tồn tại!')
    }

    // Tái sử dụng giao dịch đang chờ thanh toán có cùng số tiền
    const db = await GET_DB()
    const existingQuery = {
      userId: userId.toString(),
      amount: parseInt(amount),
      status: PAYMENT_STATUS.PENDING,
      _destroy: { $ne: true }
    }
    if (enrollmentId) existingQuery.enrollmentId = enrollmentId.toString()
    else existingQuery.courseId = courseId.toString()

    const existingPending = await db.collection(paymentModel.PAYMENT_COLLECTION_NAME).findOne(existingQuery)
    if (existingPending) {
      if (method === 'vnpay') {
        const { vnpayInstance } = await import('~/config/vnpayConfig')
        const paymentUrl = vnpayInstance.buildPaymentUrl({
          vnp_Amount: existingPending.amount,
          vnp_IpAddr: '127.0.0.1',
          vnp_TxnRef: `${existingPending._id.toString()}_${Date.now()}`,
          vnp_OrderInfo: `Thanh toan khoa hoc ${courseId}`,
          vnp_OrderType: 'other',
          vnp_ReturnUrl: env.VNP_RETURN_URL || 'http://localhost:5173/payment/vnpay-return',
        })
        existingPending.paymentUrl = paymentUrl
      }
      return existingPending
    }

    const paymentData = {
      enrollmentId: enrollmentId || null,
      userId,
      courseId,
      method,
      amount,
      status: PAYMENT_STATUS.PENDING,
      installments: installments || []
    }

    const result = await paymentModel.createNew(paymentData)
    const payment = await paymentModel.findOneById(result.insertedId)

    if (method === 'bank_transfer') {
      const bankAccountNumber = env.PAYMENT_BANK_ACCOUNT_NUMBER.replace(/\s+/g, '')
      const bankName = env.PAYMENT_BANK_NAME
      const accountName = encodeURIComponent(env.PAYMENT_ACCOUNT_NAME)
      const qrUrl = `https://img.vietqr.io/image/${bankName}-${bankAccountNumber}-compact.png?amount=${amount}&addInfo=RESTART35-${payment._id.toString().toUpperCase()}&accountName=${accountName}`
      await paymentModel.update(payment._id.toString(), { qrUrl })
      payment.qrUrl = qrUrl
    } else if (method === 'vnpay') {
      const { vnpayInstance } = await import('~/config/vnpayConfig')
      const paymentUrl = vnpayInstance.buildPaymentUrl({
        vnp_Amount: amount,
        vnp_IpAddr: '127.0.0.1',
        vnp_TxnRef: `${payment._id.toString()}_${Date.now()}`,
        vnp_OrderInfo: `Thanh toan khoa hoc ${courseId}`,
        vnp_OrderType: 'other',
        vnp_ReturnUrl: env.VNP_RETURN_URL || 'http://localhost:5173/payment/vnpay-return',
      })
      // Cập nhật vào payment (nếu DB hỗ trợ lưu link) hoặc cứ trả về trực tiếp
      payment.paymentUrl = paymentUrl
    }

    return payment
  } catch (error) {
    throw error
  }
}

// ============ READ ============
const getPayments = async (query) => {
  try {
    const {
      page = DEFAULT_PAGE,
      item_per_page = DEFAULT_ITEM_PER_PAGE,
      enrollmentId,
      userId,
      status
    } = query

    const skip = (page - 1) * item_per_page
    const limit = parseInt(item_per_page)

    const matchCondition = { _destroy: false }

    if (enrollmentId) matchCondition.enrollmentId = enrollmentId
    if (userId) matchCondition.userId = userId
    if (status) matchCondition.status = status

    const result = await paymentModel.findByPaginate(matchCondition, skip, limit)

    return {
      payments: result.payments,
      pagination: {
        page: parseInt(page),
        item_per_page: limit,
        total: result.total,
        total_pages: Math.ceil(result.total / limit)
      }
    }
  } catch (error) {
    throw error
  }
}

const getPaymentById = async (id) => {
  try {
    const payment = await paymentModel.findOneById(id)
    if (!payment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Thanh toán không tồn tại!')
    }
    return payment
  }
  catch (error) {
    throw error
  }
}

const getMyPayments = async (userId, query) => {
  try {
    const {
      page = DEFAULT_PAGE,
      item_per_page = DEFAULT_ITEM_PER_PAGE,
      status,
      enrollmentId
    } = query

    const skip = (page - 1) * item_per_page
    const limit = parseInt(item_per_page)

    const matchCondition = { userId, _destroy: false }
    if (status) matchCondition.status = status
    if (enrollmentId) matchCondition.enrollmentId = enrollmentId

    const result = await paymentModel.findByPaginate(matchCondition, skip, limit)

    return {
      payments: result.payments,
      pagination: {
        page: parseInt(page),
        item_per_page: limit,
        total: result.total,
        total_pages: Math.ceil(result.total / limit)
      }
    }
  } catch (error) {
    throw error
  }
}

// ============ UPDATE ============
const updatePaymentStatus = async (id, status, transactionId) => {
  try {
    const payment = await paymentModel.findOneById(id)
    if (!payment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Thanh toán không tồn tại!')
    }

    const updated = await paymentModel.updateStatus(id, status, transactionId)

    // Auto-update enrollment.payment_status
    if (status === PAYMENT_STATUS.COMPLETED) {
      if (!payment.enrollmentId && payment.courseId && payment.userId) {
        // Handle auto-enrollment for direct purchases where enrollment wasn't created yet
        const { enrollmentService } = await import('~/services/enrollmentService')
        try {
          await enrollmentService.enrollCourse(payment.userId.toString(), payment.courseId.toString(), {
            paymentId: id,
            source: 'direct'
          })
        } catch (error) {
          console.error('Auto-enroll error after payment success:', error.message)
        }

        // Trigger Revenue Share
        if (payment.amount > 0) {
          const { revenueShareService } = await import('~/services/revenueShareService')
          await revenueShareService.processRevenueShare(payment)
        }
      } else {
        const enrollment = await enrollmentModel.findOneById(payment.enrollmentId)
        if (enrollment) {
        const course = await courseModel.findOneById(enrollment.courseId)
        const fundingModel = course?.funding_model || 'free'
        
        if (fundingModel === 'learner_paid') {
          const allPayments = await paymentModel.findByEnrollment(payment.enrollmentId)
          const completedAmount = allPayments
            .filter(p => p.status === PAYMENT_STATUS.COMPLETED)
            .reduce((sum, p) => sum + p.amount, 0)
          
          const totalFee = enrollment.fee?.total || course?.fee || 0
          
          await enrollmentModel.update(payment.enrollmentId, {
            'fee.paid': completedAmount,
            'fee.pending': totalFee - completedAmount > 0 ? totalFee - completedAmount : 0
          })

          if (completedAmount >= totalFee) {
            await enrollmentModel.updatePaymentStatus(payment.enrollmentId, ENROLLMENT_PAYMENT_STATUS.PAID)
            
            // Trigger Revenue Share
            const { revenueShareService } = await import('~/services/revenueShareService')
            await revenueShareService.processRevenueShare(payment)
          } else {
            await enrollmentModel.updatePaymentStatus(payment.enrollmentId, ENROLLMENT_PAYMENT_STATUS.INSTALLMENT_ACTIVE)
          }
        } else if (fundingModel === 'isa') {
          try {
            const { isaRepaymentModel } = await import('~/models/isaRepaymentModel')
            const { isaRepaymentService } = await import('./isaRepaymentService')
            const isa = await isaRepaymentModel.findByEnrollment(payment.enrollmentId)
            if (isa && isa.status === 'active') {
              const pendingRecord = isa.monthlyRecords?.find(r => r.status === 'pending')
              if (pendingRecord) {
                const updatedIsa = await isaRepaymentService.updateMonthlyRecord(
                  isa._id.toString(),
                  pendingRecord.month,
                  pendingRecord.year,
                  {
                    status: 'paid',
                    paymentAmount: payment.amount,
                    paidDate: Date.now()
                  }
                )
                if (updatedIsa && updatedIsa.totalPaidAmount >= updatedIsa.maxCap) {
                  await isaRepaymentService.capIsaRepayment(updatedIsa._id.toString())
                }
              }
            }
          } catch (isaError) {
            console.warn('Failed to auto-update ISA status:', isaError.message)
          }
        } else {
          await enrollmentModel.updatePaymentStatus(payment.enrollmentId, ENROLLMENT_PAYMENT_STATUS.PAID)
          
          if (payment.amount > 0) {
            await enrollmentModel.update(payment.enrollmentId, {
              'fee.paid': payment.amount,
              'fee.pending': 0
            })
          }

          // Trigger Revenue Share (if any direct paid enrollment uses this default else block)
          if (payment.amount > 0) {
            const { revenueShareService } = await import('~/services/revenueShareService')
            await revenueShareService.processRevenueShare(payment)
          }
          }
        }
      }
    } else if (status === PAYMENT_STATUS.REFUNDED) {
      await enrollmentModel.updatePaymentStatus(payment.enrollmentId, ENROLLMENT_PAYMENT_STATUS.PENDING)
    }

    return updated
  } catch (error) {
    throw error
  }
}

const refundPayment = async (id, reason) => {
  try {
    const payment = await paymentModel.findOneById(id)
    if (!payment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Thanh toán không tồn tại!')
    }

    if (payment.status !== PAYMENT_STATUS.COMPLETED) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Chỉ có thể hoàn tiền thanh toán đã hoàn tất!')
    }

    const updated = await paymentModel.updateStatus(id, PAYMENT_STATUS.REFUNDED, null)

    await enrollmentModel.updatePaymentStatus(payment.enrollmentId, ENROLLMENT_PAYMENT_STATUS.PENDING)

    return updated
  } catch (error) {
    throw error
  }
}

// ============ INVOICE ============
const generateInvoice = async (id) => {
  try {
    const payment = await paymentModel.findOneById(id)
    if (!payment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Thanh toán không tồn tại!')
    }

    const course = await courseModel.findOneById(payment.courseId)

    const invoiceNumber = `INV-${Date.now()}-${payment._id.toString().slice(-6).toUpperCase()}`
    const taxAmount = Math.round(payment.amount * 0.1)
    const totalAmount = payment.amount + taxAmount

    const invoiceData = {
      invoiceNumber,
      issuedDate: Date.now(),
      taxAmount,
      totalAmount
    }

    const updated = await paymentModel.updateInvoice(id, invoiceData)

    return {
      invoice: updated.invoice,
      payment: {
        _id: updated._id,
        amount: updated.amount,
        method: updated.method,
        status: updated.status
      },
      course: course ? {
        title: course.title,
        duration: course.duration
      } : null
    }
  } catch (error) {
    throw error
  }
}

// ============ STATS ============
const getPaymentStats = async (courseId) => {
  try {
    const db = await (await import('~/config/mongodb')).GET_DB()
    const pipeline = [
      { $match: { courseId, _destroy: false } },
      {
        $group: {
          _id: '$status',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]
    const result = await db.collection('payments').aggregate(pipeline).toArray()
    return result
  } catch (error) {
    throw error
  }
}

const getAdminStats = async () => {
  try {
    const db = await (await import('~/config/mongodb')).GET_DB()
    const pipeline = [
      { $match: { _destroy: false } },
      {
        $group: {
          _id: '$status',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]
    const result = await db.collection('payments').aggregate(pipeline).toArray()
    
    const stats = {
      totalRevenue: 0,
      adminRevenue: 0,
      pending: 0,
      completed: 0,
      totalRefund: 0
    }

    result.forEach(item => {
      if (item._id === PAYMENT_STATUS.COMPLETED) {
        stats.completed = item.count
        stats.totalRevenue = item.totalAmount
        stats.adminRevenue = Math.round(item.totalAmount * 0.2) // 20% admin commission
      } else if (item._id === PAYMENT_STATUS.PENDING) {
        stats.pending = item.count
      } else if (item._id === PAYMENT_STATUS.REFUNDED) {
        stats.totalRefund = item.count
      }
    })

    // Lấy doanh thu từ việc bán Gói Dịch Vụ
    const packageTransactions = await db.collection('transactions').aggregate([
      { $match: { referenceModel: 'ServicePackage', status: 'COMPLETED', _destroy: { $ne: true } } },
      { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
    ]).toArray()

    if (packageTransactions && packageTransactions.length > 0) {
      const packageRevenue = packageTransactions[0].totalAmount
      stats.totalRevenue += packageRevenue
      stats.adminRevenue += packageRevenue
    }

    return stats
  } catch (error) {
    throw error
  }
}

// ============ WEBHOOK ============
const webhookHandler = async (gateway, payload) => {
  try {
    let status
    let transactionId
    let paymentId = null

    if (gateway === 'vietqr') {
      const data = payload.data || payload
      const desc = data.description || data.content || data.addInfo || data.metadata?.description || ''
      const match = desc.match(/RESTART35-([A-Fa-f0-9]{24})/)
      if (match) {
        const matchedId = match[1]
        const db = await GET_DB()
        const { ObjectId } = await import('mongodb')
        let payment = await db.collection(paymentModel.PAYMENT_COLLECTION_NAME).findOne({
          _id: new ObjectId(matchedId.toLowerCase()),
          status: PAYMENT_STATUS.PENDING,
          _destroy: { $ne: true }
        })
        if (!payment) {
          payment = await db.collection(paymentModel.PAYMENT_COLLECTION_NAME).findOne({
            enrollmentId: matchedId,
            status: PAYMENT_STATUS.PENDING,
            _destroy: { $ne: true }
          })
        }
        if (payment) {
          status = PAYMENT_STATUS.COMPLETED
          transactionId = data.transactionId || data.id || data.transaction_id
          paymentId = payment._id.toString()
        }
      }
      return { status, transactionId, paymentId }
    }

    if (gateway === 'casso') {
      const transactions = payload.data || []
      for (const trans of transactions) {
        const desc = trans.description || ''
        const match = desc.match(/RESTART35-([A-Fa-f0-9]{24})/)
        if (match) {
          const matchedId = match[1]
          const db = await GET_DB()
          const { ObjectId } = await import('mongodb')
          let payment = await db.collection(paymentModel.PAYMENT_COLLECTION_NAME).findOne({
            _id: new ObjectId(matchedId.toLowerCase()),
            status: PAYMENT_STATUS.PENDING,
            _destroy: { $ne: true }
          })
          if (!payment) {
            payment = await db.collection(paymentModel.PAYMENT_COLLECTION_NAME).findOne({
              enrollmentId: matchedId,
              status: PAYMENT_STATUS.PENDING,
              _destroy: { $ne: true }
            })
          }
          if (payment) {
            status = PAYMENT_STATUS.COMPLETED
            transactionId = trans.id.toString()
            paymentId = payment._id.toString()
            break
          }
        }
      }
      return { status, transactionId, paymentId }
    }

    if (gateway === 'payos') {
      const { orderCode, amount, description, reference } = payload.data || {}
      const desc = description || ''
      const match = desc.match(/RESTART35-([A-Fa-f0-9]{24})/)
      if (match) {
        const matchedId = match[1]
        const db = await GET_DB()
        const { ObjectId } = await import('mongodb')
        let payment = await db.collection(paymentModel.PAYMENT_COLLECTION_NAME).findOne({
          _id: new ObjectId(matchedId.toLowerCase()),
          status: PAYMENT_STATUS.PENDING,
          _destroy: { $ne: true }
        })
        if (!payment) {
          payment = await db.collection(paymentModel.PAYMENT_COLLECTION_NAME).findOne({
            enrollmentId: matchedId,
            status: PAYMENT_STATUS.PENDING,
            _destroy: { $ne: true }
          })
        }
        if (payment) {
          status = PAYMENT_STATUS.COMPLETED
          transactionId = reference || orderCode.toString()
          paymentId = payment._id.toString()
        }
      }
      return { status, transactionId, paymentId }
    }

    switch (gateway) {
      case 'momo':
        if (payload.resultCode !== 0) {
          status = PAYMENT_STATUS.FAILED
        } else {
          status = PAYMENT_STATUS.COMPLETED
          transactionId = payload.transId
        }
        break
      case 'vnpay':
        if (payload.vnp_ResponseCode !== '00') {
          status = PAYMENT_STATUS.FAILED
        } else {
          status = PAYMENT_STATUS.COMPLETED
          transactionId = payload.vnp_TransactionNo
        }
        break
      case 'zalopay':
        if (payload.returnCode !== 1) {
          status = PAYMENT_STATUS.FAILED
        } else {
          status = PAYMENT_STATUS.COMPLETED
          transactionId = payload.transId
        }
        break
      default:
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Gateway khong ho tro')
    }

    // Tim payment theo transactionId
    if (transactionId) {
      const { paymentModel } = await import('~/models/paymentModel')
      const payment = await paymentModel.findByTransactionId(transactionId)
      if (payment) {
        paymentId = payment._id.toString()
      }
    }

    return { status, transactionId, paymentId }
  } catch (error) {
    throw error
  }
}

export const paymentService = {
  createPayment,
  getPayments,
  getPaymentById,
  getMyPayments,
  updatePaymentStatus,
  refundPayment,
  generateInvoice,
  getPaymentStats,
  getAdminStats,
  webhookHandler
}
