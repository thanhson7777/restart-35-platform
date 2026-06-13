/**
 * Seed data cho tài khoản worker1@gmail.com
 * Thêm: enrollments (khóa học đa dạng trạng thái), applications (đơn ứng tuyển đa dạng),
 *        interviews (lịch phỏng vấn), offers (thư mời), certificates
 *
 * Chạy: node src/scripts/seedWorker1Data.mjs
 */

import 'dotenv/config'
import { MongoClient, ObjectId } from 'mongodb'

const client = new MongoClient(process.env.MONGODB_URI)
const db = client.db(process.env.DATABASE_NAME)

// ─── Helpers ────────────────────────────────────────────────────────────────
const daysAgo  = (n) => new Date(Date.now() - n * 86400_000)
const daysLater= (n) => new Date(Date.now() + n * 86400_000)
const oid      = ()  => new ObjectId()

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  await client.connect()
  console.log('✅ Connected to MongoDB:', process.env.DATABASE_NAME)

  // ── 1. Lấy thông tin worker1 ──────────────────────────────────────────────
  const worker = await db.collection('users').findOne({ email: 'worker1@gmail.com' })
  if (!worker) {
    console.error('❌ Không tìm thấy user worker1@gmail.com. Hãy đảm bảo tài khoản đã tồn tại.')
    process.exit(1)
  }
  const workerId = worker._id.toString()
  console.log(`✅ Worker found: ${worker.displayName || worker.email} (${workerId})`)

  // Đảm bảo tài khoản đã active
  await db.collection('users').updateOne(
    { _id: worker._id },
    { $set: { isActive: true, emailVerified: true } }
  )

  // ── 2. Lấy enterprise account để tạo jobs ────────────────────────────────
  const enterprise = await db.collection('users').findOne({ role: 'enterprise' })
  if (!enterprise) {
    console.warn('⚠️  Không tìm thấy enterprise user — một số data sẽ dùng ID giả')
  }
  const enterpriseId = enterprise?._id.toString() ?? new ObjectId().toString()
  console.log(`✅ Enterprise: ${enterprise?.email ?? 'mock'} (${enterpriseId})`)

  // ── 3. Lấy hoặc tạo jobs (recruitment_jobs) ───────────────────────────────
  const existingJobs = await db.collection('recruitment_jobs')
    .find({ status: 'published', _destroy: { $ne: true } })
    .limit(12)
    .toArray()

  let jobs = existingJobs
  if (jobs.length < 8) {
    console.log('🔨 Tạo thêm jobs vì DB có ít hơn 8 jobs...')
    const newJobs = [
      {
        title: 'Nhân viên bảo vệ ca đêm',
        description: 'Bảo vệ tòa nhà văn phòng, tuần tra theo lịch, báo cáo sự cố.',
        enterpriseId, status: 'published',
        jobType: 'full-time', locationType: 'onsite',
        province: 'Hồ Chí Minh', district: 'Quận 1',
        salary: { min: 6500000, max: 8000000, currency: 'VND', negotiable: false },
        requirements: ['Sức khỏe tốt', 'Kỷ luật', 'Kinh nghiệm bảo vệ ưu tiên'],
        createdAt: daysAgo(60), updatedAt: daysAgo(10), _destroy: false
      },
      {
        title: 'Tài xế giao hàng nội thành',
        description: 'Giao hàng hóa cho khách hàng trong nội thành, sử dụng xe máy công ty.',
        enterpriseId, status: 'published',
        jobType: 'full-time', locationType: 'onsite',
        province: 'Hồ Chí Minh', district: 'Quận Bình Thạnh',
        salary: { min: 7000000, max: 9000000, currency: 'VND', negotiable: true },
        requirements: ['Có GPLX', 'Thông thạo đường TP.HCM', 'Trung thực'],
        createdAt: daysAgo(45), updatedAt: daysAgo(5), _destroy: false
      },
      {
        title: 'Công nhân may công nghiệp',
        description: 'Vận hành máy may công nghiệp, đảm bảo năng suất và chất lượng sản phẩm.',
        enterpriseId, status: 'published',
        jobType: 'full-time', locationType: 'onsite',
        province: 'Bình Dương', district: 'Dĩ An',
        salary: { min: 7500000, max: 10000000, currency: 'VND', negotiable: false },
        requirements: ['Sức khỏe tốt', 'Cần cù', 'Ưu tiên có kinh nghiệm may'],
        createdAt: daysAgo(30), updatedAt: daysAgo(3), _destroy: false
      },
      {
        title: 'Nhân viên phục vụ nhà hàng',
        description: 'Phục vụ thực đơn, giữ vệ sinh bàn ăn, hỗ trợ thu ngân khi cần.',
        enterpriseId, status: 'published',
        jobType: 'part-time', locationType: 'onsite',
        province: 'Hồ Chí Minh', district: 'Quận 3',
        salary: { min: 4000000, max: 5500000, currency: 'VND', negotiable: false },
        requirements: ['Ngoại hình dễ nhìn', 'Giao tiếp tốt', 'Chịu đứng lâu'],
        createdAt: daysAgo(20), updatedAt: daysAgo(2), _destroy: false
      },
      {
        title: 'Thợ hàn MIG/MAG',
        description: 'Hàn kết cấu thép, hàn ống theo bản vẽ kỹ thuật tại xưởng.',
        enterpriseId, status: 'published',
        jobType: 'full-time', locationType: 'onsite',
        province: 'Đồng Nai', district: 'Biên Hòa',
        salary: { min: 9000000, max: 13000000, currency: 'VND', negotiable: true },
        requirements: ['Bằng hàn MIG/MAG', 'Đọc được bản vẽ', 'Ít nhất 1 năm kinh nghiệm'],
        createdAt: daysAgo(25), updatedAt: daysAgo(1), _destroy: false
      },
      {
        title: 'Nhân viên kho (Picker & Packer)',
        description: 'Nhặt hàng, đóng gói, kiểm tra hàng hóa trước khi xuất kho.',
        enterpriseId, status: 'published',
        jobType: 'full-time', locationType: 'onsite',
        province: 'Long An', district: 'Bến Lức',
        salary: { min: 6000000, max: 7500000, currency: 'VND', negotiable: false },
        requirements: ['Sức khỏe tốt', 'Cẩn thận', 'Biết sử dụng máy quét mã vạch'],
        createdAt: daysAgo(15), updatedAt: daysAgo(1), _destroy: false
      },
      {
        title: 'Nhân viên bán hàng siêu thị',
        description: 'Sắp xếp hàng hóa, tư vấn khách mua hàng, quản lý hàng tồn kho khu vực.',
        enterpriseId, status: 'published',
        jobType: 'full-time', locationType: 'onsite',
        province: 'Hồ Chí Minh', district: 'Quận 7',
        salary: { min: 6500000, max: 8500000, currency: 'VND', negotiable: false },
        requirements: ['Tốt nghiệp THPT', 'Nhiệt tình', 'Ưu tiên kinh nghiệm bán lẻ'],
        createdAt: daysAgo(10), updatedAt: daysAgo(1), _destroy: false
      },
      {
        title: 'Phụ bếp / Bếp phụ',
        description: 'Sơ chế nguyên liệu, hỗ trợ bếp chính, vệ sinh khu bếp.',
        enterpriseId, status: 'published',
        jobType: 'full-time', locationType: 'onsite',
        province: 'Hồ Chí Minh', district: 'Quận Phú Nhuận',
        salary: { min: 5500000, max: 7000000, currency: 'VND', negotiable: true },
        requirements: ['Chịu nhiệt', 'Nhanh nhẹn', 'Vệ sinh sạch sẽ'],
        createdAt: daysAgo(8), updatedAt: daysAgo(1), _destroy: false
      },
    ]
    const result = await db.collection('recruitment_jobs').insertMany(newJobs)
    const insertedIds = Object.values(result.insertedIds)
    jobs = await db.collection('recruitment_jobs')
      .find({ _id: { $in: insertedIds } })
      .toArray()
    console.log(`  → Đã tạo ${jobs.length} jobs mới`)
  }

  // ── 4. Lấy hoặc tạo courses ────────────────────────────────────────────────
  const existingCourses = await db.collection('courses')
    .find({ status: { $in: ['published', 'approved'] }, _destroy: { $ne: true } })
    .limit(8)
    .toArray()

  let courses = existingCourses
  if (courses.length < 5) {
    console.log('🔨 Tạo thêm courses vì DB có ít hơn 5 courses...')
    const trainerId = (await db.collection('users').findOne({ role: 'trainer' }))?._id.toString()
      ?? new ObjectId().toString()

    const newCourses = [
      {
        title: 'Kỹ thuật hàn cơ bản (MIG/MAG/TIG)',
        description: 'Học hàn từ đầu: an toàn lao động, thiết bị, kỹ thuật hàn đứng, ngang, trần.',
        status: 'published', providerId: trainerId,
        level: 'beginner', duration: 40, durationUnit: 'hours',
        price: 1200000, category: 'Cơ khí',
        thumbnail: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=250&fit=crop',
        createdAt: daysAgo(120), updatedAt: daysAgo(30), _destroy: false
      },
      {
        title: 'Lái xe tải hạng C - Nâng cao',
        description: 'Ôn thi và thực hành lái xe tải C. Kỹ năng xử lý tình huống, lái đường trường.',
        status: 'published', providerId: trainerId,
        level: 'intermediate', duration: 60, durationUnit: 'hours',
        price: 3500000, category: 'Lái xe',
        thumbnail: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400&h=250&fit=crop',
        createdAt: daysAgo(90), updatedAt: daysAgo(20), _destroy: false
      },
      {
        title: 'Nghiệp vụ bảo vệ chuyên nghiệp',
        description: 'Quy trình tuần tra, kỹ năng xử lý tình huống, sơ cấp cứu cơ bản.',
        status: 'published', providerId: trainerId,
        level: 'beginner', duration: 30, durationUnit: 'hours',
        price: 800000, category: 'Bảo vệ & An ninh',
        thumbnail: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=400&h=250&fit=crop',
        createdAt: daysAgo(80), updatedAt: daysAgo(15), _destroy: false
      },
      {
        title: 'Excel cơ bản cho công việc văn phòng',
        description: 'Hàm cơ bản, lọc dữ liệu, pivot table, biểu đồ. Phù hợp người mới.',
        status: 'published', providerId: trainerId,
        level: 'beginner', duration: 20, durationUnit: 'hours',
        price: 0, category: 'Hành chính',
        thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=250&fit=crop',
        createdAt: daysAgo(60), updatedAt: daysAgo(10), _destroy: false
      },
      {
        title: 'Kỹ năng phục vụ nhà hàng & khách sạn',
        description: 'Cách đặt bàn, phục vụ tiệc, giao tiếp với khách, xử lý phàn nàn.',
        status: 'published', providerId: trainerId,
        level: 'beginner', duration: 25, durationUnit: 'hours',
        price: 650000, category: 'Nhà hàng & Khách sạn',
        thumbnail: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&h=250&fit=crop',
        createdAt: daysAgo(50), updatedAt: daysAgo(5), _destroy: false
      },
    ]
    const result = await db.collection('courses').insertMany(newCourses)
    const insertedIds = Object.values(result.insertedIds)
    courses = await db.collection('courses')
      .find({ _id: { $in: insertedIds } })
      .toArray()
    console.log(`  → Đã tạo ${courses.length} courses mới`)
  }

  // ── 5. Xóa data cũ của worker1 (để seed sạch) ─────────────────────────────
  console.log('🗑️  Xóa data cũ của worker1...')
  await db.collection('enrollments').deleteMany({ userId: workerId })
  await db.collection('recruitment_applications').deleteMany({ workerId })
  await db.collection('recruitment_interviews').deleteMany({ workerId })
  await db.collection('recruitment_offers').deleteMany({ workerId })
  await db.collection('certificates').deleteMany({ userId: workerId })
  console.log('  → Xóa xong')

  // ── 6. Tạo ENROLLMENTS ────────────────────────────────────────────────────
  console.log('📚 Tạo enrollments...')
  const c0 = courses[0], c1 = courses[1], c2 = courses[2],
        c3 = courses[3] ?? courses[0], c4 = courses[4] ?? courses[1]

  const enrollmentDocs = [
    // Khóa 1: Hoàn thành — hàn cơ bản
    {
      userId: workerId, courseId: c0._id.toString(),
      status: 'completed',
      payment_status: 'paid',
      progress: { percentage: 100, completionStatus: 'completed', currentLesson: 12, totalLessons: 12, byDelivery: { video: 100, live: 0, offline: 0 } },
      attendance: { present: 10, absent: 1, late: 1, totalSessions: 12 },
      fee: { total: c0.price || 1200000, paid: c0.price || 1200000, pending: 0 },
      enrolledAt: daysAgo(110), startDate: daysAgo(105), completedAt: daysAgo(20),
      source: 'direct', _destroy: false, createdAt: daysAgo(110), updatedAt: daysAgo(20)
    },
    // Khóa 2: Đang học — lái xe (tiến độ cao)
    {
      userId: workerId, courseId: c1._id.toString(),
      status: 'active',
      payment_status: 'paid',
      progress: { percentage: 72, completionStatus: 'in_progress', currentLesson: 9, totalLessons: 12, byDelivery: { video: 72, live: 0, offline: 0 } },
      attendance: { present: 8, absent: 1, late: 0, totalSessions: 10 },
      fee: { total: c1.price || 3500000, paid: c1.price || 3500000, pending: 0 },
      enrolledAt: daysAgo(55), startDate: daysAgo(50),
      source: 'direct', _destroy: false, createdAt: daysAgo(55), updatedAt: daysAgo(3)
    },
    // Khóa 3: Đang học — bảo vệ (tiến độ thấp)
    {
      userId: workerId, courseId: c2._id.toString(),
      status: 'active',
      payment_status: 'paid',
      progress: { percentage: 30, completionStatus: 'in_progress', currentLesson: 3, totalLessons: 10, byDelivery: { video: 30, live: 0, offline: 0 } },
      attendance: { present: 2, absent: 0, late: 1, totalSessions: 4 },
      fee: { total: c2.price || 800000, paid: c2.price || 800000, pending: 0 },
      enrolledAt: daysAgo(25), startDate: daysAgo(20),
      source: 'direct', _destroy: false, createdAt: daysAgo(25), updatedAt: daysAgo(5)
    },
    // Khóa 4: Đang học — Excel (miễn phí, tiến độ 55%)
    {
      userId: workerId, courseId: c3._id.toString(),
      status: 'active',
      payment_status: 'waived',
      progress: { percentage: 55, completionStatus: 'in_progress', currentLesson: 6, totalLessons: 11, byDelivery: { video: 55, live: 0, offline: 0 } },
      attendance: { present: 6, absent: 0, late: 0, totalSessions: 6 },
      fee: { total: 0, paid: 0, pending: 0 },
      enrolledAt: daysAgo(30), startDate: daysAgo(28),
      source: 'recommendation', _destroy: false, createdAt: daysAgo(30), updatedAt: daysAgo(2)
    },
    // Khóa 5: Đã bỏ — phục vụ nhà hàng
    {
      userId: workerId, courseId: c4._id.toString(),
      status: 'dropped',
      payment_status: 'waived',
      progress: { percentage: 15, completionStatus: 'in_progress', currentLesson: 2, totalLessons: 8, byDelivery: { video: 15, live: 0, offline: 0 } },
      attendance: { present: 1, absent: 1, late: 0, totalSessions: 3 },
      fee: { total: c4.price || 650000, paid: 0, pending: c4.price || 650000 },
      dropReason: 'Lịch học không phù hợp với ca làm việc hiện tại',
      enrolledAt: daysAgo(40), startDate: daysAgo(38),
      source: 'direct', _destroy: false, createdAt: daysAgo(40), updatedAt: daysAgo(15)
    },
  ]
  const enrollResult = await db.collection('enrollments').insertMany(enrollmentDocs)
  console.log(`  → Đã tạo ${Object.keys(enrollResult.insertedIds).length} enrollments`)

  // ── 7. Tạo CERTIFICATE cho khóa hoàn thành ───────────────────────────────
  console.log('🏆 Tạo chứng chỉ...')
  await db.collection('certificates').insertOne({
    userId: workerId,
    courseId: c0._id.toString(),
    courseName: c0.title,
    certificateType: 'completion',
    certificateCode: `CERT-${workerId.slice(-6).toUpperCase()}-HANCoBan-2024`,
    issuedAt: daysAgo(20),
    expiresAt: null,
    _destroy: false,
    createdAt: daysAgo(20)
  })
  console.log('  → Đã tạo 1 chứng chỉ')

  // ── 8. Tạo RECRUITMENT APPLICATIONS ──────────────────────────────────────
  console.log('📋 Tạo đơn ứng tuyển...')
  const j0 = jobs[0], j1 = jobs[1], j2 = jobs[2], j3 = jobs[3] ?? jobs[0],
        j4 = jobs[4] ?? jobs[1], j5 = jobs[5] ?? jobs[2],
        j6 = jobs[6] ?? jobs[3] ?? jobs[0], j7 = jobs[7] ?? jobs[4] ?? jobs[1]

  const makeStatusHistory = (steps) =>
    steps.map(([status, dAgo, note]) => ({
      status, changedAt: daysAgo(dAgo).getTime(), changedBy: null, note
    }))

  const applicationDocs = [
    // 1. Hired — đã được nhận
    {
      jobId: j0._id.toString(), workerId, enterpriseId,
      status: 'hired',
      coverLetter: 'Tôi có 3 năm kinh nghiệm bảo vệ tại tòa nhà văn phòng. Sức khỏe tốt, kỷ luật cao.',
      statusHistory: makeStatusHistory([
        ['new', 85, 'Đơn ứng tuyển được tạo'],
        ['reviewing', 80, 'Đang xem xét hồ sơ'],
        ['shortlisted', 70, 'Hồ sơ đạt yêu cầu'],
        ['interview_scheduled', 60, 'Lịch phỏng vấn đã được đặt'],
        ['interviewed', 45, 'Phỏng vấn hoàn thành'],
        ['offered', 30, 'Đề nghị việc làm được gửi'],
        ['hired', 20, 'Ứng viên chấp nhận offer'],
      ]),
      appliedAt: daysAgo(85), updatedAt: daysAgo(20), _destroy: false
    },
    // 2. Offered — đang chờ phản hồi offer
    {
      jobId: j1._id.toString(), workerId, enterpriseId,
      status: 'offered',
      coverLetter: 'Tôi có bằng lái xe B2, thông thạo đường phố TP.HCM. Sẵn sàng làm việc ngay.',
      statusHistory: makeStatusHistory([
        ['new', 50, 'Đơn ứng tuyển được tạo'],
        ['reviewing', 45, 'Đang xem xét'],
        ['shortlisted', 35, 'Ứng viên được chọn'],
        ['interview_scheduled', 25, 'Đã lên lịch phỏng vấn'],
        ['interviewed', 15, 'Phỏng vấn xong'],
        ['offered', 5, 'Offer được gửi'],
      ]),
      appliedAt: daysAgo(50), updatedAt: daysAgo(5), _destroy: false
    },
    // 3. Interview scheduled — sắp phỏng vấn
    {
      jobId: j2._id.toString(), workerId, enterpriseId,
      status: 'interview_scheduled',
      coverLetter: 'Tôi đã tốt nghiệp nghề hàn tại trường kỹ thuật. Có thể đi làm ngay tại Đồng Nai.',
      statusHistory: makeStatusHistory([
        ['new', 20, 'Đơn ứng tuyển được tạo'],
        ['reviewing', 15, 'Đang xem xét'],
        ['shortlisted', 8, 'Vào danh sách phỏng vấn'],
        ['interview_scheduled', 3, 'Lịch phỏng vấn đã đặt'],
      ]),
      appliedAt: daysAgo(20), updatedAt: daysAgo(3), _destroy: false
    },
    // 4. Shortlisted
    {
      jobId: j3._id.toString(), workerId, enterpriseId,
      status: 'shortlisted',
      coverLetter: 'Tôi có kinh nghiệm phục vụ nhà hàng 2 năm, giao tiếp tốt.',
      statusHistory: makeStatusHistory([
        ['new', 30, 'Đơn ứng tuyển được tạo'],
        ['reviewing', 25, 'Đang xem xét'],
        ['shortlisted', 12, 'Hồ sơ đạt yêu cầu'],
      ]),
      appliedAt: daysAgo(30), updatedAt: daysAgo(12), _destroy: false
    },
    // 5. Reviewing
    {
      jobId: j4._id.toString(), workerId, enterpriseId,
      status: 'reviewing',
      coverLetter: 'Tôi muốn ứng tuyển vị trí thợ hàn. Tôi đang học khóa hàn MIG/MAG và gần hoàn thành.',
      statusHistory: makeStatusHistory([
        ['new', 10, 'Đơn ứng tuyển được tạo'],
        ['reviewing', 7, 'Đang xem xét hồ sơ'],
      ]),
      appliedAt: daysAgo(10), updatedAt: daysAgo(7), _destroy: false
    },
    // 6. New — vừa nộp
    {
      jobId: j5._id.toString(), workerId, enterpriseId,
      status: 'new',
      coverLetter: 'Tôi cần cù, chịu khó làm việc kho. Sẵn sàng tăng ca khi cần.',
      statusHistory: makeStatusHistory([
        ['new', 3, 'Đơn ứng tuyển được tạo'],
      ]),
      appliedAt: daysAgo(3), updatedAt: daysAgo(3), _destroy: false
    },
    // 7. Rejected
    {
      jobId: j6._id.toString(), workerId, enterpriseId,
      status: 'rejected',
      coverLetter: 'Tôi muốn ứng tuyển vị trí bán hàng siêu thị.',
      internalNotes: 'Ứng viên không đáp ứng yêu cầu kinh nghiệm bán lẻ tối thiểu 1 năm.',
      statusHistory: makeStatusHistory([
        ['new', 45, 'Đơn ứng tuyển được tạo'],
        ['reviewing', 40, 'Đang xem xét'],
        ['rejected', 35, 'Không đủ điều kiện kinh nghiệm'],
      ]),
      appliedAt: daysAgo(45), updatedAt: daysAgo(35), _destroy: false
    },
    // 8. Withdrawn — tự rút
    {
      jobId: j7._id.toString(), workerId, enterpriseId,
      status: 'withdrawn',
      coverLetter: 'Tôi muốn thử sức với vị trí phụ bếp.',
      statusHistory: makeStatusHistory([
        ['new', 60, 'Đơn ứng tuyển được tạo'],
        ['reviewing', 55, 'Đang xem xét'],
        ['withdrawn', 50, 'Ứng viên rút đơn'],
      ]),
      appliedAt: daysAgo(60), updatedAt: daysAgo(50), _destroy: false
    },
    // 9. Thêm 2 đơn new cho tháng trước (để có data line chart)
    {
      jobId: j0._id.toString(), workerId, enterpriseId,
      status: 'rejected',
      coverLetter: 'Đơn ứng tuyển tháng trước.',
      statusHistory: makeStatusHistory([['new', 35, 'Nộp đơn'], ['rejected', 32, 'Từ chối']]),
      appliedAt: daysAgo(35), updatedAt: daysAgo(32), _destroy: false
    },
    {
      jobId: j1._id.toString(), workerId, enterpriseId,
      status: 'withdrawn',
      coverLetter: 'Đơn ứng tuyển tháng trước.',
      statusHistory: makeStatusHistory([['new', 40, 'Nộp đơn'], ['withdrawn', 38, 'Tự rút']]),
      appliedAt: daysAgo(40), updatedAt: daysAgo(38), _destroy: false
    },
  ]

  const appResult = await db.collection('recruitment_applications').insertMany(applicationDocs)
  const appIds = Object.values(appResult.insertedIds)
  console.log(`  → Đã tạo ${appIds.length} đơn ứng tuyển`)

  // ── 9. Tạo INTERVIEWS ─────────────────────────────────────────────────────
  console.log('📅 Tạo lịch phỏng vấn...')

  // Application index 1 (offered) → interview completed
  // Application index 2 (interview_scheduled) → interview pending_confirmation
  const interviewDocs = [
    // Interview cho job đã hired (completed)
    {
      applicationId: appIds[0].toString(),
      jobId: j0._id.toString(), workerId, enterpriseId,
      status: 'completed',
      meetingType: 'office',
      scheduledAt: daysAgo(45),
      location: '123 Nguyễn Huệ, Quận 1, TP.HCM',
      duration: 45,
      interviewerNote: 'Ứng viên tự tin, kinh nghiệm phù hợp. Recommend hire.',
      workerNote: null,
      createdAt: daysAgo(60), updatedAt: daysAgo(45), _destroy: false
    },
    // Interview cho job offered (completed)
    {
      applicationId: appIds[1].toString(),
      jobId: j1._id.toString(), workerId, enterpriseId,
      status: 'completed',
      meetingType: 'google_meet',
      scheduledAt: daysAgo(15),
      meetingUrl: 'https://meet.google.com/abc-defg-hij',
      duration: 30,
      interviewerNote: 'Biết đường tốt. Cần chuẩn bị xe. Sẽ gửi offer.',
      createdAt: daysAgo(25), updatedAt: daysAgo(15), _destroy: false
    },
    // Interview cho job interview_scheduled (pending_confirmation — sắp tới)
    {
      applicationId: appIds[2].toString(),
      jobId: j2._id.toString(), workerId, enterpriseId,
      status: 'pending_confirmation',
      meetingType: 'office',
      scheduledAt: daysLater(5),
      location: 'Số 45 Trần Hưng Đạo, Biên Hòa, Đồng Nai',
      duration: 60,
      createdAt: daysAgo(3), updatedAt: daysAgo(3), _destroy: false
    },
    // Interview thêm — confirmed (sắp tới)
    {
      applicationId: appIds[3].toString(),
      jobId: j3._id.toString(), workerId, enterpriseId,
      status: 'confirmed',
      meetingType: 'phone',
      scheduledAt: daysLater(2),
      duration: 20,
      createdAt: daysAgo(5), updatedAt: daysAgo(1), _destroy: false
    },
  ]

  const interviewResult = await db.collection('recruitment_interviews').insertMany(interviewDocs)
  const interviewIds = Object.values(interviewResult.insertedIds)
  console.log(`  → Đã tạo ${interviewIds.length} lịch phỏng vấn`)

  // Cập nhật applications với interviewId
  await db.collection('recruitment_applications').updateOne(
    { _id: appIds[0] },
    { $set: { interviewId: interviewIds[0].toString() } }
  )
  await db.collection('recruitment_applications').updateOne(
    { _id: appIds[1] },
    { $set: { interviewId: interviewIds[1].toString() } }
  )
  await db.collection('recruitment_applications').updateOne(
    { _id: appIds[2] },
    { $set: { interviewId: interviewIds[2].toString() } }
  )

  // ── 10. Tạo OFFERS ─────────────────────────────────────────────────────────
  console.log('💼 Tạo offers...')
  const offerDocs = [
    // Offer cho job hired (accepted)
    {
      applicationId: appIds[0].toString(),
      jobId: j0._id.toString(), workerId, enterpriseId,
      status: 'accepted',
      salary: { amount: 7500000, currency: 'VND', period: 'monthly' },
      startDate: daysAgo(15),
      expiresAt: daysAgo(10),
      benefits: ['Bảo hiểm xã hội', 'Phụ cấp ca đêm 20%', 'Ăn ca'],
      offerNote: 'Chào mừng bạn vào đội ngũ! Vui lòng xác nhận trước ngày 15.',
      workerResponse: 'Tôi đồng ý với các điều khoản. Xin cảm ơn!',
      respondedAt: daysAgo(12),
      createdAt: daysAgo(20), updatedAt: daysAgo(12), _destroy: false
    },
    // Offer cho job offered (pending — đang chờ phản hồi)
    {
      applicationId: appIds[1].toString(),
      jobId: j1._id.toString(), workerId, enterpriseId,
      status: 'pending',
      salary: { amount: 8000000, currency: 'VND', period: 'monthly' },
      startDate: daysLater(14),
      expiresAt: daysLater(7),
      benefits: ['Bảo hiểm xã hội', 'Xăng xe 500k/tháng', 'Thưởng KPI'],
      offerNote: 'Mức lương thỏa thuận 8 triệu + xăng. Vui lòng phản hồi trong 7 ngày.',
      createdAt: daysAgo(5), updatedAt: daysAgo(5), _destroy: false
    },
  ]

  const offerResult = await db.collection('recruitment_offers').insertMany(offerDocs)
  const offerIds = Object.values(offerResult.insertedIds)
  console.log(`  → Đã tạo ${offerIds.length} offers`)

  // Cập nhật applications với offerId
  await db.collection('recruitment_applications').updateOne(
    { _id: appIds[0] },
    { $set: { offerId: offerIds[0].toString() } }
  )
  await db.collection('recruitment_applications').updateOne(
    { _id: appIds[1] },
    { $set: { offerId: offerIds[1].toString() } }
  )

  // ── 11. Tóm tắt ────────────────────────────────────────────────────────────
  console.log('\n✅ ===== SEED HOÀN THÀNH =====')
  console.log(`Worker: ${worker.email} (${workerId})`)
  console.log(`Enrollments: 5 (1 completed, 3 active, 1 dropped)`)
  console.log(`Certificates: 1`)
  console.log(`Applications: 10 (hired/offered/interview_scheduled/shortlisted/reviewing/new/rejected/withdrawn + 2 cũ)`)
  console.log(`Interviews: 4 (2 completed, 1 pending_confirmation, 1 confirmed)`)
  console.log(`Offers: 2 (1 accepted, 1 pending)`)
  console.log('=================================')

  await client.close()
}

main().catch((err) => {
  console.error('❌ Lỗi:', err)
  process.exit(1)
})
