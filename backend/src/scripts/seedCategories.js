import { CONNECT_DB, CLOSE_DB, GET_DB } from '../config/mongodb.js'
import { categoryModel } from '../models/categoryModel.js'

const MOCK_CATEGORIES = [
  { name: 'Công nghệ thông tin', description: 'Tin học văn phòng, lập trình cơ bản, phân tích dữ liệu và an toàn thông tin.', icon: 'Monitor', order: 1 },
  { name: 'Kinh doanh & Quản trị', description: 'Khởi nghiệp, quản trị doanh nghiệp nhỏ, lập kế hoạch kinh doanh.', icon: 'Briefcase', order: 2 },
  { name: 'Ngoại ngữ', description: 'Tiếng Anh giao tiếp, Tiếng Trung, Tiếng Hàn, Tiếng Nhật phục vụ công việc.', icon: 'Globe', order: 3 },
  { name: 'Kỹ năng mềm', description: 'Kỹ năng giao tiếp, quản lý thời gian, làm việc nhóm và giải quyết vấn đề.', icon: 'Users', order: 4 },
  { name: 'Nghề mộc & Cơ khí', description: 'Gia công cơ khí cơ bản, thợ mộc, sửa chữa điện máy, bảo trì thiết bị.', icon: 'Wrench', order: 5 },
  { name: 'Tiếp thị & Bán hàng', description: 'Bán hàng online, Digital Marketing, chốt sale, chăm sóc khách hàng.', icon: 'TrendingUp', order: 6 },
  { name: 'Nông nghiệp công nghệ cao', description: 'Kỹ thuật chăn nuôi, trồng trọt ứng dụng công nghệ, phân bón và tưới tiêu.', icon: 'Leaf', order: 7 },
  { name: 'Chăm sóc sức khỏe & Y tế', description: 'Điều dưỡng cơ bản, chăm sóc người già, dược lý cơ bản, sơ cấp cứu.', icon: 'Heart', order: 8 },
  { name: 'Nghệ thuật & Sáng tạo', description: 'Thiết kế đồ họa, nhiếp ảnh sản phẩm, quay và dựng video cơ bản.', icon: 'PenTool', order: 9 },
  { name: 'Dịch vụ nhà hàng & Khách sạn', description: 'Quản lý buồng phòng, nghiệp vụ bàn, lễ tân, quản lý nhà hàng.', icon: 'Coffee', order: 10 },
  { name: 'Tài chính & Kế toán', description: 'Kế toán doanh nghiệp, khai báo thuế, quản lý tài chính cá nhân.', icon: 'PieChart', order: 11 },
  { name: 'Logistics & Vận tải', description: 'Quản lý kho bãi, nghiệp vụ xuất nhập khẩu, vận hành chuỗi cung ứng.', icon: 'Truck', order: 12 },
  { name: 'Sư phạm & Huấn luyện', description: 'Kỹ năng sư phạm, thiết kế bài giảng, nghiệp vụ giảng dạy nghề.', icon: 'BookOpen', order: 13 },
  { name: 'Chăm sóc sắc đẹp & Spa', description: 'Kỹ thuật massage, cắt tóc, làm nail, quản lý cơ sở thẩm mỹ.', icon: 'Smile', order: 14 },
  { name: 'May mặc & Thời trang', description: 'Kỹ thuật cắt may, thiết kế thời trang, vận hành máy may công nghiệp.', icon: 'Scissors', order: 15 }
]

const seedCategories = async () => {
  try {
    console.log('Đang kết nối database...')
    await CONNECT_DB()
    console.log('Kết nối database thành công!')

    const db = GET_DB()
    const collectionName = categoryModel.CATEGORY_COLLECTION_NAME

    // Xóa toàn bộ danh mục cũ để tránh trùng lặp
    console.log('Đang dọn dẹp dữ liệu danh mục cũ...')
    await db.collection(collectionName).deleteMany({})

    // Thêm danh mục mới
    console.log('Đang thêm các danh mục mới...')
    for (const cat of MOCK_CATEGORIES) {
      // Gọi qua model để ăn theo hàm generateSlug và validation
      const result = await categoryModel.createNew({
        ...cat,
        isActive: true,
        isFeatured: false,
        courseCount: 0
      })
      console.log(`- Đã thêm: ${cat.name} (Slug: ${result.insertedId})`)
    }

    console.log('✅ Đã hoàn tất thêm danh mục khóa học!')

  } catch (error) {
    console.error('❌ Lỗi khi seed danh mục:', error)
  } finally {
    await CLOSE_DB()
    process.exit(0)
  }
}

seedCategories()
