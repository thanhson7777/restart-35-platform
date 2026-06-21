import { courseModel } from '~/models/courseModel'
import { walletModel } from '~/models/walletModel'
import { transactionModel } from '~/models/transactionModel'
import { userModel } from '~/models/userModel'

// Mặc định Admin giữ 20%, Trainer nhận 80%
const ADMIN_COMMISSION_RATE = 0.20

const processRevenueShare = async (payment) => {
  try {
    // 1. Lấy thông tin Course để tìm instructor (providerId)
    const course = await courseModel.findOneById(payment.courseId)
    if (!course || !course.providerId) {
      console.warn(`[RevenueShare] Course ${payment.courseId} không tồn tại hoặc không có providerId. Bỏ qua chia doanh thu.`)
      return
    }

    // 2. Tính toán tiền
    const amount = payment.amount
    const adminRevenue = Math.round(amount * ADMIN_COMMISSION_RATE)
    const trainerRevenue = amount - adminRevenue

    // 3. Lấy hoặc tạo ví của Trainer
    const trainerWallet = await walletModel.findOrCreateByUserId(course.providerId)

    // 4. Cộng tiền vào ví (availableBalance)
    await walletModel.update(course.providerId.toString(), {
      availableBalance: trainerWallet.availableBalance + trainerRevenue
    })

    // 5. Ghi nhận giao dịch nạp tiền vào ví
    await transactionModel.createNew({
      walletId: trainerWallet._id.toString(),
      userId: course.providerId.toString(),
      type: 'COURSE_REVENUE',
      amount: trainerRevenue,
      description: `Doanh thu 80% từ bán khóa học: ${course.title}`,
      referenceId: payment._id.toString(),
      referenceModel: 'Payment',
      status: 'COMPLETED'
    })

    console.log(`[RevenueShare] Đã chuyển ${trainerRevenue} VND cho Trainer ${course.providerId} từ thanh toán ${payment._id}`)

    // 6. Cộng tiền 20% vào ví của Admin (Hệ thống)
    const { users } = await userModel.getUsers({ role: 'admin' }, 0, 1)
    if (users && users.length > 0) {
      const adminId = users[0]._id.toString()
      const adminWallet = await walletModel.findOrCreateByUserId(adminId)
      
      await walletModel.update(adminId, {
        availableBalance: adminWallet.availableBalance + adminRevenue
      })

      // 7. Ghi nhận giao dịch nạp tiền vào ví Admin
      await transactionModel.createNew({
        walletId: adminWallet._id.toString(),
        userId: adminId,
        type: 'SYSTEM_FEE',
        amount: adminRevenue,
        description: `Phí nền tảng 20% từ bán khóa học: ${course.title}`,
        referenceId: payment._id.toString(),
        referenceModel: 'Payment',
        status: 'COMPLETED'
      })
      console.log(`[RevenueShare] Đã chuyển ${adminRevenue} VND (phí nền tảng) cho Admin ${adminId} từ thanh toán ${payment._id}`)
    } else {
      console.warn('[RevenueShare] Không tìm thấy tài khoản Admin để nhận 20% doanh thu.')
    }
  } catch (error) {
    console.error(`[RevenueShare] Lỗi khi chia doanh thu cho thanh toán ${payment._id}:`, error)
    // Tùy theo kiến trúc, có thể không throw error để tránh làm hỏng luồng thanh toán chính
  }
}

const processPackageRevenue = async (amount, description, referenceId) => {
  try {
    const { users } = await userModel.getUsers({ role: 'admin' }, 0, 1)
    if (users && users.length > 0) {
      const adminId = users[0]._id.toString()
      const adminWallet = await walletModel.findOrCreateByUserId(adminId)
      
      await walletModel.update(adminId, {
        availableBalance: adminWallet.availableBalance + amount
      })

      await transactionModel.createNew({
        walletId: adminWallet._id.toString(),
        userId: adminId,
        type: 'SYSTEM_FEE',
        amount: amount,
        description: description,
        referenceId: referenceId,
        referenceModel: 'ServicePackage',
        status: 'COMPLETED'
      })
      console.log(`[RevenueShare] Đã chuyển ${amount} VND (doanh thu gói dịch vụ) cho Admin ${adminId}`)
    } else {
      console.warn('[RevenueShare] Không tìm thấy tài khoản Admin để nhận doanh thu gói dịch vụ.')
    }
  } catch (error) {
    console.error(`[RevenueShare] Lỗi khi cộng doanh thu gói dịch vụ:`, error)
  }
}

export const revenueShareService = {
  processRevenueShare,
  processPackageRevenue
}
