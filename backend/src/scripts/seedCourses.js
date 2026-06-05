/**
 * Seed Script - Tạo dữ liệu mẫu khóa học và chi tiết khóa học
 *
 * Usage:
 *   node src/scripts/seedCourses.js
 *
 * Mục lục:
 *   [1/5] Users   - 5 users (trainers, admin, workers)
 *   [2/5] Categories - 5 categories
 *   [3/5] Courses  - 6 courses (5 approved, 1 pending)
 *   [4/5] Schedules - Lịch học chi tiết với sessions
 *   [5/5] Worker Profiles - 2 hồ sơ worker mẫu
 *   [6/6] Video Lessons - Chi tiết video lessons cho khóa học video
 */

import 'dotenv/config'
import { MongoClient, ServerApiVersion } from 'mongodb'
import { env } from '~/config/enviroment'
import {
  COURSE_STATUS,
  COURSE_LEVELS,
  COURSE_DELIVERY_TYPES,
  COURSE_FUNDING_MODELS,
  LOCATION_TYPES,
  DURATION_UNITS,
  SCHEDULE_STATUS,
  SESSION_STATUS
} from '~/utils/constants'
import bcryptjs from 'bcryptjs'

let mongoClientInstance = null
let dbInstance = null

const CONNECT_DB = async () => {
  mongoClientInstance = new MongoClient(env.MONGODB_URI, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
  })
  await mongoClientInstance.connect()
  dbInstance = mongoClientInstance.db(env.DATABASE_NAME)
}

const CLOSE_DB = async () => {
  if (mongoClientInstance) await mongoClientInstance.close()
}

const DB = () => dbInstance

// ============ 1. TẠO USER MẪU ============
async function seedUsers() {
  console.log('\n[1/5] Đang tạo users...')

  const users = [
    {
      email: 'trainer.nguyenvana@example.com',
      password: 'Password123!',
      username: 'nguyenvana',
      displayName: 'Nguyễn Văn A',
      phone: '0903000001',
      role: 'TRAINER',
      isActive: true,
      emailVerified: true
    },
    {
      email: 'trainer.tranthib@example.com',
      password: 'Password123!',
      username: 'tranthib',
      displayName: 'Trần Thị B',
      phone: '0903000002',
      role: 'TRAINER',
      isActive: true,
      emailVerified: true
    },
    {
      email: 'admin.levanc@example.com',
      password: 'Password123!',
      username: 'levanc',
      displayName: 'Lê Văn C',
      phone: '0903000003',
      role: 'ADMIN',
      isActive: true,
      emailVerified: true
    },
    {
      email: 'worker.phamthid@example.com',
      password: 'Password123!',
      username: 'phamthid',
      displayName: 'Phạm Thị D',
      phone: '0903000004',
      role: 'WORKER',
      isActive: true,
      emailVerified: true
    },
    {
      email: 'worker.hovane@example.com',
      password: 'Password123!',
      username: 'hovane',
      displayName: 'Hồ Văn E',
      phone: '0903000005',
      role: 'WORKER',
      isActive: true,
      emailVerified: true
    }
  ]

  const createdUsers = []
  for (const user of users) {
    const hashed = bcryptjs.hashSync(user.password, 10)
    const result = await DB().collection('users').insertOne({
      ...user,
      password: hashed,
      createdAt: new Date(),
      updatedAt: new Date(),
      _destroy: false
    })
    createdUsers.push({ _id: result.insertedId, ...user })
    console.log(`  ✓ User: ${user.email}`)
  }
  return createdUsers
}

