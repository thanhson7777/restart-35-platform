import { CONNECT_DB, CLOSE_DB, GET_DB } from '../config/mongodb.js'
import { jobCategoryModel } from '../models/jobCategoryModel.js'

const MOCK_JOB_CATEGORIES = [
  { name: 'Kinh doanh & Bán hàng', description: 'Nhân viên kinh doanh, quản lý cửa hàng, chuyên viên chăm sóc khách hàng.', icon: 'Briefcase', order: 1 },
  { name: 'Sản xuất & Kỹ thuật', description: 'Công nhân sản xuất, kỹ thuật viên điện lạnh, thợ cơ khí, thợ mộc.', icon: 'Wrench', order: 2 },
  { name: 'Vận tải & Kho bãi', description: 'Tài xế giao hàng, nhân viên kho, quản lý kho vận, điều phối viên.', icon: 'Truck', order: 3 },
  { name: 'Dịch vụ Khách sạn & Nhà hàng', description: 'Phục vụ bàn, tạp vụ, lễ tân, phụ bếp, quản lý nhà hàng.', icon: 'Coffee', order: 4 },
  { name: 'Hành chính & Nhân sự', description: 'Nhân viên văn phòng, hành chính nhân sự, thư ký, lễ tân văn phòng.', icon: 'Clipboard', order: 5 },
  { name: 'Tài chính & Kế toán', description: 'Kế toán tổng hợp, kế toán viên, thu ngân, nhân viên thu hồi nợ.', icon: 'PieChart', order: 6 },
  { name: 'Giáo dục & Đào tạo', description: 'Giáo viên, trợ giảng, nhân viên tư vấn tuyển sinh, bảo mẫu.', icon: 'BookOpen', order: 7 },
  { name: 'Chăm sóc sức khỏe', description: 'Điều dưỡng, y tá, dược sĩ, nhân viên chăm sóc người cao tuổi.', icon: 'Heart', order: 8 },
  { name: 'Công nghệ thông tin', description: 'Lập trình viên, kỹ thuật viên IT, quản trị mạng, thiết kế đồ họa.', icon: 'Monitor', order: 9 },
  { name: 'An ninh & Bảo vệ', description: 'Nhân viên an ninh, bảo vệ tòa nhà, giám sát camera.', icon: 'Shield', order: 10 },
  { name: 'Làm đẹp & Spa', description: 'Chuyên viên massage, thợ làm tóc, thợ nail, tư vấn thẩm mỹ.', icon: 'Smile', order: 11 },
  { name: 'Nông nghiệp & Chăn nuôi', description: 'Kỹ sư nông nghiệp, công nhân nông trại, kỹ thuật viên chăn nuôi.', icon: 'Leaf', order: 12 },
  { name: 'Thời trang & May mặc', description: 'Thợ may công nghiệp, nhân viên QC may mặc, thiết kế rập.', icon: 'Scissors', order: 13 },
  { name: 'Khác', description: 'Các ngành nghề lao động phổ thông và thời vụ khác.', icon: 'MoreHorizontal', order: 14 }
]

const seedJobCategories = async () => {
  try {
    console.log('Đang kết nối database...')
    await CONNECT_DB()
    console.log('Kết nối database thành công!')

    const db = GET_DB()
    const collectionName = jobCategoryModel.COLLECTION_NAME

    // Dọn dẹp dữ liệu cũ
    console.log('Đang dọn dẹp dữ liệu danh mục việc làm cũ...')
    await db.collection(collectionName).deleteMany({})

    console.log('Đang thêm các danh mục việc làm mới...')
    for (const cat of MOCK_JOB_CATEGORIES) {
      const result = await jobCategoryModel.createNew({
        ...cat,
        isActive: true,
        jobCount: 0
      })
      console.log(`- Đã thêm: ${cat.name} (Slug: ${result.insertedId})`)
    }

    console.log('✅ Đã hoàn tất thêm danh mục việc làm!')

  } catch (error) {
    console.error('❌ Lỗi khi seed danh mục việc làm:', error)
  } finally {
    await CLOSE_DB()
    process.exit(0)
  }
}

seedJobCategories()
