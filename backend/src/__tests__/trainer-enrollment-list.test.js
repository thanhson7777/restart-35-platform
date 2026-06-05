import { describe, it, expect, beforeEach } from '@jest/globals'
import { ObjectId } from 'mongodb'
import { courseModel } from '~/models/courseModel'
import { enrollmentModel } from '~/models/enrollmentModel'
import { userModel } from '~/models/userModel'
import { workerProfileModel } from '~/models/workerProfileModel'
import { enrollmentService } from '~/services/enrollmentService'
import { USER_ROLES, ENROLLMENT_STATUS_V2 } from '~/utils/constants'
import { GET_DB } from '~/config/mongodb'

const db = () => GET_DB()

async function createTestUser(role = USER_ROLES.WORKER, displayName = 'Test User', email = '') {
  const uniq = `${Date.now()}_${Math.random()}`;
  return await userModel.createNew({
    email: email || `test_${uniq}@example.com`,
    password: 'password123',
    username: `user_${uniq}`,
    displayName,
    phone: '0900000000',
    role,
    isActive: true,
    emailVerified: true
  })
}

async function createTestCategory() {
  const database = db()
  return await database.collection('categories').insertOne({
    name: 'Test Category',
    slug: `cat-${Date.now()}_${Math.random()}`,
    description: 'Test description',
    _destroy: false
  })
}

async function createTestCourse(ownerId, categoryId, title = '') {
  const uniq = `${Date.now()}_${Math.random()}`;
  return await courseModel.createNew({
    title: title || `Test Course ${uniq}`,
    shortDescription: 'Test course short description',
    description: 'Test course description',
    slug: `test-course-${uniq}`,
    categoryId: categoryId.toString(),
    providerId: ownerId.toString(),
    providerName: 'Test Provider',
    providerEmail: 'provider@test.com',
    skills: ['JavaScript', 'React'],
    deliveryMethods: ['video'],
    duration: { value: 30, unit: 'days' },
    fee: 5000000,
    syllabus: [],
    status: 'approved',
    isActive: true
  })
}

describe('getTrainerEnrollments Service', () => {
  let trainer1Id, trainer2Id, categoryId
  let course1Id, course2Id
  let worker1Id, worker2Id

  beforeEach(async () => {
    // 1. Create trainers
    const t1 = await createTestUser(USER_ROLES.TRAINER, 'Trainer One')
    trainer1Id = t1.insertedId.toString()

    const t2 = await createTestUser(USER_ROLES.TRAINER, 'Trainer Two')
    trainer2Id = t2.insertedId.toString()

    // 2. Create category & courses
    const cat = await createTestCategory()
    categoryId = cat.insertedId.toString()

    const c1 = await createTestCourse(trainer1Id, categoryId, 'React Basics')
    course1Id = c1.insertedId.toString()

    const c2 = await createTestCourse(trainer2Id, categoryId, 'Angular Advanced')
    course2Id = c2.insertedId.toString()

    // 3. Create workers (students)
    const w1 = await createTestUser(USER_ROLES.WORKER, 'Alice Johnson', 'alice@johnson.com')
    worker1Id = w1.insertedId.toString()

    const w2 = await createTestUser(USER_ROLES.WORKER, 'Bob Smith', 'bob@smith.com')
    worker2Id = w2.insertedId.toString()

    // 4. Create enrollments
    // Enrollment 1: Alice in Course 1 (Trainer 1), Active, Dropout Risk: High
    await enrollmentModel.createNew({
      userId: worker1Id,
      courseId: course1Id,
      status: ENROLLMENT_STATUS_V2.ACTIVE,
      dropout_risk: {
        score: 75,
        level: 'high',
        reasons: ['Vắng mặt nhiều'],
        last_calculated_at: Date.now(),
        interventions_sent: []
      }
    }, true)

    // Enrollment 2: Bob in Course 1 (Trainer 1), Suspended, Dropout Risk: Low
    await enrollmentModel.createNew({
      userId: worker2Id,
      courseId: course1Id,
      status: ENROLLMENT_STATUS_V2.SUSPENDED,
      dropout_risk: {
        score: 10,
        level: 'low',
        reasons: [],
        last_calculated_at: Date.now(),
        interventions_sent: []
      }
    }, true)

    // Enrollment 3: Bob in Course 2 (Trainer 2), Active, Dropout Risk: Low
    await enrollmentModel.createNew({
      userId: worker2Id,
      courseId: course2Id,
      status: ENROLLMENT_STATUS_V2.ACTIVE,
      dropout_risk: {
        score: 5,
        level: 'low',
        reasons: [],
        last_calculated_at: Date.now(),
        interventions_sent: []
      }
    }, true)
  })

  it('should fetch enrollments for courses owned by the trainer', async () => {
    // Trainer 1 owns course 1, should have 2 enrollments (Alice & Bob)
    const result = await enrollmentService.getTrainerEnrollments({}, trainer1Id)
    expect(result.enrollments.length).toBe(2)
    expect(result.pagination.totalRecords).toBe(2)
    
    // Enrollments should contain enriched user & course info
    const names = result.enrollments.map(e => e.user.displayName)
    expect(names).toContain('Alice Johnson')
    expect(names).toContain('Bob Smith')

    // Trainer 2 owns course 2, should have 1 enrollment (Bob)
    const result2 = await enrollmentService.getTrainerEnrollments({}, trainer2Id)
    expect(result2.enrollments.length).toBe(1)
    expect(result2.enrollments[0].user.displayName).toBe('Bob Smith')
    expect(result2.enrollments[0].course.title).toBe('Angular Advanced')
  })

  it('should filter enrollments by courseId', async () => {
    const result = await enrollmentService.getTrainerEnrollments({ courseId: course1Id }, trainer1Id)
    expect(result.enrollments.length).toBe(2)

    // Trying to filter by course owned by other trainer should reject
    await expect(
      enrollmentService.getTrainerEnrollments({ courseId: course2Id }, trainer1Id)
    ).rejects.toThrow('Bạn không có quyền xem thông tin khóa học này!')
  })

  it('should filter enrollments by status', async () => {
    const result = await enrollmentService.getTrainerEnrollments({ status: ENROLLMENT_STATUS_V2.SUSPENDED }, trainer1Id)
    expect(result.enrollments.length).toBe(1)
    expect(result.enrollments[0].user.displayName).toBe('Bob Smith')
  })

  it('should filter enrollments by riskLevel', async () => {
    const result = await enrollmentService.getTrainerEnrollments({ riskLevel: 'high' }, trainer1Id)
    expect(result.enrollments.length).toBe(1)
    expect(result.enrollments[0].user.displayName).toBe('Alice Johnson')
  })

  it('should search enrollments by user displayName or email', async () => {
    // Search by name (case-insensitive)
    const result1 = await enrollmentService.getTrainerEnrollments({ search: 'alice' }, trainer1Id)
    expect(result1.enrollments.length).toBe(1)
    expect(result1.enrollments[0].user.displayName).toBe('Alice Johnson')

    // Search by email
    const result2 = await enrollmentService.getTrainerEnrollments({ search: 'bob@smith.com' }, trainer1Id)
    expect(result2.enrollments.length).toBe(1)
    expect(result2.enrollments[0].user.displayName).toBe('Bob Smith')

    // Search query with no match
    const result3 = await enrollmentService.getTrainerEnrollments({ search: 'nonexistent' }, trainer1Id)
    expect(result3.enrollments.length).toBe(0)
  })
})
