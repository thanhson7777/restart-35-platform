/**
 * Phase 2 — Course & Enrollment Tests
 *
 * Tests cover: courseModel, enrollmentModel, courseService, enrollmentService
 */

import { describe, it, expect } from '@jest/globals'
import { ObjectId } from 'mongodb'
import { courseModel } from '~/models/courseModel'
import { workerProfileModel } from '~/models/workerProfileModel'
import { enrollmentModel } from '~/models/enrollmentModel'
import { userModel } from '~/models/userModel'
import { courseService } from '~/services/courseService'
import { enrollmentService } from '~/services/enrollmentService'
import { StatusCodes } from 'http-status-codes'
import { USER_ROLES, ENROLLMENT_STATUS_V2, EDUCATION_LEVELS, JOB_TYPES } from '~/utils/constants'
import { GET_DB, SET_DB } from '~/config/mongodb'

const db = () => GET_DB()

async function createTestUser(role = USER_ROLES.WORKER, extra = {}) {
  return await userModel.createNew({
    email: `test_${Date.now()}_${Math.random()}@example.com`,
    password: 'password123',
    username: `user_${Date.now()}`,
    displayName: 'Test User',
    phone: '0900000000',
    role,
    isActive: true,
    emailVerified: true,
    ...extra
  })
}

async function createTestWorkerProfile(userId) {
  const created = await workerProfileModel.createNew({
    userId: userId.toString(),
    currentStep: 1,
    isCompleted: false,
    basicInfo: {
      age: 45,
      gender: 'male',
      province: '79',
      education: EDUCATION_LEVELS.UNIVERSITY,
      maritalStatus: 'single',
      phone: '0900000000'
    },
    employmentHistory: [{
      occupation: 'Software Engineer',
      companyName: 'Tech Corp',
      jobType: JOB_TYPES.FULL_TIME
    }]
  }, true)
  await workerProfileModel.completeProfile(userId.toString())
  return created
}

async function createTestCategory() {
  const database = db()
  return await database.collection('categories').insertOne({
    name: 'Test Category',
    slug: `cat-${Date.now()}`,
    description: 'Test description',
    _destroy: false
  })
}

async function createTestCourse(ownerId, categoryId, status = 'approved') {
  return await courseModel.createNew({
    title: `Test Course ${Date.now()}`,
    shortDescription: 'Test course short description',
    description: 'Test course description',
    slug: `test-course-${Date.now()}`,
    categoryId: categoryId.toString(),
    providerId: ownerId.toString(),
    providerName: 'Test Provider',
    providerEmail: 'provider@test.com',
    skills: ['JavaScript', 'React'],
    deliveryMethods: ['video'],
    duration: { value: 30, unit: 'days' },
    fee: 5000000,
    syllabus: [],
    status,
    isActive: true
  })
}