// ============ 2. TẠO CATEGORIES ============
async function seedCategories() {
  console.log('\n[2/5] Đang tạo categories...')

  const categories = [
    {
      name: 'Công nghệ thông tin',
      slug: 'cntt',
      description: 'Các khóa học về lập trình, phát triển phần mềm, CNTT',
      icon: 'laptop',
      _destroy: false
    },
    {
      name: 'Quản trị doanh nghiệp',
      slug: 'quan-tri-doanh-nghiep',
      description: 'Quản lý, kinh doanh, marketing, tài chính',
      icon: 'briefcase',
      _destroy: false
    },
    {
      name: 'Nông nghiệp & Chế biến',
      slug: 'nong-nghiep-che-bien',
      description: 'Nông nghiệp công nghệ cao, chế biến thực phẩm',
      icon: 'leaf',
      _destroy: false
    },
    {
      name: 'Du lịch & Dịch vụ',
      slug: 'du-lich-dich-vu',
      description: 'Quản lý khách sạn, lữ hành, dịch vụ ẩm thực',
      icon: 'globe',
      _destroy: false
    },
    {
      name: 'Kỹ năng mềm & Khởi nghiệp',
      slug: 'ky-nang-mem-khoi-nghiep',
      description: 'Kỹ năng giao tiếp, quản lý thời gian, khởi nghiệp',
      icon: 'rocket',
      _destroy: false
    }
  ]

  const created = []
  for (const cat of categories) {
    const result = await DB().collection('categories').insertOne({
      ...cat,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    created.push({ _id: result.insertedId, ...cat })
    console.log(`  ✓ Category: ${cat.name}`)
  }
  return created
}

// ============ 3. TẠO KHÓA HỌC ============
async function seedCourses(trainers, categories) {
  console.log('\n[3/5] Đang tạo khóa học...')

  const trainerId = trainers[0]._id
  const cnttCat = categories.find(c => c.slug === 'cntt')._id
  const qtCat = categories.find(c => c.slug === 'quan-tri-doanh-nghiep')._id
  const nnCat = categories.find(c => c.slug === 'nong-nghiep-che-bien')._id
  const dlCat = categories.find(c => c.slug === 'du-lich-dich-vu')._id
  const knCat = categories.find(c => c.slug === 'ky-nang-mem-khoi-nghiep')._id

  const courses = [
    // === KHÓA 1: Lập trình Web Full-stack ===
    {
      title: 'Lập trình Web Full-stack với HTML, CSS, JavaScript',
      slug: 'lap-trinh-web-fullstack-html-css-javascript',
      description: `Khóa học toàn diện dành cho người mới bắt đầu, học từ nền tảng HTML, CSS, JavaScript đến xây dựng website responsive.

## Mục tiêu khóa học
- Hiểu cấu trúc DOM và xử lý sự kiện
- Sử dụng Flexbox và Grid để tạo layout chuyên nghiệp
- Gọi API với Fetch/Axios
- Deploy ứng dụng lên GitHub Pages

## Đối tượng
- Người chưa có kiến thức lập trình
- Người muốn chuyển nghề sang lĩnh vực CNTT
- Nhân viên muốn nâng cao kỹ năng số

## Kết quả sau khóa học
Học viên có thể tự xây dựng một website cá nhân hoàn chỉnh và ứng tuyển vị trí Front-end Developer.`,
      shortDescription: 'Khóa học toàn diện từ HTML/CSS cơ bản đến JavaScript nâng cao, xây dựng website responsive từ đầu.',
      thumbnail: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800',
      categoryId: cnttCat.toString(),
      providerId: trainerId.toString(),
      providerName: 'Nguyễn Văn A',
      providerEmail: 'trainer.nguyenvana@example.com',
      duration: { value: 8, unit: DURATION_UNITS.WEEKS },
      schedule: 'Thứ 2, 4, 6 — 18:00 đến 21:00',
      location: { type: LOCATION_TYPES.HYBRID, address: 'Tầng 3, 123 Nguyễn Huệ, Quận 1, TP.HCM', link: 'https://meet.google.com/abc-defg-hij' },
      delivery_type: COURSE_DELIVERY_TYPES.BLENDED,
      funding_model: COURSE_FUNDING_MODELS.FREE,
      fee: 0,
      isFree: true,
      scholarshipEligibility: true,
      maxStudents: 30,
      currentStudents: 12,
      enrollmentStartDate: Date.now(),
      level: COURSE_LEVELS.BEGINNER,
      skills: ['HTML5', 'CSS3', 'JavaScript', 'Responsive Design', 'Git', 'GitHub Pages'],
      prerequisites: ['Sử dụng máy tính cơ bản', 'Biết tiếng Anh đọc tài liệu'],
      requirements: ['Máy tính có kết nối internet', 'Trình duyệt Chrome/Firefox'],
      syllabus: [
        { week: 1, title: 'Giới thiệu Web & HTML5', content: 'Cấu trúc trang web, thẻ HTML5 semantic', duration: '3 buổi' },
        { week: 2, title: 'CSS3 & Box Model', content: 'Selector, flexbox, grid layout', duration: '3 buổi' },
        { week: 3, title: 'JavaScript cơ bản', content: 'Biến, hàm, vòng lặp, mảng', duration: '3 buổi' },
        { week: 4, title: 'DOM & Sự kiện', content: 'Truy cập DOM, xử lý sự kiện', duration: '3 buổi' },
        { week: 5, title: 'Responsive Design', content: 'Media queries, mobile-first', duration: '3 buổi' },
        { week: 6, title: 'API & Fetch', content: 'Gọi API REST, async/await', duration: '3 buổi' },
        { week: 7, title: 'Project thực tế', content: 'Xây dựng website cá nhân', duration: '3 buổi' },
        { week: 8, title: 'Deploy & Portfolio', content: 'Git, GitHub Pages, hoàn thiện dự án', duration: '3 buổi' }
      ],
      certificate: 'Chứng chỉ hoàn thành khóa Lập trình Web Full-stack',
      outcomes: ['Tự xây dựng website responsive', 'Gọi API và xử lý dữ liệu', 'Deploy ứng dụng lên server', 'Tạo portfolio cá nhân'],
      rating: { average: 4.7, count: 48 },
      status: COURSE_STATUS.APPROVED,
      approvedBy: trainers[1]._id.toString(),
      approvedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      viewCount: 234,
      enrollmentCount: 12,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
      _destroy: false
    },

    // === KHÓA 2: Python cho Data Science ===
    {
      title: 'Python cho Phân tích Dữ liệu & Khoa học Dữ liệu',
      slug: 'python-phan-tich-du-lieu-khoa-hoc-du-lieu',
      description: `Khóa học Python chuyên sâu cho phân tích dữ liệu, sử dụng Pandas, NumPy, Matplotlib và Jupyter Notebook.

## Mục tiêu khóa học
- Thành thạo Python cơ bản đến trung bình
- Phân tích dữ liệu với Pandas và NumPy
- Trực quan hóa dữ liệu với Matplotlib/Seaborn
- Làm việc với dữ liệu thực tế từ doanh nghiệp

## Đối tượng
- Người đã có kiến thức cơ bản về lập trình
- Nhân viên văn phòng muốn nâng cao kỹ năng phân tích
- Người muốn chuyển sang ngành Data Analyst`,
      shortDescription: 'Học Python phân tích dữ liệu với Pandas, NumPy, Matplotlib từ cơ bản đến thực hành dự án.',
      thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
      categoryId: cnttCat.toString(),
      providerId: trainerId.toString(),
      providerName: 'Nguyễn Văn A',
      providerEmail: 'trainer.nguyenvana@example.com',
      duration: { value: 10, unit: DURATION_UNITS.WEEKS },
      schedule: 'Thứ 3, 5 — 19:00 đến 21:30',
      location: { type: LOCATION_TYPES.ONLINE },
      delivery_type: COURSE_DELIVERY_TYPES.VIDEO,
      funding_model: COURSE_FUNDING_MODELS.ISA,
      fee: 15000000,
      isFree: false,
      scholarshipEligibility: true,
      maxStudents: 25,
      currentStudents: 8,
      enrollmentStartDate: Date.now(),
      level: COURSE_LEVELS.INTERMEDIATE,
      skills: ['Python', 'Pandas', 'NumPy', 'Matplotlib', 'Jupyter Notebook', 'SQL', 'Excel'],
      prerequisites: ['Kiến thức cơ bản về lập trình', 'Toán THPT'],
      requirements: ['Máy tính cấu hình trung bình', 'Anaconda hoặc Python 3.10+'],
      syllabus: [
        { week: 1, title: 'Python cơ bản', content: 'Biến, kiểu dữ liệu, điều kiện, vòng lặp', duration: '2 buổi' },
        { week: 2, title: 'Hàm & Module', content: 'Định nghĩa hàm, import, package', duration: '2 buổi' },
        { week: 3, title: 'NumPy & Arrays', content: 'Mảng đa chiều, vectorization', duration: '2 buổi' },
        { week: 4, title: 'Pandas Series & DataFrame', content: 'Đọc dữ liệu, lọc, nhóm', duration: '3 buổi' },
        { week: 5, title: 'Làm sạch dữ liệu', content: 'Xử lý missing values, duplicates', duration: '3 buổi' },
        { week: 6, title: 'Trực quan hóa', content: 'Matplotlib, Seaborn, biểu đồ tương tác', duration: '3 buổi' },
        { week: 7, title: 'Phân tích thống kê', content: 'Mô tả dữ liệu, correlation, regression', duration: '3 buổi' },
        { week: 8, title: 'SQL cho Data Analyst', content: 'Truy vấn cơ bản đến nâng cao', duration: '3 buổi' },
        { week: 9, title: 'Project: Phân tích doanh thu', content: 'Dự án thực tế với dữ liệu doanh nghiệp', duration: '3 buổi' },
        { week: 10, title: 'Báo cáo & Dashboard', content: 'Trình bày kết quả, tạo dashboard', duration: '2 buổi' }
      ],
      certificate: 'Chứng chỉ hoàn thành Python cho Phân tích Dữ liệu',
      outcomes: ['Phân tích dataset thực tế với Python', 'Trực quan hóa dữ liệu chuyên nghiệp', 'Viết báo cáo phân tích', 'Sử dụng SQL cho truy vấn dữ liệu'],
      rating: { average: 4.9, count: 31 },
      status: COURSE_STATUS.APPROVED,
      approvedBy: trainers[1]._id.toString(),
      approvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      viewCount: 187,
      enrollmentCount: 8,
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
      _destroy: false
    },

    // === KHÓA 3: Digital Marketing ===
    {
      title: 'Digital Marketing toàn diện - Marketing Online từ A đến Z',
      slug: 'digital-marketing-toan-dien',
      description: `Khóa học Digital Marketing toàn diện, bao gồm SEO, Google Ads, Facebook Ads, Content Marketing và Analytics.

## Mục tiêu khóa học
- Hiểu toàn bộ hệ sinh thái Digital Marketing
- Chạy quảng cáo Google Ads và Facebook Ads hiệu quả
- Tối ưu SEO on-page và off-page
- Đo lường và phân tích hiệu quả marketing

## Đối tượng
- Chủ shop online, doanh nghiệp nhỏ
- Nhân viên marketing muốn nâng cao
- Người muốn trở thành Digital Marketer chuyên nghiệp`,
      shortDescription: 'Marketing online toàn diện: SEO, Google Ads, Facebook Ads, Content, Analytics. Học thực hành ngay.',
      thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
      categoryId: qtCat.toString(),
      providerId: trainers[1]._id.toString(),
      providerName: 'Trần Thị B',
      providerEmail: 'trainer.tranthib@example.com',
      duration: { value: 6, unit: DURATION_UNITS.WEEKS },
      schedule: 'Thứ 7 — 08:00 đến 12:00',
      location: { type: LOCATION_TYPES.OFFLINE, address: 'Tầng 5, 456 Lê Lợi, Quận 1, TP.HCM' },
      delivery_type: COURSE_DELIVERY_TYPES.OFFLINE,
      funding_model: COURSE_FUNDING_MODELS.ENTERPRISE_FUNDED,
      fee: 0,
      isFree: true,
      scholarshipEligibility: true,
      maxStudents: 35,
      currentStudents: 22,
      enrollmentStartDate: Date.now(),
      level: COURSE_LEVELS.BEGINNER,
      skills: ['SEO', 'Google Ads', 'Facebook Ads', 'Content Marketing', 'Google Analytics', 'Email Marketing'],
      prerequisites: ['Sử dụng mạng xã hội', 'Biết sử dụng máy tính'],
      requirements: ['Điện thoại thông minh', 'Tài khoản Google, Facebook'],
      syllabus: [
        { week: 1, title: 'Tổng quan Digital Marketing', content: 'Các kênh marketing online, xây dựng chiến lược', duration: '1 buổi' },
        { week: 2, title: 'Google Ads & SEO', content: 'Tạo chiến dịch Google Ads, tối ưu SEO cơ bản', duration: '2 buổi' },
        { week: 3, title: 'Facebook & Instagram Ads', content: 'Audience targeting, retargeting, lookalike', duration: '2 buổi' },
        { week: 4, title: 'Content Marketing', content: 'Viết content viral, kế hoạch nội dung', duration: '2 buổi' },
        { week: 5, title: 'Email & Influencer Marketing', content: 'Build list, nurturing, đo lường ROI', duration: '2 buổi' },
        { week: 6, title: 'Analytics & Project', content: 'Google Analytics, dashboard, dự án cuối khóa', duration: '2 buổi' }
      ],
      certificate: 'Chứng chỉ Digital Marketing toàn diện',
      outcomes: ['Chạy quảng cáo Google/Facebook hiệu quả', 'Tối ưu SEO website', 'Xây dựng chiến lược content', 'Đo lường ROI marketing'],
      rating: { average: 4.5, count: 62 },
      status: COURSE_STATUS.APPROVED,
      approvedBy: trainers[1]._id.toString(),
      approvedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      viewCount: 412,
      enrollmentCount: 22,
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
      _destroy: false
    },

    // === KHÓA 4: Nông nghiệp công nghệ cao ===
    {
      title: 'Nông nghiệp công nghệ cao - Trồng rau hữu cơ theo tiêu chuẩn VietGAP',
      slug: 'nong-nghiep-cong-nghe-cao-trong-rau-huu-co',
      description: `Khóa học thực hành trồng rau hữu cơ theo tiêu chuẩn VietGAP, ứng dụng IoT trong nông nghiệp.

## Mục tiêu khóa học
- Nắm vững quy trình trồng rau hữu cơ theo tiêu chuẩn
- Ứng dụng IoT và tự động hóa trong canh tác
- Xây dựng trang trại nhỏ có thu nhập ổn định
- Hiểu chuỗi giá trị nông sản

## Đối tượng
- Nông dân muốn nâng cao thu nhập
- Người có đất đai muốn khởi nghiệp nông nghiệp
- Doanh nghiệp muốn đào tạo nhân sự nông nghiệp`,
      shortDescription: 'Trồng rau hữu cơ theo VietGAP, ứng dụng IoT. Thực hành ngay trên farm mẫu.',
      thumbnail: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800',
      categoryId: nnCat.toString(),
      providerId: trainers[1]._id.toString(),
      providerName: 'Trần Thị B',
      providerEmail: 'trainer.tranthib@example.com',
      duration: { value: 12, unit: DURATION_UNITS.WEEKS },
      schedule: 'Chủ nhật — 07:00 đến 11:00',
      location: { type: LOCATION_TYPES.OFFLINE, address: 'Farm mẫu Restart-35, 789 Đường Nông thôn, Củ Chi, TP.HCM' },
      delivery_type: COURSE_DELIVERY_TYPES.OFFLINE,
      funding_model: COURSE_FUNDING_MODELS.FREE,
      fee: 0,
      isFree: true,
      scholarshipEligibility: true,
      maxStudents: 20,
      currentStudents: 15,
      enrollmentStartDate: Date.now(),
      level: COURSE_LEVELS.BEGINNER,
      skills: ['Trồng rau hữu cơ', 'VietGAP', 'IoT Nông nghiệp', 'Phân bón hữu cơ', 'Phòng trừ sinh học'],
      prerequisites: ['Sức khỏe tốt', 'Chịu khổ, yêu nông nghiệp'],
      requirements: ['Bảo hộ, găng tay nông nghiệp', 'Xe đưa đón (tùy khu vực)'],
      syllabus: [
        { week: 1, title: 'Giới thiệu nông nghiệp hữu cơ', content: 'Khái niệm, lợi ích, thị trường', duration: '1 buổi' },
        { week: 2, title: 'Chuẩn bị đất & Giống', content: 'Phân hữu cơ, chọn giống rau', duration: '2 buổi' },
        { week: 3, title: 'Gieo trồng & Chăm sóc', content: 'Kỹ thuật gieo, tưới tiêu, bón phân', duration: '2 buổi' },
        { week: 4, title: 'Phòng trừ sâu bệnh', content: 'Phương pháp sinh học, IPM', duration: '2 buổi' },
        { week: 5, title: 'IoT trong nông nghiệp', content: 'Cảm biến độ ẩm, nhiệt độ, tưới tự động', duration: '2 buổi' },
        { week: 6, title: 'Thu hoạch & Bảo quản', content: 'Quy trình thu hoạch đúng cách', duration: '1 buổi' },
        { week: 7, title: 'Tiêu chuẩn VietGAP', content: 'Các tiêu chí cần đạt, quy trình chứng nhận', duration: '2 buổi' },
        { week: 8, title: 'Thực hành tổng hợp', content: 'Trồng rau từ đầu đến thu hoạch', duration: '2 buổi' },
        { week: 9, title: 'Xây dựng trang trại nhỏ', content: 'Lập kế hoạch, tính toán chi phí', duration: '2 buổi' },
        { week: 10, title: 'Marketing nông sản', content: 'Bán hàng online, kết nối thị trường', duration: '2 buổi' },
        { week: 11, title: 'Tài chính nông nghiệp', content: 'Quản lý chi phí, tính lợi nhuận', duration: '2 buổi' },
        { week: 12, title: 'Đánh giá & Triển lãm', content: 'Trình bày dự án, kết nối doanh nghiệp', duration: '2 buổi' }
      ],
      certificate: 'Chứng chỉ Nông nghiệp Công nghệ cao & VietGAP',
      outcomes: ['Trồng rau hữu cơ đạt chuẩn VietGAP', 'Ứng dụng IoT trong canh tác', 'Xây dựng trang trại nhỏ có thu nhập', 'Kết nối thị trường tiêu thụ'],
      rating: { average: 4.8, count: 27 },
      status: COURSE_STATUS.APPROVED,
      approvedBy: trainers[1]._id.toString(),
      approvedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      viewCount: 156,
      enrollmentCount: 15,
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
      _destroy: false
    },

    // === KHÓA 5: Kỹ năng mềm & Khởi nghiệp ===
    {
      title: 'Kỹ năng mềm cho người lao động - Giao tiếp, Thuyết trình & Khởi nghiệp',
      slug: 'ky-nang-mem-giao-tiep-thuyet-trinh-khoi-nghiep',
      description: `Khóa học toàn diện về kỹ năng mềm thiết yếu cho người lao động tái hòa nhập thị trường.

## Mục tiêu khóa học
- Giao tiếp chuyên nghiệp trong môi trường làm việc
- Thuyết trình và pitching ý tưởng
- Quản lý thời gian và năng suất cá nhân
- Tư duy khởi nghiệp và lập kế hoạch kinh doanh`,
      shortDescription: 'Giao tiếp, thuyết trình, quản lý thời gian, tư duy khởi nghiệp - kỹ năng thiết yếu cho thế kỷ 21.',
      thumbnail: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800',
      categoryId: knCat.toString(),
      providerId: trainers[0]._id.toString(),
      providerName: 'Nguyễn Văn A',
      providerEmail: 'trainer.nguyenvana@example.com',
      duration: { value: 4, unit: DURATION_UNITS.WEEKS },
      schedule: 'Thứ 4 — 18:30 đến 21:00',
      location: { type: LOCATION_TYPES.HYBRID, address: 'Tầng 2, 789 Pasteur, Quận 1, TP.HCM', link: 'https://meet.google.com/pqr-stuv-wxy' },
      delivery_type: COURSE_DELIVERY_TYPES.LIVE,
      funding_model: COURSE_FUNDING_MODELS.FREE,
      fee: 0,
      isFree: true,
      scholarshipEligibility: true,
      maxStudents: 40,
      currentStudents: 33,
      enrollmentStartDate: Date.now(),
      level: COURSE_LEVELS.BEGINNER,
      skills: ['Giao tiếp', 'Thuyết trình', 'Quản lý thời gian', 'Tư duy thiết kế', 'Business Model Canvas'],
      prerequisites: ['Tốt nghiệp THPT trở lên', 'Mong muốn phát triển bản thân'],
      requirements: ['Máy tính/điện thoại có camera'],
      syllabus: [
        { week: 1, title: 'Giao tiếp hiệu quả', content: 'Nghe tích cực, đặt câu hỏi, xử lý xung đột', duration: '1 buổi' },
        { week: 2, title: 'Thuyết trình chuyên nghiệp', content: 'Cấu trúc bài thuyết trình, kỹ thuật diễn đạt', duration: '1 buổi' },
        { week: 3, title: 'Quản lý thời gian', content: 'Pomodoro, Eisenhower matrix, habit tracking', duration: '1 buổi' },
        { week: 4, title: 'Khởi nghiệp & Business Model', content: 'Canvas, validate ý tưởng, pitch deck', duration: '1 buổi' }
      ],
      certificate: 'Chứng chỉ Kỹ năng mềm & Khởi nghiệp',
      outcomes: ['Giao tiếp hiệu quả trong công việc', 'Thuyết trình thuyết phục', 'Quản lý thời gian khoa học', 'Lập kế hoạch kinh doanh cơ bản'],
      rating: { average: 4.6, count: 89 },
      status: COURSE_STATUS.APPROVED,
      approvedBy: trainers[1]._id.toString(),
      approvedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      viewCount: 523,
      enrollmentCount: 33,
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
      _destroy: false
    },

    // === KHÓA 6: Dự thảo - Đang chờ duyệt ===
    {
      title: 'Node.js & Express - Xây dựng REST API chuyên nghiệp',
      slug: 'nodejs-express-rest-api',
      description: 'Khóa học Node.js và Express để xây dựng REST API backend, kết nối database MongoDB, JWT authentication.',
      shortDescription: 'Học Node.js & Express xây dựng REST API, MongoDB, JWT từ cơ bản đến production-ready.',
      thumbnail: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=800',
      categoryId: cnttCat.toString(),
      providerId: trainerId.toString(),
      providerName: 'Nguyễn Văn A',
      providerEmail: 'trainer.nguyenvana@example.com',
      duration: { value: 8, unit: DURATION_UNITS.WEEKS },
      location: { type: LOCATION_TYPES.ONLINE },
      delivery_type: COURSE_DELIVERY_TYPES.VIDEO,
      funding_model: COURSE_FUNDING_MODELS.ISA,
      fee: 12000000,
      isFree: false,
      scholarshipEligibility: true,
      maxStudents: 20,
      currentStudents: 0,
      enrollmentStartDate: null,
      level: COURSE_LEVELS.INTERMEDIATE,
      skills: ['Node.js', 'Express', 'MongoDB', 'REST API', 'JWT', 'Postman'],
      prerequisites: ['Biết JavaScript cơ bản'],
      requirements: ['Node.js 18+', 'VS Code'],
      syllabus: [],
      outcomes: [],
      rating: { average: 0, count: 0 },
      status: COURSE_STATUS.PENDING,
      approvedBy: null,
      approvedAt: null,
      viewCount: 45,
      enrollmentCount: 0,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
      _destroy: false
    }
  ]

  const created = []
  for (const course of courses) {
    const result = await DB().collection('courses').insertOne(course)
    created.push({ _id: result.insertedId, ...course })
    console.log(`  ✓ Khóa học: "${course.title.substring(0, 50)}..." (status: ${course.status})`)
  }
  return created
}

// ============ 4. TẠO SCHEDULE (CHI TIẾT BÀI HỌC) ============
async function seedSchedules(courses) {
  console.log('\n[4/5] Đang tạo chi tiết khóa học (schedules)...')

  const webCourse = courses.find(c => c.slug === 'lap-trinh-web-fullstack-html-css-javascript')
  const pythonCourse = courses.find(c => c.slug === 'python-phan-tich-du-lieu-khoa-hoc-du-lieu')
  const digitalCourse = courses.find(c => c.slug === 'digital-marketing-toan-dien')
  const agriCourse = courses.find(c => c.slug === 'nong-nghiep-cong-nghe-cao-trong-rau-huu-co')
  const softCourse = courses.find(c => c.slug === 'ky-nang-mem-giao-tiep-thuyet-trinh-khoi-nghiep')

  // --- Schedule cho Web Full-stack ---
  if (webCourse) {
    const scheduleData = {
      courseId: webCourse._id.toString(),
      providerId: webCourse.providerId,
      title: 'Lịch học Web Full-stack - Lớp T6-CN',
      description: 'Lịch học chi tiết cho khóa Lập trình Web Full-stack với lịch học 3 buổi/tuần',
      status: SCHEDULE_STATUS.PUBLISHED,
      sessions: [
        // Week 1
        {
          sessionNumber: 1,
          title: 'Giới thiệu Web & HTML5',
          date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Thứ 2 tuần sau
          startTime: '18:00',
          endTime: '21:00',
          duration: 180,
          topic: 'HTML5 semantic, cấu trúc trang web',
          instructorId: webCourse.providerId,
          location: { type: LOCATION_TYPES.HYBRID, address: webCourse.location.address, link: webCourse.location.link },
          status: SESSION_STATUS.SCHEDULED,
          attendance: [],
          materials: [
            'https://docs.google.com/presentation/d/abc123',
            'https://github.com/restart35/web-basic'
          ],
          notes: 'Sinh viên chuẩn bị laptop đã cài VS Code'
        },
        {
          sessionNumber: 2,
          title: 'Thực hành HTML & Semantics',
          date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // Thứ 4
          startTime: '18:00',
          endTime: '21:00',
          duration: 180,
          topic: 'Thực hành tạo trang web với HTML5',
          instructorId: webCourse.providerId,
          location: { type: LOCATION_TYPES.HYBRID, address: webCourse.location.address, link: webCourse.location.link },
          status: SESSION_STATUS.SCHEDULED,
          attendance: [],
          materials: ['https://github.com/restart35/web-basic/week1'],
          notes: 'Nộp bài tập tuần 1'
        },
        {
          sessionNumber: 3,
          title: 'CSS3 cơ bản',
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Thứ 6
          startTime: '18:00',
          endTime: '21:00',
          duration: 180,
          topic: 'Selector, Box Model, Flexbox',
          instructorId: webCourse.providerId,
          location: { type: LOCATION_TYPES.HYBRID, address: webCourse.location.address, link: webCourse.location.link },
          status: SESSION_STATUS.SCHEDULED,
          attendance: [],
          materials: ['https://css-tricks.com/snippets/css/a-guide-to-flexbox'],
          notes: ''
        },
        // Week 2
        {
          sessionNumber: 4,
          title: 'CSS Grid & Layout nâng cao',
          date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          startTime: '18:00',
          endTime: '21:00',
          duration: 180,
          topic: 'Grid layout, responsive layout',
          instructorId: webCourse.providerId,
          location: { type: LOCATION_TYPES.HYBRID, address: webCourse.location.address, link: webCourse.location.link },
          status: SESSION_STATUS.SCHEDULED,
          attendance: [],
          materials: [],
          notes: 'Quiz tuần 2'
        },
        {
          sessionNumber: 5,
          title: 'JavaScript cơ bản - Biến & Hàm',
          date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
          startTime: '18:00',
          endTime: '21:00',
          duration: 180,
          topic: 'Variables, functions, scope, arrow functions',
          instructorId: webCourse.providerId,
          location: { type: LOCATION_TYPES.HYBRID, address: webCourse.location.address, link: webCourse.location.link },
          status: SESSION_STATUS.SCHEDULED,
          attendance: [],
          materials: [],
          notes: ''
        },
        {
          sessionNumber: 6,
          title: 'JavaScript - Arrays & Objects',
          date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          startTime: '18:00',
          endTime: '21:00',
          duration: 180,
          topic: 'Array methods, object destructuring, spread operator',
          instructorId: webCourse.providerId,
          location: { type: LOCATION_TYPES.HYBRID, address: webCourse.location.address, link: webCourse.location.link },
          status: SESSION_STATUS.SCHEDULED,
          attendance: [],
          materials: [],
          notes: ''
        },
        // Week 3
        {
          sessionNumber: 7,
          title: 'DOM Manipulation',
          date: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000),
          startTime: '18:00',
          endTime: '21:00',
          duration: 180,
          topic: 'querySelector, createElement, appendChild',
          instructorId: webCourse.providerId,
          location: { type: LOCATION_TYPES.HYBRID, address: webCourse.location.address, link: webCourse.location.link },
          status: SESSION_STATUS.SCHEDULED,
          attendance: [],
          materials: [],
          notes: ''
        },
        {
          sessionNumber: 8,
          title: 'Events & Interactivity',
          date: new Date(Date.now() + 19 * 24 * 60 * 60 * 1000),
          startTime: '18:00',
          endTime: '21:00',
          duration: 180,
          topic: 'addEventListener, event object, delegation',
          instructorId: webCourse.providerId,
          location: { type: LOCATION_TYPES.HYBRID, address: webCourse.location.address, link: webCourse.location.link },
          status: SESSION_STATUS.SCHEDULED,
          attendance: [],
          materials: [],
          notes: ''
        },
        {
          sessionNumber: 9,
          title: 'Responsive Design & Media Queries',
          date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
          startTime: '18:00',
          endTime: '21:00',
          duration: 180,
          topic: 'Mobile-first, breakpoints, responsive images',
          instructorId: webCourse.providerId,
          location: { type: LOCATION_TYPES.HYBRID, address: webCourse.location.address, link: webCourse.location.link },
          status: SESSION_STATUS.SCHEDULED,
          attendance: [],
          materials: [],
          notes: 'Midterm project assigned'
        }
      ],
      totalSessions: 9,
      completedSessions: 0,
      nextSession: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      reminders: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      _destroy: false
    }

    await DB().collection('schedules').insertOne(scheduleData)
    console.log(`  ✓ Schedule: "${webCourse.title.substring(0, 40)}..." - ${scheduleData.sessions.length} sessions`)
  }

  // --- Schedule cho Python Data Science ---
  if (pythonCourse) {
    const scheduleData = {
      courseId: pythonCourse._id.toString(),
      providerId: pythonCourse.providerId,
      title: 'Lịch học Python Data Science - Lớp T3-T5',
      description: 'Lịch chi tiết khóa Python cho Phân tích Dữ liệu',
      status: SCHEDULE_STATUS.PUBLISHED,
      sessions: [
        {
          sessionNumber: 1,
          title: 'Python cơ bản - Biến & Kiểu dữ liệu',
          date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Thứ 3
          startTime: '19:00',
          endTime: '21:30',
          duration: 150,
          topic: 'Variables, data types, operators',
          instructorId: pythonCourse.providerId,
          location: { type: LOCATION_TYPES.ONLINE, link: pythonCourse.location.link },
          status: SESSION_STATUS.SCHEDULED,
          attendance: [],
          materials: ['https://jupyter.org/install'],
          notes: 'Cài Anaconda trước buổi học'
        },
        {
          sessionNumber: 2,
          title: 'Control Flow & Functions',
          date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // Thứ 5
          startTime: '19:00',
          endTime: '21:30',
          duration: 150,
          topic: 'if/else, loops, functions, lambda',
          instructorId: pythonCourse.providerId,
          location: { type: LOCATION_TYPES.ONLINE, link: pythonCourse.location.link },
          status: SESSION_STATUS.SCHEDULED,
          attendance: [],
          materials: [],
          notes: ''
        },
        {
          sessionNumber: 3,
          title: 'NumPy & Arrays',
          date: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
          startTime: '19:00',
          endTime: '21:30',
          duration: 150,
          topic: 'ndarray, broadcasting, vectorization',
          instructorId: pythonCourse.providerId,
          location: { type: LOCATION_TYPES.ONLINE, link: pythonCourse.location.link },
          status: SESSION_STATUS.SCHEDULED,
          attendance: [],
          materials: [],
          notes: 'Assignment 1 due'
        },
        {
          sessionNumber: 4,
          title: 'Pandas DataFrame - Đọc & Lọc dữ liệu',
          date: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000),
          startTime: '19:00',
          endTime: '21:30',
          duration: 150,
          topic: 'read_csv, loc, iloc, groupby',
          instructorId: pythonCourse.providerId,
          location: { type: LOCATION_TYPES.ONLINE, link: pythonCourse.location.link },
          status: SESSION_STATUS.SCHEDULED,
          attendance: [],
          materials: [],
          notes: ''
        }
      ],
      totalSessions: 4,
      completedSessions: 0,
      nextSession: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      reminders: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      _destroy: false
    }

    await DB().collection('schedules').insertOne(scheduleData)
    console.log(`  ✓ Schedule: "${pythonCourse.title.substring(0, 35)}..." - ${scheduleData.sessions.length} sessions`)
  }

  // --- Schedule cho Digital Marketing ---
  if (digitalCourse) {
    const scheduleData = {
      courseId: digitalCourse._id.toString(),
      providerId: digitalCourse.providerId,
      title: 'Lịch học Digital Marketing - Lớp Sáng Thứ 7',
      description: 'Lịch chi tiết khóa Digital Marketing toàn diện',
      status: SCHEDULE_STATUS.PUBLISHED,
      sessions: [
        {
          sessionNumber: 1,
          title: 'Tổng quan Digital Marketing & Chiến lược',
          date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Thứ 7
          startTime: '08:00',
          endTime: '12:00',
          duration: 240,
          topic: 'Các kênh DM, buyer persona, customer journey',
          instructorId: digitalCourse.providerId,
          location: { type: LOCATION_TYPES.OFFLINE, address: digitalCourse.location.address },
          status: SESSION_STATUS.SCHEDULED,
          attendance: [],
          materials: ['https://drive.google.com/shared/digital-strategy'],
          notes: 'Mang laptop để thực hành'
        },
        {
          sessionNumber: 2,
          title: 'Google Ads & SEO',
          date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
          startTime: '08:00',
          endTime: '12:00',
          duration: 240,
          topic: 'Google Search Ads, keyword research, SEO basics',
          instructorId: digitalCourse.providerId,
          location: { type: LOCATION_TYPES.OFFLINE, address: digitalCourse.location.address },
          status: SESSION_STATUS.SCHEDULED,
          attendance: [],
          materials: [],
          notes: ''
        },
        {
          sessionNumber: 3,
          title: 'Facebook & Instagram Ads',
          date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          startTime: '08:00',
          endTime: '12:00',
          duration: 240,
          topic: 'Audience targeting, campaign setup, retargeting',
          instructorId: digitalCourse.providerId,
          location: { type: LOCATION_TYPES.OFFLINE, address: digitalCourse.location.address },
          status: SESSION_STATUS.SCHEDULED,
          attendance: [],
          materials: [],
          notes: 'Quiz Facebook Ads'
        }
      ],
      totalSessions: 3,
      completedSessions: 0,
      nextSession: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      reminders: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      _destroy: false
    }

    await DB().collection('schedules').insertOne(scheduleData)
    console.log(`  ✓ Schedule: "${digitalCourse.title.substring(0, 35)}..." - ${scheduleData.sessions.length} sessions`)
  }

  // --- Schedule cho Nông nghiệp ---
  if (agriCourse) {
    const scheduleData = {
      courseId: agriCourse._id.toString(),
      providerId: agriCourse.providerId,
      title: 'Lịch thực hành Nông nghiệp - Chủ nhật sáng',
      description: 'Lịch thực hành trồng rau hữu cơ trên farm mẫu',
      status: SCHEDULE_STATUS.PUBLISHED,
      sessions: [
        {
          sessionNumber: 1,
          title: 'Thực hành: Chuẩn bị đất & Gieo hạt',
          date: new Date(Date.now() + 0 * 24 * 60 * 60 * 1000), // Hôm nay
          startTime: '07:00',
          endTime: '11:00',
          duration: 240,
          topic: 'Xới đất, trộn phân hữu cơ, gieo hạt rau cải',
          instructorId: agriCourse.providerId,
          location: { type: LOCATION_TYPES.OFFLINE, address: agriCourse.location.address },
          status: SESSION_STATUS.IN_PROGRESS,
          attendance: [],
          materials: ['Bảo hộ lao động', 'Dụng cụ làm vườn'],
          notes: 'Gặp tại cổng farm lúc 07:00'
        },
        {
          sessionNumber: 2,
          title: 'Thực hành: Chăm sóc & Tưới tiêu',
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Chủ nhật tuần sau
          startTime: '07:00',
          endTime: '11:00',
          duration: 240,
          topic: 'Kỹ thuật tưới, bón phân hữu cơ',
          instructorId: agriCourse.providerId,
          location: { type: LOCATION_TYPES.OFFLINE, address: agriCourse.location.address },
          status: SESSION_STATUS.SCHEDULED,
          attendance: [],
          materials: [],
          notes: ''
        },
        {
          sessionNumber: 3,
          title: 'Thực hành: IoT - Cảm biến độ ẩm',
          date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          startTime: '07:00',
          endTime: '11:00',
          duration: 240,
          topic: 'Lắp đặt và cấu hình cảm biến độ ẩm đất',
          instructorId: agriCourse.providerId,
          location: { type: LOCATION_TYPES.OFFLINE, address: agriCourse.location.address },
          status: SESSION_STATUS.SCHEDULED,
          attendance: [],
          materials: ['Arduino/ESP32 kit'],
          notes: 'Assignment IoT project'
        }
      ],
      totalSessions: 3,
      completedSessions: 0,
      nextSession: new Date(),
      reminders: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      _destroy: false
    }

    await DB().collection('schedules').insertOne(scheduleData)
    console.log(`  ✓ Schedule: "${agriCourse.title.substring(0, 35)}..." - ${scheduleData.sessions.length} sessions`)
  }

  return []
}

