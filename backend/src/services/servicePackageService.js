import { servicePackageModel } from '~/models/servicePackageModel'
import { walletModel } from '~/models/walletModel'
import { transactionModel } from '~/models/transactionModel'
import { organizationModel } from '~/models/organizationModel'
import { vnpayInstance } from '~/config/vnpayConfig'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'

const createPackage = async (data) => {
  try {
    const result = await servicePackageModel.createNew(data)
    const newPackage = await servicePackageModel.findOneById(result.insertedId)
    return newPackage
  } catch (error) {
    throw error
  }
}

const getPackages = async (includeInactive = false) => {
  try {
    const packages = await servicePackageModel.findAll(includeInactive)
    return packages
  } catch (error) {
    throw error
  }
}

const getPackageById = async (id) => {
  try {
    const packageItem = await servicePackageModel.findOneById(id)
    if (!packageItem) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Gói dịch vụ không tồn tại!')
    }
    return packageItem
  } catch (error) {
    throw error
  }
}

const updatePackage = async (id, data) => {
  try {
    const packageItem = await servicePackageModel.findOneById(id)
    if (!packageItem) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Gói dịch vụ không tồn tại!')
    }

    const updated = await servicePackageModel.update(id, data)
    return updated
  } catch (error) {
    throw error
  }
}

const deletePackage = async (id) => {
  try {
    const packageItem = await servicePackageModel.findOneById(id)
    if (!packageItem) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Gói dịch vụ không tồn tại!')
    }

    const deleted = await servicePackageModel.softDelete(id)
    return deleted
  } catch (error) {
    throw error
  }
}

const applyPackageToOrganization = async (organizationId, packageItem) => {
  const startDate = Date.now()
  const durationMs = packageItem.durationMonths * 30 * 24 * 60 * 60 * 1000
  const endDate = startDate + durationMs

  await organizationModel.update(organizationId, {
    currentPackageId: String(packageItem._id),
    subscriptionStartDate: startDate,
    subscriptionEndDate: endDate,
    monthlyJobQuota: packageItem.monthlyJobQuota
  })
}

const buyPackage = async (userId, organizationId, packageId, method, ipAddr, returnUrl) => {
  try {
    const packageItem = await servicePackageModel.findOneById(packageId)
    if (!packageItem || !packageItem.isActive) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Gói dịch vụ không tồn tại hoặc đã ngừng cung cấp!')
    }

    if (method === 'wallet') {
      const wallet = await walletModel.findOrCreateByUserId(userId)
      if (wallet.availableBalance < packageItem.price) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Số dư trong ví không đủ để thanh toán!')
      }

      // Trừ tiền
      await walletModel.update(userId, {
        availableBalance: wallet.availableBalance - packageItem.price
      })

      // Ghi nhận transaction
      await transactionModel.createNew({
        walletId: String(wallet._id),
        userId: String(userId),
        type: 'PAYMENT',
        amount: packageItem.price,
        description: `Thanh toán mua gói dịch vụ: ${packageItem.name}`,
        referenceId: String(packageId),
        referenceModel: 'ServicePackage',
        status: 'COMPLETED'
      })

      // Gán gói cho tổ chức
      await applyPackageToOrganization(organizationId, packageItem)

      return { success: true, message: 'Mua gói dịch vụ thành công' }
    } else if (method === 'vnpay') {
      const wallet = await walletModel.findOrCreateByUserId(userId)
      
      const tx = await transactionModel.createNew({
        walletId: String(wallet._id),
        userId: String(userId),
        type: 'PAYMENT',
        amount: packageItem.price,
        description: `Thanh toán mua gói dịch vụ: ${packageItem.name}`,
        referenceId: String(packageId),
        referenceModel: 'ServicePackage',
        status: 'PENDING'
      })

      const paymentUrl = vnpayInstance.buildPaymentUrl({
        vnp_Amount: packageItem.price,
        vnp_IpAddr: ipAddr,
        vnp_TxnRef: String(tx._id),
        vnp_OrderInfo: `Mua goi dich vu ${packageId}`,
        vnp_ReturnUrl: returnUrl || 'http://localhost:5173/enterprise/packages/vnpay-return'
      })

      return { paymentUrl }
    } else {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Phương thức thanh toán không hợp lệ!')
    }
  } catch (error) {
    throw error
  }
}

export const servicePackageService = {
  createPackage,
  getPackages,
  getPackageById,
  updatePackage,
  deletePackage,
  buyPackage,
  applyPackageToOrganization
}