// ============================================================
// enrollmentModel Tests
// ============================================================
describe('enrollmentModel', () => {
  let trainerId, workerId, courseId

  beforeEach(async () => {
    const trainer = await createTestUser(USER_ROLES.TRAINER)
    trainerId = trainer.insertedId
    const worker = await createTestUser(USER_ROLES.WORKER)
    workerId = worker.insertedId
    const cat = await createTestCategory()
    const course = await createTestCourse(trainerId, cat.insertedId, 'approved')
    courseId = course.insertedId
  })

  describe('createNew', () => {
    it('should create enrollment with valid data', async () => {
      const result = await enrollmentModel.createNew({
        userId: workerId.toString(),
        courseId: courseId.toString(),
        status: ENROLLMENT_STATUS_V2.ACTIVE
      })
      expect(result.insertedId).toBeDefined()
    })

    it('should create enrollment with WAITLISTED status', async () => {
      const result = await enrollmentModel.createNew({
        userId: workerId.toString(),
        courseId: courseId.toString(),
        status: ENROLLMENT_STATUS_V2.WAITLISTED
      })
      expect(result.insertedId).toBeDefined()
    })
  })

  describe('findOneById', () => {
    it('should find enrollment by id', async () => {
      const created = await enrollmentModel.createNew({
        userId: workerId.toString(),
        courseId: courseId.toString()
      })
      const found = await enrollmentModel.findOneById(created.insertedId)
      expect(found).not.toBeNull()
      expect(found.userId).toBe(workerId.toString())
    })

    it('should return null for non-existent id', async () => {
      const found = await enrollmentModel.findOneById(new ObjectId())
      expect(found).toBeNull()
    })
  })

  describe('findOneByUserAndCourse', () => {
    it('should find enrollment by user and course', async () => {
      await enrollmentModel.createNew({ userId: workerId.toString(), courseId: courseId.toString() })
      const found = await enrollmentModel.findOneByUserAndCourse(workerId.toString(), courseId.toString())
      expect(found).not.toBeNull()
    })

    it('should return null when no enrollment exists', async () => {
      const found = await enrollmentModel.findOneByUserAndCourse(workerId.toString(), courseId.toString())
      expect(found).toBeNull()
    })
  })

  describe('findByUser', () => {
    it('should return enrollments for user', async () => {
      await enrollmentModel.createNew({ userId: workerId.toString(), courseId: courseId.toString() })
      const result = await enrollmentModel.findByUser(workerId.toString(), 0, 10, {})
      expect(result.enrollments.length).toBe(1)
      expect(result.totalEnrollments).toBe(1)
    })
  })

  describe('findByCourse', () => {
    it('should return enrollments for course', async () => {
      await enrollmentModel.createNew({ userId: workerId.toString(), courseId: courseId.toString() })
      const result = await enrollmentModel.findByCourse(courseId.toString(), 0, 10, {})
      expect(result.enrollments.length).toBe(1)
    })
  })

  describe('findCompletedByUser', () => {
    it('should return completed enrollments', async () => {
      await enrollmentModel.createNew({
        userId: workerId.toString(),
        courseId: courseId.toString(),
        status: ENROLLMENT_STATUS_V2.COMPLETED
      })
      const result = await enrollmentModel.findCompletedByUser(workerId.toString())
      expect(result.length).toBe(1)
    })

    it('should return empty array when no completed enrollments', async () => {
      await enrollmentModel.createNew({
        userId: workerId.toString(),
        courseId: courseId.toString(),
        status: ENROLLMENT_STATUS_V2.ACTIVE
      })
      const result = await enrollmentModel.findCompletedByUser(workerId.toString())
      expect(result.length).toBe(0)
    })
  })

  describe('updateStatus', () => {
    it('should update enrollment status', async () => {
      const created = await enrollmentModel.createNew({
        userId: workerId.toString(),
        courseId: courseId.toString()
      })
      const updated = await enrollmentModel.updateStatus(
        created.insertedId,
        ENROLLMENT_STATUS_V2.COMPLETED,
        { completedAt: new Date() }
      )
      expect(updated.status).toBe(ENROLLMENT_STATUS_V2.COMPLETED)
    })
  })

  describe('updateProgress', () => {
    it('should update enrollment progress', async () => {
      const created = await enrollmentModel.createNew({
        userId: workerId.toString(),
        courseId: courseId.toString()
      })
      const updated = await enrollmentModel.updateProgress(created.insertedId, {
        percentage: 50,
        currentLesson: 5,
        totalLessons: 10
      })
      expect(updated.progress.percentage).toBe(50)
      expect(updated.progress.currentLesson).toBe(5)
    })
  })

  describe('getStatsByUser', () => {
    it('should return enrollment stats for user', async () => {
      await enrollmentModel.createNew({ userId: workerId.toString(), courseId: courseId.toString() })
      const stats = await enrollmentModel.getStatsByUser(workerId.toString())
      expect(stats.total).toBe(1)
    })
  })

  describe('getOverallStats', () => {
    it('should return overall enrollment stats', async () => {
      await enrollmentModel.createNew({ userId: workerId.toString(), courseId: courseId.toString() })
      const stats = await enrollmentModel.getOverallStats()
      expect(stats.total).toBe(1)
      expect(stats.byStatus).toBeDefined()
    })
  })

  describe('getMonthlyTrend', () => {
    it('should return monthly enrollment trend', async () => {
      await enrollmentModel.createNew({ userId: workerId.toString(), courseId: courseId.toString() })
      const trend = await enrollmentModel.getMonthlyTrend(6)
      expect(Array.isArray(trend)).toBe(true)
    })
  })
})

