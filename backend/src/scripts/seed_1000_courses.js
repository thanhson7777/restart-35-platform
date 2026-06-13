/**
 * Seed Script - Tự động tạo 1000 khóa học đa dạng
 *
 * Usage:
 *   npx babel-node src/scripts/seed_1000_courses.js
 */

import 'dotenv/config'
import { MongoClient, ServerApiVersion } from 'mongodb'
import { faker } from '@faker-js/faker'
import { env } from '~/config/enviroment'
import { COURSE_STATUS, COURSE_LEVELS, COURSE_DELIVERY_TYPES, COURSE_FUNDING_MODELS, LOCATION_TYPES, DURATION_UNITS } from '~/utils/constants'

// Categories & sample skills
const DOMAINS = [
  {
    categorySlug: 'cntt',
    name: 'Công nghệ thông tin',
    subjects: ['Lập trình Web', 'Data Science', 'AI & Machine Learning', 'Cyber Security', 'Cloud Computing', 'Mobile App'],
    skills: ['JavaScript', 'Python', 'React', 'Node.js', 'Machine Learning', 'AWS', 'Bảo mật web', 'Docker', 'Phân tích dữ liệu', 'HTML/CSS', 'UI/UX Design', 'Tester']
  },
  {
    categorySlug: 'quan-tri-doanh-nghiep',
    name: 'Quản trị doanh nghiệp',
    subjects: ['Marketing Online', 'Quản trị nhân sự', 'Sales B2B', 'Kế toán thực hành', 'Tài chính doanh nghiệp', 'CEO Khởi nghiệp'],
    skills: ['Digital Marketing', 'Chạy quảng cáo Facebook', 'Bán hàng online', 'Kế toán thuế', 'Quản trị nhân sự', 'Giao tiếp khách hàng', 'Chốt sale', 'Lập kế hoạch kinh doanh', 'Quản lý tài chính']
  },
  {
    categorySlug: 'nong-nghiep-che-bien',
    name: 'Nông nghiệp & Chế biến',
    subjects: ['Nông nghiệp hữu cơ', 'Trồng sầu riêng', 'Chăn nuôi công nghệ cao', 'Chế biến nông sản', 'Mô hình VAC'],
    skills: ['Trồng trọt', 'Chăn nuôi', 'Nông nghiệp VietGAP', 'Sơ chế nông sản', 'Kỹ thuật bón phân', 'Làm vườn', 'Nông nghiệp công nghệ cao', 'Pha chế']
  },
  {
    categorySlug: 'du-lich-dich-vu',
    name: 'Du lịch & Dịch vụ',
    subjects: ['Quản lý nhà hàng', 'Hướng dẫn viên du lịch', 'Lễ tân khách sạn', 'Pha chế Bartender', 'Nấu ăn chuyên nghiệp'],
    skills: ['Phục vụ nhà hàng', 'Lễ tân', 'Tiếng Anh giao tiếp', 'Giao tiếp khách hàng', 'Pha chế đồ uống', 'Nấu ăn', 'Quản lý tour', 'Kỹ năng giải quyết khiếu nại']
  },
  {
    categorySlug: 'ky-nang-mem-khoi-nghiep',
    name: 'Kỹ năng mềm & Khởi nghiệp',
    subjects: ['Khởi nghiệp tinh gọn', 'Giao tiếp nơi công sở', 'Quản lý thời gian', 'Lãnh đạo bản thân', 'Thuyết trình trước đám đông'],
    skills: ['Khởi nghiệp', 'Lập kế hoạch', 'Quản lý thời gian', 'Thuyết trình', 'Làm việc nhóm', 'Thích nghi nhanh', 'Xử lý tình huống', 'Tư duy tích cực', 'Lãnh đạo']
  }
]

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

const createUniqueSlug = (title) => {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + faker.string.alphanumeric(4)
}

