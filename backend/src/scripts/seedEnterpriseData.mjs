import 'dotenv/config'
import { MongoClient, ObjectId } from 'mongodb'

const client = new MongoClient(process.env.MONGODB_URI)
const db = client.db(process.env.DATABASE_NAME)

// ─── Helpers ────────────────────────────────────────────────────────────────
const daysAgo = (n) => new Date(Date.now() - n * 86400_000)
const daysLater = (n) => new Date(Date.now() + n * 86400_000)

async function main() {
  await client.connect()
  console.log('✅ Connected to MongoDB:', process.env.DATABASE_NAME)

  // 1. Tìm tài khoản Enterprise
  const enterprise = await db.collection('users').findOne({ email: 'enterprise@gmail.com' })
  if (!enterprise) {
    console.error('❌ Không tìm thấy user enterprise@gmail.com')
    process.exit(1)
  }
  const enterpriseId = enterprise._id.toString()
  console.log(`✅ Enterprise found: ${enterprise.displayName || enterprise.email} (${enterpriseId})`)

  // 2. Tạo một số Jobs nếu chưa có
  const existingJobs = await db.collection('recruitment_jobs')
    .find({ enterpriseId, status: 'published', _destroy: { $ne: true } })
    .toArray()

  let jobs = existingJobs
  if (jobs.length < 3) {
    console.log('🔨 Tạo thêm jobs...')
    const newJobs = [
      {
        title: 'Nhân viên Giao hàng Nhanh',
        description: 'Giao nhận hàng hóa trong khu vực nội thành, thu tiền COD.',
        enterpriseId, status: 'published',
        jobType: 'full-time', locationType: 'onsite',
        province: 'Hồ Chí Minh', district: 'Quận 1',
        salary: { min: 7000000, max: 10000000, currency: 'VND', negotiable: false },
        requirements: ['Có xe máy', 'Thuộc đường'],
        createdAt: daysAgo(30), updatedAt: daysAgo(5), _destroy: false
      },
      {
        title: 'Nhân viên Phục vụ Part-time',
        description: 'Phục vụ bàn, nhận order, dọn dẹp vệ sinh khu vực làm việc.',
        enterpriseId, status: 'published',
        jobType: 'part-time', locationType: 'onsite',
        province: 'Hồ Chí Minh', district: 'Quận 3',
        salary: { min: 3000000, max: 5000000, currency: 'VND', negotiable: true },
        requirements: ['Nhanh nhẹn', 'Giao tiếp tốt'],
        createdAt: daysAgo(15), updatedAt: daysAgo(2), _destroy: false
      },
      {
        title: 'Thợ Hàn Xì Công Trình',
        description: 'Gia công và hàn các kết cấu thép tại xưởng và công trình.',
        enterpriseId, status: 'published',
        jobType: 'full-time', locationType: 'onsite',
        province: 'Bình Dương', district: 'Dĩ An',
        salary: { min: 9000000, max: 15000000, currency: 'VND', negotiable: true },
        requirements: ['Có chứng chỉ hàn', 'Kinh nghiệm 1 năm'],
        createdAt: daysAgo(5), updatedAt: daysAgo(1), _destroy: false
      }
    ]
    const result = await db.collection('recruitment_jobs').insertMany(newJobs)
    jobs = await db.collection('recruitment_jobs').find({ _id: { $in: Object.values(result.insertedIds) } }).toArray()
    console.log(`  → Đã tạo thêm ${jobs.length} jobs`)
  }

  // 3. Xóa các đơn ứng tuyển cũ của enterprise này để dọn dẹp (tùy chọn, để comment)
  // await db.collection('recruitment_applications').deleteMany({ enterpriseId })

  // 4. Tạo nhiều ứng viên giả (mock workers profiles)
  console.log('👤 Tạo ứng viên giả...')
  const mockWorkers = Array.from({ length: 15 }).map((_, i) => ({
    _id: new ObjectId(),
    email: `mock_worker_${i}@gmail.com`,
    role: 'worker',
    displayName: `Nguyễn Văn Ứng Viên ${i+1}`,
    phone: `09012345${i.toString().padStart(2, '0')}`,
    avatar: `https://i.pravatar.cc/150?u=${i}`,
    isActive: true,
    createdAt: daysAgo(60)
  }))
  await db.collection('users').insertMany(mockWorkers)
  console.log(`  → Đã tạo ${mockWorkers.length} tài khoản worker ảo`)

  // Tạo Profile cho các worker
  const mockProfiles = mockWorkers.map(w => ({
    userId: w._id.toString(),
    address: 'TP.HCM',
    skills: ['Nhanh nhẹn', 'Chăm chỉ'],
    createdAt: daysAgo(60),
    updatedAt: daysAgo(60)
  }))
  await db.collection('worker_profiles').insertMany(mockProfiles)

  // 5. Tạo đơn ứng tuyển (Applications)
  console.log('📋 Tạo đơn ứng tuyển (đặc biệt nhiều trạng thái "Đang chờ - NEW")...')
  
  const applications = []
  
  // Job 1: Có 8 đơn (5 New, 2 Reviewing, 1 Shortlisted)
  const j1 = jobs[0]
  for (let i=0; i<8; i++) {
    const worker = mockWorkers[i]
    let status = 'new'
    if (i === 6) status = 'reviewing'
    if (i === 7) status = 'shortlisted'
    
    applications.push({
      jobId: j1._id.toString(),
      workerId: worker._id.toString(),
      enterpriseId,
      status,
      coverLetter: `Xin chào, tôi là ${worker.displayName}, tôi muốn ứng tuyển vào vị trí này.`,
      statusHistory: [
        { status: 'new', changedAt: daysAgo(i+1).getTime(), note: 'Nộp đơn' }
      ],
      appliedAt: daysAgo(i+1),
      updatedAt: daysAgo(i+1),
      _destroy: false
    })
  }

  // Job 2: Có 5 đơn (4 New, 1 Rejected)
  const j2 = jobs[1]
  for (let i=8; i<13; i++) {
    const worker = mockWorkers[i]
    let status = 'new'
    if (i === 12) status = 'rejected'
    
    applications.push({
      jobId: j2._id.toString(),
      workerId: worker._id.toString(),
      enterpriseId,
      status,
      coverLetter: `Chào công ty, tôi muốn làm part-time.`,
      statusHistory: [
        { status: 'new', changedAt: daysAgo(i-5).getTime(), note: 'Nộp đơn' }
      ],
      appliedAt: daysAgo(i-5),
      updatedAt: daysAgo(i-5),
      _destroy: false
    })
  }

  // Job 3: Có 2 đơn (Đều New)
  const j3 = jobs[2] || jobs[0]
  for (let i=13; i<15; i++) {
    const worker = mockWorkers[i]
    applications.push({
      jobId: j3._id.toString(),
      workerId: worker._id.toString(),
      enterpriseId,
      status: 'new',
      coverLetter: `Tôi có bằng hàn xì, mong được công ty xem xét.`,
      statusHistory: [
        { status: 'new', changedAt: daysAgo(i-10).getTime(), note: 'Nộp đơn' }
      ],
      appliedAt: daysAgo(i-10),
      updatedAt: daysAgo(i-10),
      _destroy: false
    })
  }

  const appResult = await db.collection('recruitment_applications').insertMany(applications)
  console.log(`  → Đã tạo ${Object.values(appResult.insertedIds).length} đơn ứng tuyển (phần lớn là "Chờ duyệt")`)

  console.log('\n✅ ===== HOÀN TẤT =====')
  console.log(`Enterprise: enterprise@gmail.com`)
  console.log(`Hãy đăng nhập và kiểm tra mục "Đơn ứng tuyển"!`)
  process.exit(0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