// ============ 5. TẠO WORKER PROFILES ============
async function seedWorkerProfiles(workers) {
  console.log('\n[5/5] Đang tạo worker profiles...')

  const profiles = [
    {
      userId: workers[0]._id.toString(),
      currentStep: 10,
      isCompleted: true,
      basicInfo: {
        age: 42,
        gender: 'female',
        province: 'TP.HCM',
        district: 'Quận 12',
        education: 'university',
        maritalStatus: 'single',
        phone: '0903000004',
        address: '123 Đường số 5, Quận 12, TP.HCM'
      },
      employmentHistory: [
        {
          occupation: 'Nhân viên bán hàng',
          companyName: 'Cửa hàng ABC Mart',
          jobType: 'full-time',
          duration: 60,
          skills: ['Chăm sóc khách hàng', 'Bán hàng']
        }
      ],
      barriers: { health: false, family: true, techGap: true, location: false, other: false },
      aspirations: {
        targetJob: { titleVi: 'Nhân viên kỹ thuật', titleEn: 'Technical Staff' },
        targetJobNoPreference: false,
        targetSalary: 8000000,
        targetProvince: 'TP.HCM'
      },
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    },
    {
      userId: workers[1]._id.toString(),
      currentStep: 10,
      isCompleted: true,
      basicInfo: {
        age: 48,
        gender: 'male',
        province: 'Bình Dương',
        district: 'Thuận An',
        education: 'high_school',
        maritalStatus: 'married',
        phone: '0903000005',
        address: '456 Khu công nghiệp, Thuận An, Bình Dương'
      },
      employmentHistory: [
        {
          occupation: 'Công nhân sản xuất',
          companyName: 'Nhà máy XYZ',
          jobType: 'full-time',
          duration: 120,
          skills: ['Vận hành máy móc', 'Kiểm tra chất lượng']
        }
      ],
      barriers: { health: true, family: false, techGap: true, location: true, other: false },
      aspirations: {
        targetJob: { titleVi: 'Kỹ thuật viên', titleEn: 'Technician' },
        targetJobNoPreference: false,
        targetSalary: 10000000,
        targetProvince: 'Bình Dương'
      },
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    }
  ]

  for (const profile of profiles) {
    await DB().collection('worker_profiles').insertOne({
      ...profile,
      _destroy: false
    })
    console.log(`  ✓ Worker profile: ${profile.userId.substring(0, 10)}...`)
  }
}

