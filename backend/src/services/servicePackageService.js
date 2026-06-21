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
  const organization = await organizationModel.findOneById(organizationId)
  let oldPackage = null

  if (organization.currentPackageId) {
    oldPackage = await servicePackageModel.findOneById(organization.currentPackageId)
  }

  const now = Date.now()
  const newDurationMs = packageItem.durationMonths * 30 * 24 * 60 * 60 * 1000

  let newStartDate = now
  let newEndDate = now + newDurationMs
  let newQuota = packageItem.monthlyJobQuota
  let newUsedQuota = 0

  if (oldPackage && organization.subscriptionEndDate && organization.subscriptionEndDate > now) {
    if (packageItem.price > oldPackage.price) {
      // Nâng cấp: Áp dụng ngay. Chỉ cộng dồn quota dư nếu gói cũ là gói có phí
      let unusedQuota = 0
      if (oldPackage.price > 0) {
        unusedQuota = Math.max(0, (organization.monthlyJobQuota || 0) - (organization.currentMonthUsedJobQuota || 0))
      }
      newQuota = packageItem.monthlyJobQuota + unusedQuota
      newStartDate = now
      newEndDate = now + newDurationMs
      newUsedQuota = 0
    } else if (packageItem.price === oldPackage.price) {
      // Gia hạn: Kéo dài thời gian, cộng thêm quota
      newStartDate = organization.subscriptionStartDate
      newEndDate = organization.subscriptionEndDate + newDurationMs
      newQuota = (organization.monthlyJobQuota || 0) + packageItem.monthlyJobQuota
      newUsedQuota = organization.currentMonthUsedJobQuota || 0
    } else {
      // Không nên vào đây do buyPackage đã chặn
      newStartDate = now
      newEndDate = now + newDurationMs
    }
  }

  await organizationModel.update(organizationId, {
    currentPackageId: String(packageItem._id),
    subscriptionStartDate: newStartDate,
    subscriptionEndDate: newEndDate,
    monthlyJobQuota: newQuota,
    currentMonthUsedJobQuota: newUsedQuota
  })
}

const buyPackage = async (userId, organizationId, packageId, method, ipAddr, returnUrl) => {
  try {
    const packageItem = await servicePackageModel.findOneById(packageId)
    if (!packageItem || !packageItem.isActive) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Gói dịch vụ không tồn tại hoặc đã ngừng cung cấp!')
    }

    const organization = await organizationModel.findOneById(organizationId)
    if (organization.currentPackageId && organization.subscriptionEndDate > Date.now()) {
      const oldPackage = await servicePackageModel.findOneById(organization.currentPackageId)
      if (oldPackage && packageItem.price < oldPackage.price) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Bạn đang sử dụng gói dịch vụ cao cấp hơn. Vui lòng chờ đến khi gói hiện tại hết hạn.')
      }
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

      // Ghi nhận transaction cho enterprise
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

      // Ghi nhận vào collection payments để hiển thị ở trang Admin Payments
      const { paymentModel } = await import('~/models/paymentModel')
      await paymentModel.createNew({
        userId: String(userId),
        method: 'wallet',
        amount: packageItem.price,
        status: 'completed',
        notes: `Mua gói dịch vụ: ${packageItem.name}`,
        referenceModel: 'ServicePackage',
        referenceId: String(packageId)
      })

      // Gán gói cho tổ chức
      await applyPackageToOrganization(organizationId, packageItem)

      // Chuyển tiền cho Admin
      const { revenueShareService } = await import('~/services/revenueShareService')
      await revenueShareService.processPackageRevenue(
        packageItem.price,
        `Doanh thu từ doanh nghiệp mua gói dịch vụ: ${packageItem.name}`,
        String(packageId)
      )

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

      const { paymentModel } = await import('~/models/paymentModel')
      await paymentModel.createNew({
        userId: String(userId),
        method: 'vnpay',
        amount: packageItem.price,
        status: 'pending',
        notes: `Mua gói dịch vụ: ${packageItem.name}`,
        referenceModel: 'ServicePackage',
        referenceId: String(packageId),
        transactionId: String(tx._id)
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
