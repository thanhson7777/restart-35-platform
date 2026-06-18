import { servicePackageService } from '~/services/servicePackageService'
import { vnpayInstance } from '~/config/vnpayConfig'
import { transactionModel } from '~/models/transactionModel'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'

// ============ ADMIN ============
const createPackage = async (req, res, next) => {
  try {
    const newPackage = await servicePackageService.createPackage(req.body)
    res.status(StatusCodes.CREATED).json({ data: newPackage })
  } catch (error) {
    next(error)
  }
}

const getPackagesAdmin = async (req, res, next) => {
  try {
    // Admin gets all packages including inactive ones
    const packages = await servicePackageService.getPackages(true)
    res.status(StatusCodes.OK).json({ data: packages })
  } catch (error) {
    next(error)
  }
}

const updatePackage = async (req, res, next) => {
  try {
    const updated = await servicePackageService.updatePackage(req.params.id, req.body)
    res.status(StatusCodes.OK).json({ data: updated })
  } catch (error) {
    next(error)
  }
}

const deletePackage = async (req, res, next) => {
  try {
    await servicePackageService.deletePackage(req.params.id)
    res.status(StatusCodes.OK).json({ message: 'Đã xóa gói dịch vụ thành công' })
  } catch (error) {
    next(error)
  }
}

// ============ PUBLIC/ENTERPRISE ============
const getActivePackages = async (req, res, next) => {
  try {
    // Only get active packages
    const packages = await servicePackageService.getPackages(false)
    res.status(StatusCodes.OK).json({ data: packages })
  } catch (error) {
    next(error)
  }
}

const buyPackage = async (req, res, next) => {
  try {
    const userId = req.user._id
    const organizationId = req.user.organizationId
    if (!organizationId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'User does not belong to any organization')
    }

    const { method, returnUrl } = req.body
    const packageId = req.params.id
    const ipAddr = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '127.0.0.1'

    const result = await servicePackageService.buyPackage(userId, organizationId, packageId, method, ipAddr, returnUrl)
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

// Webhook từ VNPay
const vnpayIpn = async (req, res, next) => {
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
      // Thanh toán thành công
      await transactionModel.updateStatus(txId, 'COMPLETED')

      const packageItem = await import('~/models/servicePackageModel').then(m => m.servicePackageModel.findOneById(tx.referenceId))
      
      if (packageItem) {
        // Tìm organization của user này để gán gói
        const user = await import('~/models/userModel').then(m => m.userModel.findOneById(tx.userId))
        if (user && user.organizationId) {
          await servicePackageService.applyPackageToOrganization(user.organizationId, packageItem)
        }
      }

      return res.status(200).json({ RspCode: '00', Message: 'Confirm Success' })
    } else {
      // Thất bại
      await transactionModel.updateStatus(txId, 'FAILED')
      return res.status(200).json({ RspCode: '00', Message: 'Confirm Success but payment failed' })
    }
  } catch (error) {
    console.error('Service Package VNPay IPN error:', error)
    return res.status(200).json({ RspCode: '99', Message: 'Unknown error' })
  }
}

export const servicePackageController = {
  createPackage,
  getPackagesAdmin,
  updatePackage,
  deletePackage,
  getActivePackages,
  buyPackage,
  vnpayIpn
}