// ============================================================
// enrollmentService Tests
// ============================================================
describe('enrollmentService', () => {
  let trainerId, workerId, courseId

  beforeEach(async () => {
    const trainer = await createTestUser(USER_ROLES.TRAINER)
    trainerId = trainer.insertedId
    const worker = await createTestUser(USER_ROLES.WORKER)
    workerId = worker.insertedId
    await createTestWorkerProfile(workerId)
    const cat = await createTestCategory()
    const course = await createTestCourse(trainerId, cat.insertedId, 'approved')
    courseId = course.insertedId
  })

  describe('enrollCourse', () => {
    it('should enroll worker in approved course', async () => {
      const result = await enrollmentService.enrollCourse(
        workerId.toString(),
        courseId.toString(),
        { motivation: 'Learn React', source: 'direct' }
      )
      expect(result.enrollment).toBeDefined()
      expect(result.enrollment._id).toBeDefined()
    })

    it('should throw NOT_FOUND for non-existent course', async () => {
      const fakeId = new ObjectId()
      try {
        await enrollmentService.enrollCourse(
          workerId.toString(), fakeId.toString(),
          { motivation: 'Learn', source: 'direct' }
        )
        expect(true).toBe(false)
      } catch (error) {
        expect(error.statusCode).toBe(StatusCodes.NOT_FOUND)
      }
    })

    it('should throw CONFLICT for duplicate enrollment', async () => {
      await enrollmentService.enrollCourse(workerId.toString(), courseId.toString(), { motivation: 'Learn', source: 'direct' })
      try {
        await enrollmentService.enrollCourse(workerId.toString(), courseId.toString(), { motivation: 'Learn again', source: 'direct' })
        expect(true).toBe(false)
      } catch (error) {
        expect(error.statusCode).toBe(StatusCodes.CONFLICT)
      }
    })

    it('should throw FORBIDDEN for trainer role', async () => {
      const trainer = await createTestUser(USER_ROLES.TRAINER)
      try {
        await enrollmentService.enrollCourse(
          trainer.insertedId.toString(), courseId.toString(),
          { motivation: 'Learn', source: 'direct' }
        )
        expect(true).toBe(false)
      } catch (error) {
        expect(error.statusCode).toBe(StatusCodes.FORBIDDEN)
      }
    })

    it('should throw BAD_REQUEST for non-approved course', async () => {
      const cat = await createTestCategory()
      const draftCourse = await createTestCourse(trainerId, cat.insertedId, 'draft')
      try {
        await enrollmentService.enrollCourse(
          workerId.toString(), draftCourse.insertedId.toString(),
          { motivation: 'Learn', source: 'direct' }
        )
        expect(true).toBe(false)
      } catch (error) {
        expect(error.statusCode).toBe(StatusCodes.BAD_REQUEST)
      }
    })
  })

  describe('getMyEnrollments', () => {
    it('should return enrollments for user', async () => {
      await enrollmentService.enrollCourse(workerId.toString(), courseId.toString(), { motivation: 'Learn', source: 'direct' })
      const result = await enrollmentService.getMyEnrollments(workerId.toString(), { page: 1, limit: 10 })
      expect(result.enrollments.length).toBe(1)
    })

    it('should return empty array for user with no enrollments', async () => {
      const result = await enrollmentService.getMyEnrollments(workerId.toString(), { page: 1, limit: 10 })
      expect(result.enrollments.length).toBe(0)
    })

    it('should filter by status', async () => {
      await enrollmentService.enrollCourse(workerId.toString(), courseId.toString(), { motivation: 'Learn', source: 'direct' })
      const result = await enrollmentService.getMyEnrollments(workerId.toString(), {
        page: 1, limit: 10, status: ENROLLMENT_STATUS_V2.COMPLETED
      })
      expect(result.enrollments.length).toBe(0)
    })
  })

  describe('getEnrollmentById', () => {
    it('should return enrollment by id for owner', async () => {
      const enrolled = await enrollmentService.enrollCourse(
        workerId.toString(), courseId.toString(), { motivation: 'Learn', source: 'direct' }
      )
      const found = await enrollmentService.getEnrollmentById(
        enrolled.enrollment._id.toString(), workerId.toString()
      )
      expect(found).toBeDefined()
    })

    it('should throw NOT_FOUND for non-existent enrollment', async () => {
      try {
        await enrollmentService.getEnrollmentById(new ObjectId().toString())
        expect(true).toBe(false)
      } catch (error) {
        expect(error.statusCode).toBe(StatusCodes.NOT_FOUND)
      }
    })

    it('should throw FORBIDDEN for non-owner/non-trainer', async () => {
      const enrolled = await enrollmentService.enrollCourse(
        workerId.toString(), courseId.toString(), { motivation: 'Learn', source: 'direct' }
      )
      const otherWorker = await createTestUser(USER_ROLES.WORKER)
      try {
        await enrollmentService.getEnrollmentById(
          enrolled.enrollment._id.toString(), otherWorker.insertedId.toString()
        )
        expect(true).toBe(false)
      } catch (error) {
        expect(error.statusCode).toBe(StatusCodes.FORBIDDEN)
      }
    })
  })

  describe('updateProgress', () => {
    it('should update progress for trainer', async () => {
      const enrolled = await enrollmentService.enrollCourse(
        workerId.toString(), courseId.toString(), { motivation: 'Learn', source: 'direct' }
      )
      const updated = await enrollmentService.updateProgress(
        enrolled.enrollment._id.toString(),
        { percentage: 75, currentLesson: 7, totalLessons: 10 },
        trainerId.toString()
      )
      expect(updated.progress.percentage).toBe(75)
    })

    it('should throw NOT_FOUND for non-existent enrollment', async () => {
      try {
        await enrollmentService.updateProgress(
          new ObjectId().toString(), { percentage: 50 }, trainerId.toString()
        )
        expect(true).toBe(false)
      } catch (error) {
        expect(error.statusCode).toBe(StatusCodes.NOT_FOUND)
      }
    })
  })

  describe('completeEnrollment', () => {
    it('should complete enrollment', async () => {
      const enrolled = await enrollmentService.enrollCourse(
        workerId.toString(), courseId.toString(), { motivation: 'Learn', source: 'direct' }
      )
      const completed = await enrollmentService.completeEnrollment(
        enrolled.enrollment._id.toString(),
        trainerId.toString(),
        { score: 85 }
      )
      expect(completed.status).toBe(ENROLLMENT_STATUS_V2.COMPLETED)
    })

    it('should throw NOT_FOUND for non-existent enrollment', async () => {
      try {
        await enrollmentService.completeEnrollment(new ObjectId().toString(), trainerId.toString())
        expect(true).toBe(false)
      } catch (error) {
        expect(error.statusCode).toBe(StatusCodes.NOT_FOUND)
      }
    })

    it('should throw BAD_REQUEST for already completed enrollment', async () => {
      const enrolled = await enrollmentService.enrollCourse(
        workerId.toString(), courseId.toString(), { motivation: 'Learn', source: 'direct' }
      )
      await enrollmentService.completeEnrollment(enrolled.enrollment._id.toString(), trainerId.toString())
      try {
        await enrollmentService.completeEnrollment(enrolled.enrollment._id.toString(), trainerId.toString())
        expect(true).toBe(false)
      } catch (error) {
        expect(error.statusCode).toBe(StatusCodes.BAD_REQUEST)
      }
    })
  })

  describe('cancelEnrollment', () => {
    it('should cancel enrollment for worker', async () => {
      const enrolled = await enrollmentService.enrollCourse(
        workerId.toString(), courseId.toString(), { motivation: 'Learn', source: 'direct' }
      )
      const cancelled = await enrollmentService.cancelEnrollment(
        enrolled.enrollment._id.toString(), workerId.toString(), 'Changed my mind'
      )
      expect(cancelled.status).toBe(ENROLLMENT_STATUS_V2.DROPPED)
    })

    it('should throw FORBIDDEN for non-owner', async () => {
      const enrolled = await enrollmentService.enrollCourse(
        workerId.toString(), courseId.toString(), { motivation: 'Learn', source: 'direct' }
      )
      const otherWorker = await createTestUser(USER_ROLES.WORKER)
      try {
        await enrollmentService.cancelEnrollment(
          enrolled.enrollment._id.toString(), otherWorker.insertedId.toString(), 'Reason'
        )
        expect(true).toBe(false)
      } catch (error) {
        expect(error.statusCode).toBe(StatusCodes.FORBIDDEN)
      }
    })
  })

  describe('dropEnrollment', () => {
    it('should drop enrollment', async () => {
      const enrolled = await enrollmentService.enrollCourse(
        workerId.toString(), courseId.toString(), { motivation: 'Learn', source: 'direct' }
      )
      const dropped = await enrollmentService.dropEnrollment(
        enrolled.enrollment._id.toString(), workerId.toString(), 'Cannot continue'
      )
      expect(dropped.status).toBe(ENROLLMENT_STATUS_V2.DROPPED)
    })
  })

  describe('getAdminStats', () => {
    it('should return admin enrollment stats', async () => {
      await enrollmentService.enrollCourse(workerId.toString(), courseId.toString(), { motivation: 'Learn', source: 'direct' })
      const stats = await enrollmentService.getAdminStats()
      expect(stats.total).toBeDefined()
      expect(stats.byStatus).toBeDefined()
    })
  })

  describe('checkEligibility', () => {
    it('should return eligible for valid profile and course', async () => {
      const profile = { age: 40, educationLevel: 'university' }
      const course = { eligibilityCriteria: { minAge: 18, maxAge: 60 } }
      const result = await enrollmentService.checkEligibility(profile, course)
      expect(result.eligible).toBe(true)
    })
  })
})

