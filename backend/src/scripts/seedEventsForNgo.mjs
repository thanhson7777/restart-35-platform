import 'dotenv/config'
import { MongoClient, ObjectId } from 'mongodb'

const client = new MongoClient(process.env.MONGODB_URI)
const db = client.db(process.env.DATABASE_NAME)

async function main() {
  await client.connect()

  const ngoEmail = 'ngo@gmail.com'
  const user = await db.collection('users').findOne({ email: ngoEmail })
  if (!user) {
    console.error(`User with email ${ngoEmail} not found.`)
    process.exit(1)
  }

  const organizerId = user._id; // ObjectId

  const events = [
    {
      title: 'Hội thảo Định hướng Nghề nghiệp & Kỹ năng Phỏng vấn 2026',
      coverImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop',
      eventDate: new Date('2026-07-15T09:00:00Z').getTime(),
      location: 'Trung tâm Hội nghị Quốc gia, Hà Nội',
      description: 'Hội thảo chia sẻ kinh nghiệm viết CV, trả lời phỏng vấn và định hướng nghề nghiệp cho sinh viên mới ra trường với sự tham gia của các chuyên gia nhân sự hàng đầu.',
      organizerId: organizerId,
      status: 'published',
      participantCount: 15,
      _destroy: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      title: 'Ngày hội Tuyển dụng Công nghệ & Kỹ thuật',
      coverImage: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&auto=format&fit=crop',
      eventDate: new Date('2026-08-20T08:00:00Z').getTime(),
      location: 'Đại học Bách Khoa TP.HCM',
      description: 'Ngày hội kết nối doanh nghiệp công nghệ lớn với sinh viên và người lao động. Cơ hội phỏng vấn tuyển dụng trực tiếp tại các gian hàng và nhận học bổng phát triển kỹ năng.',
      organizerId: organizerId,
      status: 'published',
      participantCount: 42,
      _destroy: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      title: 'Khóa đào tạo Kỹ năng mềm & Quản lý Dự án cơ bản',
      coverImage: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&auto=format&fit=crop',
      eventDate: new Date('2026-09-05T13:30:00Z').getTime(),
      location: 'Văn phòng Tổ chức Restart, Quận 3, TP.HCM',
      description: 'Khóa học thực chiến miễn phí kéo dài 2 ngày trang bị kiến thức về quản lý dự án Agile/Scrum và các kỹ năng giao tiếp, làm việc nhóm trong môi trường công sở hiện đại.',
      organizerId: organizerId,
      status: 'published',
      participantCount: 8,
      _destroy: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      title: 'Hội thảo Trực tuyến: Xu hướng Việc làm Kỷ nguyên AI',
      coverImage: 'https://images.unsplash.com/photo-1591115765373-5209768f73e7?w=800&auto=format&fit=crop',
      eventDate: new Date('2026-07-02T19:00:00Z').getTime(),
      location: 'Trực tuyến qua Zoom Meetings',
      description: 'Tìm hiểu những thay đổi mạnh mẽ của thị trường lao động dưới tác động của trí tuệ nhân tạo (AI) và cách người lao động tự chuẩn bị kỹ năng số để nâng cao năng lực cạnh tranh.',
      organizerId: organizerId,
      status: 'published',
      participantCount: 120,
      _destroy: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ]

  const result = await db.collection('events').insertMany(events)
  console.log(`Successfully seeded ${result.insertedCount} events for NGO ${ngoEmail}`)

  await client.close()
}

main().catch(console.error)