// ============ 6. TẠO VIDEO LESSONS ============
async function seedVideoLessons(courses) {
  console.log('\n[6/6] Đang tạo chi tiết video lessons...')

  // Lấy khóa học video (Python - khóa 2, delivery_type = video)
  const pythonCourse = courses.find(c =>
    c.delivery_type === COURSE_DELIVERY_TYPES.VIDEO && c.status === COURSE_STATUS.APPROVED
  )

  if (!pythonCourse) {
    console.log('  ⚠ Không tìm thấy khóa học video, bỏ qua video lessons')
    return
  }

  // Video lessons cho khóa Python Data Science (10 tuần, ~25 videos)
  const pythonLessons = [
    // Week 1: Python cơ bản
    { week: 1, module: 'Tuần 1: Python cơ bản', order: 0, title: 'Giới thiệu Python - Cài đặt môi trường Anaconda', duration: 720, description: 'Hướng dẫn cài đặt Anaconda, Jupyter Notebook, và chạy chương trình Python đầu tiên' },
    { week: 1, module: 'Tuần 1: Python cơ bản', order: 1, title: 'Biến, kiểu dữ liệu và toán tử', duration: 960, description: 'Tìm hiểu các kiểu dữ liệu cơ bản: int, float, str, bool. Toán tử số học và so sánh' },
    { week: 1, module: 'Tuần 1: Python cơ bản', order: 2, title: 'Câu lệnh điều kiện if/else', duration: 840, description: 'Rẽ nhánh logic với if, elif, else. Ví dụ thực tế về điều kiện trong kinh doanh' },
    { week: 1, module: 'Tuần 1: Python cơ bản', order: 3, title: 'Vòng lặp for và while', duration: 900, description: 'Lặp với for (duyệt danh sách) và while (điều kiện). Break và continue' },
    { week: 1, module: 'Tuần 1: Python cơ bản', order: 4, title: '[Thực hành] Bài tập Python cơ bản', duration: 1200, description: 'Giải 5 bài tập tổng hợp: tính tiền điện, phân loại học sinh, đếm số' },

    // Week 2: Hàm & Module
    { week: 2, module: 'Tuần 2: Hàm & Module', order: 0, title: 'Định nghĩa và gọi hàm', duration: 780, description: 'Cú pháp def, tham số, giá trị trả về. Hàm không trả về vs có trả về' },
    { week: 2, module: 'Tuần 2: Hàm & Module', order: 1, title: 'Tham số mặc định và *args, **kwargs', duration: 900, description: 'Default arguments, *args (tuple), **kwargs (dict). Khi nào dùng gì' },
    { week: 2, module: 'Tuần 2: Hàm & Module', order: 2, title: 'Scope và Closure', duration: 720, description: 'Local, global, nonlocal. Khái niệm closure và ứng dụng thực tế' },
    { week: 2, module: 'Tuần 2: Hàm & Module', order: 3, title: 'Module và import', duration: 660, description: 'Tạo module .py, import, from...import. Tổ chức code theo package' },
    { week: 2, module: 'Tuần 2: Hàm & Module', order: 4, title: '[Thực hành] Viết hàm phân tích doanh thu', duration: 1080, description: 'Áp dụng: viết hàm tính doanh thu, lợi nhuận, tăng trưởng theo tháng' },

    // Week 3: NumPy & Arrays
    { week: 3, module: 'Tuần 3: NumPy & Arrays', order: 0, title: 'Giới thiệu NumPy - Tại sao cần mảng số', duration: 600, description: 'So sánh list Python với NumPy array. Hiệu năng vectorization' },
    { week: 3, module: 'Tuần 3: NumPy & Arrays', order: 1, title: 'Tạo mảng và indexing', duration: 1020, description: 'np.array, np.arange, np.linspace. Truy cập phần tử, slicing 1D và 2D' },
    { week: 3, module: 'Tuần 3: NumPy & Arrays', order: 2, title: 'Phép toán vectorization', duration: 900, description: 'Broadcasting, phép toán element-wise. So sánh, logic, toán học trên mảng' },
    { week: 3, module: 'Tuần 3: NumPy & Arrays', order: 3, title: 'Thống kê cơ bản với NumPy', duration: 840, description: 'np.mean, np.median, np.std, np.sum. Axis và reshape' },
    { week: 3, module: 'Tuần 3: NumPy & Arrays', order: 4, title: '[Thực hành] Xử lý dữ liệu bán lẻ', duration: 1200, description: 'Dùng NumPy phân tích doanh số 12 tháng: tổng, trung bình, xu hướng' },

    // Week 4: Pandas Series & DataFrame
    { week: 4, module: 'Tuần 4: Pandas Series & DataFrame', order: 0, title: 'Giới thiệu Pandas - DataFrame là gì', duration: 660, description: 'Series vs DataFrame. Đọc dữ liệu từ CSV, Excel, JSON' },
    { week: 4, module: 'Tuần 4: Pandas Series & DataFrame', order: 1, title: 'Khám phá DataFrame', duration: 960, description: '.head(), .tail(), .info(), .describe(). Kiểm tra kiểu dữ liệu, missing values' },
    { week: 4, module: 'Tuần 4: Pandas Series & DataFrame', order: 2, title: 'Chọn cột và lọc hàng', duration: 1020, description: 'df[column], df.loc, df.iloc. Boolean indexing, query() method' },
    { week: 4, module: 'Tuần 4: Pandas Series & DataFrame', order: 3, title: 'Sắp xếp và nhóm dữ liệu - groupby', duration: 1080, description: '.sort_values(), .groupby().agg(). Tính sum, mean, count theo nhóm' },
    { week: 4, module: 'Tuần 4: Pandas Series & DataFrame', order: 4, title: '[Thực hành] Phân tích khách hàng', duration: 1200, description: 'Dataset khách hàng: lọc theo độ tuổi, nhóm theo khu vực, tính tổng chi tiêu' },

    // Week 5: Làm sạch dữ liệu
    { week: 5, module: 'Tuần 5: Làm sạch dữ liệu', order: 0, title: 'Xử lý missing values', duration: 900, description: '.isnull(), .fillna(), .dropna(). Imputation strategies: mean, median, mode' },
    { week: 5, module: 'Tuần 5: Làm sạch dữ liệu', order: 1, title: 'Xử lý duplicates và outliers', duration: 840, description: '.duplicated(), .drop_duplicates(). Phát hiện outliers bằng IQR và Z-score' },
    { week: 5, module: 'Tuần 5: Làm sạch dữ liệu', order: 2, title: 'Chuyển đổi kiểu dữ liệu', duration: 720, description: '.astype(), pd.to_datetime(). Parse ngày tháng, chuẩn hóa chuỗi' },
    { week: 5, module: 'Tuần 5: Làm sạch dữ liệu', order: 3, title: 'Chuẩn hóa và mã hóa dữ liệu', duration: 960, description: 'MinMaxScaler, StandardScaler. Label encoding, one-hot encoding với Pandas' },
    { week: 5, module: 'Tuần 5: Làm sạch dữ liệu', order: 4, title: '[Thực hành] Làm sạch dataset HR', duration: 1200, description: 'Dataset nhân viên: xử lý 50+ dòng dirty data, outliers, missing values' },

    // Week 6: Trực quan hóa
    { week: 6, module: 'Tuần 6: Trực quan hóa dữ liệu', order: 0, title: 'Giới thiệu Matplotlib', duration: 720, description: 'Figure, axes, subplots. Line, bar, scatter plots. Custom màu, label, legend' },
    { week: 6, module: 'Tuần 6: Trực quan hóa dữ liệu', order: 1, title: 'Biểu đồ tần suất và phân bố', duration: 900, description: 'Histogram, boxplot, KDE. Hiểu phân bố dữ liệu và outliers trên biểu đồ' },
    { week: 6, module: 'Tuần 6: Trực quan hóa dữ liệu', order: 2, title: 'Biểu đồ tương quan và heatmap', duration: 840, description: 'Correlation matrix, heatmap với Seaborn. Nhận diện features quan trọng' },
    { week: 6, module: 'Tuần 6: Trực quan hóa dữ liệu', order: 3, title: 'Dashboard với nhiều biểu đồ', duration: 1080, description: 'GridSpec, subplot2grid. Tạo dashboard 2x2 với nhiều loại biểu đồ' },
    { week: 6, module: 'Tuần 6: Trực quan hóa dữ liệu', order: 4, title: '[Thực hành] Dashboard phân tích bán hàng', duration: 1200, description: 'Tạo dashboard 4 biểu đồ: doanh thu theo tháng, top sản phẩm, heatmap, trend' },

    // Week 7: Phân tích thống kê
    { week: 7, module: 'Tuần 7: Phân tích thống kê', order: 0, title: 'Thống kê mô tả nâng cao', duration: 960, description: 'Phân vị (quartile), skewness, kurtosis. Interpreting dữ liệu thực tế' },
    { week: 7, module: 'Tuần 7: Phân tích thống kê', order: 1, title: 'Correlation và Regression', duration: 1080, description: 'Pearson vs Spearman. Linear regression đơn giản với Scikit-learn' },
    { week: 7, module: 'Tuần 7: Phân tích thống kê', order: 2, title: 'Kiểm định giả thuyết', duration: 840, description: 'T-test, Chi-square. P-value và ý nghĩa thống kê trong kinh doanh' },
    { week: 7, module: 'Tuần 7: Phân tích thống kê', order: 3, title: 'Time series analysis cơ bản', duration: 900, description: 'DatetimeIndex, resampling, rolling average. Phát hiện xu hướng mùa vụ' },

    // Week 8: SQL cho Data Analyst
    { week: 8, module: 'Tuần 8: SQL cho Data Analyst', order: 0, title: 'SQL cơ bản - SELECT, WHERE, ORDER', duration: 840, description: 'Giới thiệu SQL. Truy vấn cơ bản với SQLite trong Python' },
    { week: 8, module: 'Tuần 8: SQL cho Data Analyst', order: 1, title: 'JOIN và GROUP BY', duration: 1020, description: 'INNER, LEFT JOIN. Aggregation với GROUP BY, HAVING' },
    { week: 8, module: 'Tuần 8: SQL cho Data Analyst', order: 2, title: 'Subquery và CTE', duration: 900, description: 'Nested queries, Common Table Expressions (WITH). Tối ưu truy vấn phức tạp' },

    // Week 9: Project thực tế
    { week: 9, module: 'Tuần 9: Project Phân tích Doanh thu', order: 0, title: 'Giới thiệu project - Bộ dữ liệu thực tế', duration: 480, description: 'Mô tả dataset bán hàng 3 năm: 50,000 dòng, 15 cột. Mục tiêu phân tích' },
    { week: 9, module: 'Tuần 9: Project Phân tích Doanh thu', order: 1, title: 'Bước 1: Khám phá và làm sạch dữ liệu', duration: 1200, description: 'Import, EDA, xử lý missing/duplicates. Tạo báo cáo chất lượng dữ liệu' },
    { week: 9, module: 'Tuần 9: Project Phân tích Doanh thu', order: 2, title: 'Bước 2: Phân tích chuyên sâu', duration: 1200, description: 'RFM analysis, cohort analysis. Segmentation khách hàng' },
    { week: 9, module: 'Tuần 9: Project Phân tích Doanh thu', order: 3, title: 'Bước 3: Trực quan hóa nâng cao', duration: 1080, description: 'Tạo 6 biểu đồ chuyên nghiệp: waterfall, treemap, sunburst' },

    // Week 10: Báo cáo & Dashboard
    { week: 10, module: 'Tuần 10: Báo cáo & Dashboard', order: 0, title: 'Tạo báo cáo với Pandas & Matplotlib', duration: 900, description: 'Pivot tables, summary statistics. Xuất báo cáo tự động ra PDF/Excel' },
    { week: 10, module: 'Tuần 10: Báo cáo & Dashboard', order: 1, title: 'Giới thiệu Dashboard với Python', duration: 1080, description: 'Streamlit cơ bản: tạo web app tương tác. Filters, charts, metrics' },
    { week: 10, module: 'Tuần 10: Báo cáo & Dashboard', order: 2, title: '[Final] Trình bày và tổng kết khóa học', duration: 900, description: 'Hướng dẫn trình bày kết quả phân tích. Checklist project cuối khóa. Tài liệu tham khảo' }
  ]

  // Tạo document lessons
  const videoDocs = pythonLessons.map(l => ({
    courseId: pythonCourse._id.toString(),
    weekNumber: l.week,
    moduleTitle: l.module,
    title: l.title,
    description: l.description,
    videoUrl: `https://www.youtube.com/watch?v=placeholder_${l.week}_${l.order}`,
    videoId: `py_${l.week}_${l.order}`,
    duration: l.duration,
    thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=225&fit=crop',
    order: l.order,
    transcript: '',
    slides: [],
    resources: [
      { title: 'Slide bài giảng', url: `https://docs.google.com/presentation/d/slides_${l.week}_${l.order}` },
      { title: 'Dataset thực hành', url: `https://github.com/restart35/datasets/raw/main/week${l.week}.csv` }
    ],
    status: 'published',
    createdBy: pythonCourse.providerId,
    createdAt: new Date(),
    updatedAt: new Date(),
    _destroy: false
  }))

  await DB().collection('course_video_lessons').insertMany(videoDocs)

  const totalDuration = pythonLessons.reduce((sum, l) => sum + l.duration, 0)
  const hours = Math.floor(totalDuration / 3600)
  const mins = Math.floor((totalDuration % 3600) / 60)

  console.log(`  ✓ Video lessons: ${videoDocs.length} videos (${hours}h ${mins}m) cho khóa "Python..."`)
  console.log(`     Phân bố: ${[1,2,3,4,5,6,7,8,9,10].map(w => `${pythonLessons.filter(l => l.week === w).length}v`).join(' | ')}`)
}