// ============================================================
// courseModel Tests
// ============================================================
describe('courseModel', () => {
  let trainerId, categoryId

  beforeEach(async () => {
    const trainer = await createTestUser(USER_ROLES.TRAINER)
    trainerId = trainer.insertedId
    const cat = await createTestCategory()
    categoryId = cat.insertedId
  })

  describe('createNew', () => {
    it('should create a course with valid data', async () => {
      const result = await courseModel.createNew({
        title: 'Test Course',
        shortDescription: 'Test short description',
        description: 'Test description',
        slug: `test-course-${Date.now()}`,
        categoryId: categoryId.toString(),
        providerId: trainerId.toString(),
        providerName: 'Test Provider',
        providerEmail: 'provider@test.com',
        skills: ['JavaScript'],
        deliveryMethods: ['video'],
        duration: { value: 30, unit: 'days' },
        fee: 5000000,
        syllabus: [],
        status: 'draft',
        isActive: true
      })
      expect(result.insertedId).toBeDefined()
    })
  })

  describe('findOneById', () => {
    it('should find course by id', async () => {
      const created = await courseModel.createNew({
        title: 'Find Test',
        shortDescription: 'Short desc',
        description: 'Test',
        slug: `find-test-${Date.now()}`,
        categoryId: categoryId.toString(),
        providerId: trainerId.toString(),
        providerName: 'Provider',
        providerEmail: 'p@test.com',
        skills: [],
        deliveryMethods: ['video'],
        fee: 1000,
        status: 'draft'
      })
      const found = await courseModel.findOneById(created.insertedId)
      expect(found).not.toBeNull()
      expect(found.title).toBe('Find Test')
    })
  })
})
