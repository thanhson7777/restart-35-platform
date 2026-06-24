import 'dotenv/config'
import { faker } from '@faker-js/faker/locale/vi'
import { CONNECT_DB, CLOSE_DB, GET_DB } from '../config/mongodb.js'
import { courseModel } from '../models/courseModel.js'

const COURSE_DELIVERY_TYPES = {
  LIVE: 'live',
  OFFLINE: 'offline'
}

const LOCATION_TYPES = {
  ONLINE: 'online',
  OFFLINE: 'offline'
}

const COURSE_STATUS = {
  APPROVED: 'approved'
}

const generateSlug = (title) => {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 200)
}

const PREFIXES = [
  'Khóa học thực chiến', 'Làm chủ', 'Nhập môn', 'Nâng cao', 
  'Kỹ năng', 'Phát triển', 'Chuyên sâu', 'Ứng dụng'
]
const SUFFIXES = [
  'cho người mới bắt đầu', 'từ A đến Z', 'thực hành', 
  'chuyên nghiệp', 'cơ bản', 'nâng cao', 'cấp tốc', 'toàn diện'
]

async function seed1000Courses() {
  try {
    console.log('Đang kết nối database...')
    await CONNECT_DB()
    const db = GET_DB()
    console.log('Kết nối database thành công!')

    console.log('Đang lấy dữ liệu Trainers, Categories, và ESCO Skills...')
    
    const trainers = await db.collection('users').find({ role: 'TRAINER', _destroy: false }).toArray()
    if (trainers.length === 0) {
      throw new Error('Không tìm thấy giảng viên (TRAINER) nào trong DB. Vui lòng seed user trước.')
    }

    const categories = await db.collection('categories').find({ _destroy: false }).toArray()
    if (categories.length === 0) {
      throw new Error('Không tìm thấy danh mục (CATEGORY) nào trong DB. Vui lòng seed categories trước.')
    }

    const escoSkills = await db.collection('esco_skills').find({ type: 'skill' }).project({ titleVi: 1, titleEn: 1 }).toArray()
    if (escoSkills.length === 0) {
      throw new Error('Không tìm thấy kỹ năng nào trong bảng esco_skills. Vui lòng đảm bảo bảng này có dữ liệu.')
    }

    console.log(`Tìm thấy ${trainers.length} trainers, ${categories.length} categories, ${escoSkills.length} skills.`)

    const coursesBatch = []
    
    // Xóa bớt các khóa học đã seed từ script này (nếu có chạy lại nhiều lần thì có thể cân nhắc, nhưng ở đây cứ thêm mới)
    
    for (let i = 0; i < 1000; i++) {
      const trainer = faker.helpers.arrayElement(trainers)
      const category = faker.helpers.arrayElement(categories)
      
      // Random 2-5 skills
      const numSkills = faker.number.int({ min: 2, max: 5 })
      const selectedSkillsObjects = faker.helpers.arrayElements(escoSkills, numSkills)
      const skills = selectedSkillsObjects.map(s => s.titleVi || s.titleEn).filter(s => !!s)

      // Title
      const mainSkill = skills[0] || 'Kỹ năng tổng hợp'
      const prefix = faker.helpers.arrayElement(PREFIXES)
      const suffix = faker.helpers.arrayElement(SUFFIXES)
      const title = `${prefix} ${mainSkill} ${suffix}`
      
      // Fee
      const isFree = faker.number.int({ min: 1, max: 100 }) <= 20 // 20%
      const fee = isFree ? 0 : faker.number.int({ min: 5, max: 50 }) * 100000 // 500k to 5M

      const isOffline = faker.number.int({ min: 1, max: 100 }) <= 50
      const deliveryType = isOffline ? COURSE_DELIVERY_TYPES.OFFLINE : COURSE_DELIVERY_TYPES.LIVE
      const locationType = isOffline ? LOCATION_TYPES.OFFLINE : LOCATION_TYPES.ONLINE

      const newCourse = {
        title: title,
        slug: generateSlug(title) + '-' + faker.string.alphanumeric(6),
        description: faker.lorem.paragraphs(3, '\n\n'),
        shortDescription: faker.lorem.paragraph(),
        thumbnail: faker.image.urlPicsumPhotos({ width: 800, height: 600 }),
        categoryId: category._id.toString(),
        providerId: trainer._id.toString(),
        providerName: trainer.displayName || trainer.username,
        providerEmail: trainer.email,
        duration: {
          value: faker.number.int({ min: 4, max: 24 }),
          unit: 'weeks'
        },
        location: {
          type: locationType,
          address: isOffline ? faker.location.streetAddress() : null,
          link: !isOffline ? faker.internet.url() : null
        },
        delivery_type: deliveryType,
        fundingConfig: {
          type: isFree ? 'FREE' : 'PAID',
          price: fee,
          sponsorIds: [],
          hasJobGuarantee: false,
          acceptsSponsorship: true
        },
        funding_model: isFree ? 'free' : 'learner_paid',
        fee: fee,
        isFree: isFree,
        maxStudents: faker.number.int({ min: 15, max: 50 }),
        currentStudents: 0,
        level: faker.helpers.arrayElement(['beginner', 'intermediate', 'advanced']),
        skills: skills,
        prerequisites: [],
        requirements: [],
        syllabus: [],
        certificate: faker.datatype.boolean() ? `Chứng chỉ hoàn thành khóa ${title}` : '',
        outcomes: faker.lorem.sentences(2).split('. ').filter(s => s),
        rating: { average: 0, count: 0 },
        viewCount: 0,
        enrollmentCount: 0,
        status: COURSE_STATUS.APPROVED,
        approvedBy: trainer._id.toString(),
        approvedAt: new Date(),
        createdAt: faker.date.past({ years: 1 }),
        updatedAt: new Date(),
        _destroy: false
      }

      // Run through Joi validation to make sure structure is right
      try {
        const validData = await courseModel.COURSE_COLLECTION_SCHEMA.validateAsync(newCourse, { stripUnknown: true })
        coursesBatch.push(validData)
      } catch (err) {
        console.error('Validation error for course:', err.details)
      }
    }

    if (coursesBatch.length > 0) {
      console.log(`Đang chèn ${coursesBatch.length} khóa học vào database...`)
      await db.collection(courseModel.COURSE_COLLECTION_NAME).insertMany(coursesBatch)
      console.log('✅ Hoàn tất seed 1000 khóa học!')
    }

  } catch (error) {
    console.error('❌ Lỗi khi seed courses:', error)
  } finally {
    await CLOSE_DB()
    process.exit(0)
  }
}

seed1000Courses()
