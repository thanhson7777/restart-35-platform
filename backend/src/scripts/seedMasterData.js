import { CONNECT_DB, CLOSE_DB, GET_DB } from '../config/mongodb.js'
import { masterDataModel } from '../models/masterDataModel.js'

const MOCK_MASTER_DATA = [
  // ================= industry =================
  { type: 'industry', label: 'Công nghệ thông tin (IT)', description: 'Phần mềm, phần cứng, dịch vụ IT', order: 1 },
  { type: 'industry', label: 'Y tế & Chăm sóc sức khỏe', description: 'Bệnh viện, phòng khám, dược phẩm', order: 2 },
  { type: 'industry', label: 'Giáo dục & Đào tạo', description: 'Trường học, trung tâm đào tạo, edtech', order: 3 },
  { type: 'industry', label: 'Tài chính & Ngân hàng', description: 'Ngân hàng, chứng khoán, bảo hiểm', order: 4 },
  { type: 'industry', label: 'Sản xuất & Chế biến', description: 'Sản xuất công nghiệp, dệt may, thực phẩm', order: 5 },
  { type: 'industry', label: 'Bán lẻ & Thương mại', description: 'Siêu thị, cửa hàng, e-commerce', order: 6 },
  { type: 'industry', label: 'Logistics & Vận tải', description: 'Vận chuyển, kho bãi, xuất nhập khẩu', order: 7 },
  { type: 'industry', label: 'Xây dựng & Bất động sản', description: 'Thi công, thiết kế, quản lý BĐS', order: 8 },

  // ================= training_category =================
  { type: 'training_category', label: 'Lập trình & Công nghệ', description: 'Lập trình web, mobile, data, AI', order: 1 },
  { type: 'training_category', label: 'Ngoại ngữ', description: 'Tiếng Anh, Nhật, Hàn, Trung', order: 2 },
  { type: 'training_category', label: 'Kỹ năng mềm', description: 'Giao tiếp, thuyết trình, làm việc nhóm', order: 3 },
  { type: 'training_category', label: 'Thiết kế đồ họa', description: 'Photoshop, Illustrator, UI/UX', order: 4 },
  { type: 'training_category', label: 'Marketing & Bán hàng', description: 'Digital Marketing, SEO, Telesale', order: 5 },
  { type: 'training_category', label: 'Quản trị & Lãnh đạo', description: 'Quản lý nhân sự, quản trị dự án', order: 6 },
  { type: 'training_category', label: 'Kế toán & Tài chính', description: 'Kế toán doanh nghiệp, phân tích tài chính', order: 7 },

  // ================= ngo_focus =================
  { type: 'ngo_focus', label: 'Giáo dục cho trẻ em nghèo', description: 'Cung cấp học bổng, xây trường học', order: 1 },
  { type: 'ngo_focus', label: 'Hỗ trợ người khuyết tật', description: 'Dạy nghề, tìm việc, hỗ trợ y tế', order: 2 },
  { type: 'ngo_focus', label: 'Phát triển cộng đồng', description: 'Nước sạch, điện năng, sinh kế', order: 3 },
  { type: 'ngo_focus', label: 'Bảo vệ môi trường', description: 'Trồng rừng, giảm rác thải nhựa', order: 4 },
  { type: 'ngo_focus', label: 'Trao quyền phụ nữ', description: 'Bình đẳng giới, hỗ trợ phụ nữ khởi nghiệp', order: 5 },
  { type: 'ngo_focus', label: 'Cứu trợ thiên tai', description: 'Hỗ trợ khẩn cấp vùng bão lũ', order: 6 },
  { type: 'ngo_focus', label: 'Chăm sóc người cao tuổi', description: 'Nhà dưỡng lão, chăm sóc y tế', order: 7 }
]

const generateValue = (label) => {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

const seedMasterData = async () => {
  try {
    console.log('Đang kết nối database...')
    await CONNECT_DB()
    console.log('Kết nối database thành công!')

    const db = GET_DB()
    const collectionName = masterDataModel.MASTER_DATA_COLLECTION_NAME

    // Xóa toàn bộ master data cũ
    console.log('Đang dọn dẹp dữ liệu master data cũ...')
    await db.collection(collectionName).deleteMany({})

    // Thêm dữ liệu mới
    console.log('Đang thêm master data mới...')
    for (const item of MOCK_MASTER_DATA) {
      const result = await masterDataModel.createNew({
        ...item,
        value: generateValue(item.label),
        isActive: true
      })
      console.log(`- Đã thêm [${item.type}]: ${item.label} (Value: ${result.value})`)
    }

    console.log('✅ Đã hoàn tất thêm master data!')

  } catch (error) {
    console.error('❌ Lỗi khi seed master data:', error)
  } finally {
    await CLOSE_DB()
    process.exit(0)
  }
}

seedMasterData()