async function run() {
  try {
    await CONNECT_DB()
    console.log('Connected to MongoDB')

    // Lấy thông tin user và category có sẵn
    const trainers = await DB().collection('users').find({ role: 'TRAINER', _destroy: false }).toArray()
    const categories = await DB().collection('categories').find({ _destroy: false }).toArray()

    if (trainers.length === 0 || categories.length === 0) {
      console.error('Không tìm thấy trainer hoặc category. Hãy chạy seedCourses.js trước.')
      process.exit(1)
    }

    const coursesToInsert = []
    
    console.log('Bắt đầu sinh 1000 khóa học (Free-text skills)...')
    for (let i = 0; i < 1000; i++) {
      const domain = faker.helpers.arrayElement(DOMAINS)
      const category = categories.find(c => c.slug === domain.categorySlug) || categories[0]
      const trainer = faker.helpers.arrayElement(trainers)
      
      const subject = faker.helpers.arrayElement(domain.subjects)
      const adjective = faker.helpers.arrayElement(['Thực chiến', 'Từ A-Z', 'Cho người mới bắt đầu', 'Nâng cao', 'Chuyên nghiệp', 'Tốc tốc', 'Ứng dụng'])
      const title = `Khóa học ${subject} ${adjective} - ${faker.commerce.productName()}`
      
      // Random 2-5 skills from the domain pool, plus maybe 1 custom free-text string
      const numSkills = faker.number.int({ min: 2, max: 5 })
      const courseSkills = faker.helpers.arrayElements(domain.skills, numSkills)
      // Add a completely random free text skill sometimes
      if (Math.random() > 0.5) {
        courseSkills.push(faker.word.words({ count: { min: 2, max: 4 } }))
      }

      const course = {
        title: title,
        slug: createUniqueSlug(title),
        description: faker.lorem.paragraphs(3) + '\n\n' + faker.lorem.paragraphs(2),
        shortDescription: faker.lorem.sentence(10),
        thumbnail: faker.image.urlLoremFlickr({ category: 'education' }),
        categoryId: category._id.toString(),
        providerId: trainer._id.toString(),
        providerName: trainer.displayName,
        providerEmail: trainer.email,
        duration: { value: faker.number.int({ min: 1, max: 12 }), unit: DURATION_UNITS.WEEKS },
        location: { type: faker.helpers.arrayElement(Object.values(LOCATION_TYPES)) },
        delivery_type: faker.helpers.arrayElement(Object.values(COURSE_DELIVERY_TYPES)),
        funding_model: faker.helpers.arrayElement(Object.values(COURSE_FUNDING_MODELS)),
        fee: faker.number.int({ min: 0, max: 5000000 }),
        isFree: Math.random() > 0.7,
        scholarshipEligibility: Math.random() > 0.5,
        maxStudents: faker.number.int({ min: 10, max: 100 }),
        currentStudents: faker.number.int({ min: 0, max: 50 }),
        enrollmentStartDate: Date.now() + faker.number.int({ min: -30, max: 30 }) * 86400000,
        level: faker.helpers.arrayElement(Object.values(COURSE_LEVELS)),
        skills: courseSkills,
        prerequisites: [faker.lorem.words(3), faker.lorem.words(4)],
        requirements: [faker.lorem.words(3)],
        syllabus: [],
        certificate: `Chứng chỉ ${subject}`,
        outcomes: [faker.lorem.sentence(5), faker.lorem.sentence(6)],
        rating: { average: faker.number.float({ min: 3.5, max: 5.0, fractionDigits: 1 }), count: faker.number.int({ min: 0, max: 500 }) },
        status: COURSE_STATUS.APPROVED, // Make them all approved for search
        approvedBy: trainer._id.toString(),
        approvedAt: Date.now() - faker.number.int({ min: 1, max: 100 }) * 86400000,
        viewCount: faker.number.int({ min: 10, max: 10000 }),
        enrollmentCount: faker.number.int({ min: 0, max: 500 }),
        createdAt: new Date(Date.now() - faker.number.int({ min: 1, max: 300 }) * 86400000),
        updatedAt: new Date(),
        _destroy: false
      }
      
      coursesToInsert.push(course)
    }

    // Insert to DB
    console.log(`Đang chèn ${coursesToInsert.length} khóa học vào MongoDB...`)
    const result = await DB().collection('courses').insertMany(coursesToInsert)
    console.log(`Hoàn thành! Đã chèn ${result.insertedCount} khóa học.`)

  } catch (error) {
    console.error('Error seeding data:', error)
  } finally {
    await CLOSE_DB()
    console.log('Database connection closed')
  }
}

run()
