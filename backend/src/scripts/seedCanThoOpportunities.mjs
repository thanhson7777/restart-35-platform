import 'dotenv/config'
import { MongoClient, ObjectId } from 'mongodb'

const client = new MongoClient(process.env.MONGODB_URI)
const db = client.db(process.env.DATABASE_NAME)

async function main() {
  await client.connect()

  const enterpriseId = '6a34fd5437a6a9796d781a1f'
  const providerId = '6a350090fe6682162bf335a4' // NGO ID

  const jobs = [
    {
      enterpriseId: enterpriseId,
      enterpriseInfo: {
        name: 'Siêu thị Lotte Mart Cần Thơ',
        logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=80',
        industry: 'Bán lẻ & Tiêu dùng',
        size: '100-500',
        verified: true
      },
      job: {
        title: 'Nhân viên Bán hàng & Chăm sóc Khách hàng',
        description: 'Tư vấn bán hàng, sắp xếp và trưng bày sản phẩm lên quầy kệ. Giải đáp thắc mắc và chăm sóc khách hàng tại siêu thị.',
        requirements: ['Tốt nghiệp THPT trở lên', 'Ngoại hình sáng, giao tiếp tốt', 'Nhanh nhẹn, chăm chỉ'],
        benefits: ['Lương cơ bản + thưởng doanh số', 'Đóng BHXH đầy đủ', 'Được đào tạo kỹ năng bán hàng chuyên nghiệp'],
        salary: { min: 6000000, max: 9000000, negotiable: false, currency: 'VND' },
        type: 'fulltime',
        quantity: 5,
        gender: 'any',
        ageRange: { min: 18, max: 35 },
        workingHours: 'Xoay ca (Ca 1: 8h-16h, Ca 2: 14h-22h)',
        category: 'Kinh doanh & Quản trị'
      },
      requirements: {
        education: 'THPT',
        experience: 0,
        skills: ['Giao tiếp', 'Bán hàng'],
        certifications: [],
        languages: []
      },
      location: {
        address: 'Lotte Mart Cần Thơ, 84 Mậu Thân, An Hòa, Ninh Kiều, Cần Thơ',
        province: 'Cần Thơ',
        district: 'Ninh Kiều',
        ward: 'An Hòa',
        type: 'onsite',
        coordinates: { lat: 10.0435, lng: 105.7725 }
      },
      status: 'published',
      publishedAt: Date.now(),
      _destroy: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      enterpriseId: enterpriseId,
      enterpriseInfo: {
        name: 'Công ty Công nghệ số Mekong',
        logo: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=80',
        industry: 'Công nghệ thông tin',
        size: '20-50',
        verified: true
      },
      job: {
        title: 'Kỹ thuật viên Sửa chữa Điện tử & Máy tính',
        description: 'Kiểm tra, chẩn đoán lỗi và sửa chữa phần cứng máy tính, điện thoại cho khách hàng. Hỗ trợ lắp đặt thiết bị mạng văn phòng.',
        requirements: ['Có chứng chỉ nghề CNTT hoặc sửa chữa điện tử', 'Thực hành tốt việc sửa chữa phần cứng', 'Thái độ phục vụ tốt'],
        benefits: ['Lương cứng + phụ cấp kỹ thuật', 'Lương tháng 13', 'Môi trường làm việc năng động'],
        salary: { min: 8000000, max: 12000000, negotiable: true, currency: 'VND' },
        type: 'fulltime',
        quantity: 2,
        gender: 'any',
        ageRange: { min: 20, max: 40 },
        workingHours: 'Hành chính (8h00 - 17h30)',
        category: 'Công nghệ thông tin'
      },
      requirements: {
        education: 'Trung cấp Nghề',
        experience: 1,
        skills: ['Sửa chữa máy tính', 'Lắp đặt mạng', 'Khắc phục sự cố phần cứng'],
        certifications: [],
        languages: []
      },
      location: {
        address: 'Đường 3/2, Xuân Khánh, Ninh Kiều, Cần Thơ (Gần Đại học Cần Thơ)',
        province: 'Cần Thơ',
        district: 'Ninh Kiều',
        ward: 'Xuân Khánh',
        type: 'onsite',
        coordinates: { lat: 10.0299, lng: 105.7684 }
      },
      status: 'published',
      publishedAt: Date.now(),
      _destroy: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      enterpriseId: enterpriseId,
      enterpriseInfo: {
        name: 'Khách sạn Mường Thanh Cần Thơ',
        logo: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=80',
        industry: 'Nhà hàng & Khách sạn',
        size: '100-500',
        verified: true
      },
      job: {
        title: 'Nhân viên Lễ tân Khách sạn',
        description: 'Thực hiện thủ tục check-in, check-out cho khách hàng. Tiếp nhận cuộc gọi đặt phòng và giải quyết yêu cầu từ khách lưu trú.',
        requirements: ['Tốt nghiệp Trung cấp trở lên chuyên ngành Du lịch/Khách sạn', 'Tiếng Anh giao tiếp cơ bản', 'Ngoại hình ưa nhìn'],
        benefits: ['Hỗ trợ ăn ca tại khách sạn', 'Thưởng phí phục vụ hàng tháng', 'Cơ hội thăng tiến rõ rệt'],
        salary: { min: 7000000, max: 10000000, negotiable: false, currency: 'VND' },
        type: 'fulltime',
        quantity: 3,
        gender: 'any',
        ageRange: { min: 18, max: 30 },
        workingHours: 'Xoay ca 8 tiếng (Ca sáng/chiều/tối)',
        category: 'Du lịch & Dịch vụ'
      },
      requirements: {
        education: 'Trung cấp',
        experience: 0,
        skills: ['Giao tiếp tiếng Anh', 'Lễ tân khách sạn', 'Chăm sóc khách hàng'],
        certifications: [],
        languages: ['Tiếng Anh']
      },
      location: {
        address: 'Khu di tích Cái Khế, Ninh Kiều, Cần Thơ',
        province: 'Cần Thơ',
        district: 'Ninh Kiều',
        ward: 'Cái Khế',
        type: 'onsite',
        coordinates: { lat: 10.0478, lng: 105.7876 }
      },
      status: 'published',
      publishedAt: Date.now(),
      _destroy: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ]

  const courses = [
    {
      title: 'Khóa đào tạo Kỹ năng Giao tiếp & Phục vụ Khách hàng chuyên nghiệp',
      slug: 'ky-nang-giao-tiep-phuc-vu-khach-hang-chuyen-nghiep-can-tho',
      description: 'Khóa học ngắn hạn trang bị cho học viên kỹ năng lắng nghe chủ động, giải quyết phàn nàn và giao tiếp tự tin trước khách hàng. Rất phù hợp cho nhân viên dịch vụ, lễ tân và bán hàng.',
      shortDescription: 'Trang bị kỹ năng giao tiếp và phục vụ khách hàng tiêu chuẩn cao.',
      thumbnail: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800',
      categoryId: '6a391b1242eb47a63f056e06', // Kỹ năng mềm
      providerId: providerId,
      provider: { name: 'Trường Cao đẳng Nghề Cần Thơ' },
      duration: { value: 4, unit: 'weeks' },
      location: {
        type: 'offline',
        address: 'Trường Cao đẳng Nghề Cần Thơ, 57 Đường Cách Mạng Tháng Tám, An Thới, Bình Thủy, Cần Thơ',
        coordinates: { lat: 10.0542, lng: 105.7656 }
      },
      delivery_type: 'offline',
      fundingConfig: {
        type: 'FREE',
        price: 0,
        sponsorIds: [],
        hasJobGuarantee: false,
        acceptsSponsorship: true
      },
      fee: 0,
      isFree: true,
      maxStudents: 30,
      status: 'approved',
      approvedBy: providerId,
      approvedAt: new Date(),
      _destroy: false,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      title: 'Kỹ thuật Điện dân dụng & Sửa chữa Thiết bị gia đình',
      slug: 'ky-thuat-dien-dan-dung-sua-chua-thiet-bi-gia-dinh-can-tho',
      description: 'Lớp học thực hành sửa chữa điện gia dụng: sửa quạt, nồi cơm điện, lắp đặt tủ điện an toàn. Cấp chứng chỉ nghề ngay sau khi tốt nghiệp để đi làm ngay.',
      shortDescription: 'Học thực hành lắp đặt và sửa chữa hệ thống điện gia đình cơ bản.',
      thumbnail: 'https://images.unsplash.com/photo-1621905252507-b354bc25edac?w=800',
      categoryId: '6a391b1242eb47a63f056e07', // Nghề mộc & Cơ khí
      providerId: providerId,
      provider: { name: 'Trung tâm Giáo dục Nghề nghiệp Quận Ninh Kiều' },
      duration: { value: 8, unit: 'weeks' },
      location: {
        type: 'offline',
        address: 'Trung tâm GDNN Ninh Kiều, 2 Hùng Vương, Thới Bình, Ninh Kiều, Cần Thơ',
        coordinates: { lat: 10.0402, lng: 105.7831 }
      },
      delivery_type: 'offline',
      fundingConfig: {
        type: 'FREE',
        price: 0,
        sponsorIds: [],
        hasJobGuarantee: true,
        acceptsSponsorship: true
      },
      fee: 0,
      isFree: true,
      maxStudents: 25,
      status: 'approved',
      approvedBy: providerId,
      approvedAt: new Date(),
      _destroy: false,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      title: 'Lập trình Web Cơ bản (HTML, CSS, JS) cho người mới bắt đầu',
      slug: 'lap-trinh-web-co-ban-cho-nguoi-moi-bat-dau-can-tho',
      description: 'Khóa học cung cấp kiến thức nền tảng về phát triển web Front-end. Học viên sẽ được học cách viết mã HTML, CSS và sử dụng JavaScript cơ bản để tạo trang web tương tác.',
      shortDescription: 'Nền tảng lập trình Front-end cơ bản với dự án thực tế.',
      thumbnail: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800',
      categoryId: '6a391b1242eb47a63f056e03', // CNTT
      providerId: providerId,
      provider: { name: 'Viện Công nghệ Thông tin - Đại học Cần Thơ' },
      duration: { value: 6, unit: 'weeks' },
      location: {
        type: 'offline',
        address: 'Viện CNTT - Đại học Cần Thơ, Khu II, Đường 3/2, Xuân Khánh, Ninh Kiều, Cần Thơ',
        coordinates: { lat: 10.0299, lng: 105.7684 }
      },
      delivery_type: 'offline',
      fundingConfig: {
        type: 'FREE',
        price: 0,
        sponsorIds: [],
        hasJobGuarantee: false,
        acceptsSponsorship: true
      },
      fee: 0,
      isFree: true,
      maxStudents: 35,
      status: 'approved',
      approvedBy: providerId,
      approvedAt: new Date(),
      _destroy: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]

  const jobsRes = await db.collection('recruitment_jobs').insertMany(jobs)
  console.log(`Successfully seeded ${jobsRes.insertedCount} jobs in Can Tho!`)

  const coursesRes = await db.collection('courses').insertMany(courses)
  console.log(`Successfully seeded ${coursesRes.insertedCount} courses in Can Tho!`)

  await client.close()
}

main().catch(console.error)