// ============ CHẠY SEED ============
async function main() {
  try {
    await CONNECT_DB()
    console.log('✓ Connected to MongoDB\n')

    console.log('='.repeat(70))
    console.log('🌱 RESTART-35 — SEED DATA: Courses & Schedules')
    console.log('='.repeat(70))

    const users = await seedUsers()
    const categories = await seedCategories()
    const courses = await seedCourses(users, categories)
    await seedSchedules(courses)
    const workers = users.filter(u => u.role === 'WORKER')
    await seedWorkerProfiles(workers)
    await seedVideoLessons(courses)

    console.log('\n' + '='.repeat(70))
    console.log('✅ SEED HOÀN TẤT!')
    console.log('='.repeat(70))
    console.log(`  • ${users.length} users (trainers, admin, workers)`)
    console.log(`  • ${categories.length} categories`)
    console.log(`  • ${courses.length} courses (5 approved, 1 pending)`)
    console.log('  • 4 schedules với chi tiết sessions')
    console.log(`  • ${workers.length} worker profiles`)
    console.log('  • 33 video lessons cho khóa Python Data Science (10 tuần)')
    console.log('')
    console.log('📋 Mẫu dữ liệu khóa học:')
    console.log('')
    courses.filter(c => c.status === 'approved').forEach((c, i) => {
      console.log(`  ${i + 1}. "${c.title}"`)
      console.log(`     Level: ${c.level} | Hình thức: ${c.delivery_type} | Học phí: ${c.isFree ? 'MIỄN PHÍ' : c.fee.toLocaleString() + ' VNĐ'}`)
      console.log(`     Thời lượng: ${c.duration.value} ${c.duration.unit} | Max: ${c.maxStudents} học viên | Đã ghi danh: ${c.currentStudents}`)
      console.log(`     Schedule: ${c.schedule}`)
      console.log(`     Syllabus: ${c.syllabus.length} tuần`)
      console.log('')
    })
    console.log('')

  } catch (error) {
    console.error('\n❌ SEED FAILED:', error.message)
    console.error(error.stack)
    process.exit(1)
  } finally {
    await CLOSE_DB()
    console.log('✓ Disconnected from MongoDB')
    process.exit(0)
  }
}

main()
