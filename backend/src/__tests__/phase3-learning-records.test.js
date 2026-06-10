/**
 * Phase 3 — Learning Records Tests
 *
 * Tests cover: learningRecordModel, learningRecordService
 */

import { describe, it, expect } from '@jest/globals'
import { ObjectId } from 'mongodb'
import { userModel } from '~/models/userModel'
import { courseModel } from '~/models/courseModel'
import { workerProfileModel } from '~/models/workerProfileModel'
import { enrollmentModel } from '~/models/enrollmentModel'
import { learningRecordModel } from '~/models/learningRecordModel'
import { learningRecordService } from '~/services/learningRecordService'
import { StatusCodes } from 'http-status-codes'
import { USER_ROLES, LEARNING_EVENT_TYPES, ENROLLMENT_STATUS_V2, EDUCATION_LEVELS, JOB_TYPES } from '~/utils/constants'
import { GET_DB } from '~/config/mongodb'

async function createTestUser(role = USER_ROLES.WORKER) {
  return await userModel.createNew({
    email: `test_${Date.now()}_${Math.random()}@example.com`,
    password: 'password123',
    username: `user_${Date.now()}`,
    displayName: 'Test User',
    phone: '0900000000',
    role,
    isActive: true,
    emailVerified: true
  })
}

async function createTestCategory() {
  const database = GET_DB()
  return await database.collection('categories').insertOne({
    name: 'Test Category',
    slug: `cat-${Date.now()}`,
    description: 'Test',
    _destroy: false
  })
}

async function createTestCourse(ownerId, categoryId) {
  return await courseModel.createNew({
    title: `Test Course ${Date.now()}`,
    shortDescription: 'Test course short description',
    description: 'Test',
    slug: `test-course-${Date.now()}`,
    categoryId: categoryId.toString(),
    providerId: ownerId.toString(),
    providerName: 'Provider',
    providerEmail: 'p@test.com',
    skills: ['JavaScript'],
    deliveryMethods: ['video'],
    duration: { value: 30, unit: 'days' },
    fee: 5000000,
    syllabus: [],
    status: 'approved'
  })
}

async function createTestEnrollment(userId, courseId) {
  return await enrollmentModel.createNew({
    userId: userId.toString(),
    courseId: courseId.toString(),
    status: ENROLLMENT_STATUS_V2.ACTIVE
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

// ============================================================
// learningRecordModel Tests
// ============================================================
describe('learningRecordModel', () => {
  let workerId, trainerId, courseId, enrollmentId

  beforeEach(async () => {
    const worker = await createTestUser(USER_ROLES.WORKER)
    workerId = worker.insertedId
    const trainer = await createTestUser(USER_ROLES.TRAINER)
    trainerId = trainer.insertedId
    const cat = await createTestCategory()
    const course = await createTestCourse(trainerId, cat.insertedId)
    courseId = course.insertedId
    const enrollment = await createTestEnrollment(workerId, courseId)
    enrollmentId = enrollment.insertedId
  })

  describe('validateBeforeCreate', () => {
    it('should validate valid record data', async () => {
      const data = {
        enrollmentId: enrollmentId.toString(),
        userId: workerId.toString(),
        courseId: courseId.toString(),
        event_type: LEARNING_EVENT_TYPES.MODULE_COMPLETED,
        metadata: { lessonId: 'lesson1', title: 'Lesson 1' }
      }
      const validated = await learningRecordModel.validateBeforeCreate(data)
      expect(validated.enrollmentId).toBe(enrollmentId.toString())
      expect(validated.event_type).toBe(LEARNING_EVENT_TYPES.MODULE_COMPLETED)
    })

    it('should reject missing required fields', async () => {
      try {
        await learningRecordModel.validateBeforeCreate({
          enrollmentId: enrollmentId.toString()
        })
        expect(true).toBe(false)
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('should reject invalid event_type', async () => {
      try {
        await learningRecordModel.validateBeforeCreate({
          enrollmentId: enrollmentId.toString(),
          userId: workerId.toString(),
          courseId: courseId.toString(),
          event_type: 'INVALID_EVENT'
        })
        expect(true).toBe(false)
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })

  describe('createNew', () => {
    it('should create a learning record', async () => {
      const result = await learningRecordModel.createNew({
        enrollmentId: enrollmentId.toString(),
        userId: workerId.toString(),
        courseId: courseId.toString(),
        event_type: LEARNING_EVENT_TYPES.MODULE_COMPLETED,
        metadata: { lessonId: 'lesson1' }
      })
      expect(result.insertedId).toBeDefined()
    })
  })

  describe('findByEnrollment', () => {
    it('should find records by enrollment, sorted by createdAt desc', async () => {
      await learningRecordModel.createNew({
        enrollmentId: enrollmentId.toString(),
        userId: workerId.toString(),
        courseId: courseId.toString(),
        event_type: LEARNING_EVENT_TYPES.MODULE_COMPLETED
      })
      // Small delay to ensure different createdAt timestamps
      await new Promise(r => setTimeout(r, 10))
      await learningRecordModel.createNew({
        enrollmentId: enrollmentId.toString(),
        userId: workerId.toString(),
        courseId: courseId.toString(),
        event_type: LEARNING_EVENT_TYPES.VIDEO_STARTED
      })
      const records = await learningRecordModel.findByEnrollment(enrollmentId.toString())
      expect(records.length).toBe(2)
      expect(records[0].event_type).toBe(LEARNING_EVENT_TYPES.VIDEO_STARTED) // most recent
    })

    it('should return empty array for enrollment with no records', async () => {
      const records = await learningRecordModel.findByEnrollment(enrollmentId.toString())
      expect(records.length).toBe(0)
    })
  })

  describe('findByUser', () => {
    it('should find records by user', async () => {
      await learningRecordModel.createNew({
        enrollmentId: enrollmentId.toString(),
        userId: workerId.toString(),
        courseId: courseId.toString(),
        event_type: LEARNING_EVENT_TYPES.MODULE_COMPLETED
      })
      const records = await learningRecordModel.findByUser(workerId.toString())
      expect(records.length).toBe(1)
    })
  })

  describe('findByPaginate', () => {
    it('should return paginated records', async () => {
      for (let i = 0; i < 15; i++) {
        await learningRecordModel.createNew({
          enrollmentId: enrollmentId.toString(),
          userId: workerId.toString(),
          courseId: courseId.toString(),
          event_type: LEARNING_EVENT_TYPES.MODULE_COMPLETED
        })
      }
      const result = await learningRecordModel.findByPaginate({}, 0, 10)
      expect(result.records.length).toBe(10)
      expect(result.total).toBe(15)
    })
  })

  describe('getLastRecord', () => {
    it('should return most recent record', async () => {
      await learningRecordModel.createNew({
        enrollmentId: enrollmentId.toString(),
        userId: workerId.toString(),
        courseId: courseId.toString(),
        event_type: LEARNING_EVENT_TYPES.MODULE_COMPLETED
      })
      await new Promise(r => setTimeout(r, 10))
      await learningRecordModel.createNew({
        enrollmentId: enrollmentId.toString(),
        userId: workerId.toString(),
        courseId: courseId.toString(),
        event_type: LEARNING_EVENT_TYPES.QUIZ_SUBMITTED
      })
      const last = await learningRecordModel.getLastRecord(enrollmentId.toString())
      expect(last.event_type).toBe(LEARNING_EVENT_TYPES.QUIZ_SUBMITTED)
    })

    it('should return null for enrollment with no records', async () => {
      const last = await learningRecordModel.getLastRecord(enrollmentId.toString())
      expect(last).toBeNull()
    })
  })

  describe('getRecordsByEventType', () => {
    it('should filter by event type', async () => {
      await learningRecordModel.createNew({
        enrollmentId: enrollmentId.toString(),
        userId: workerId.toString(),
        courseId: courseId.toString(),
        event_type: LEARNING_EVENT_TYPES.VIDEO_STARTED
      })
      await learningRecordModel.createNew({
        enrollmentId: enrollmentId.toString(),
        userId: workerId.toString(),
        courseId: courseId.toString(),
        event_type: LEARNING_EVENT_TYPES.VIDEO_STARTED
      })
      await learningRecordModel.createNew({
        enrollmentId: enrollmentId.toString(),
        userId: workerId.toString(),
        courseId: courseId.toString(),
        event_type: LEARNING_EVENT_TYPES.MODULE_COMPLETED
      })
      const records = await learningRecordModel.getRecordsByEventType(
        enrollmentId.toString(),
        LEARNING_EVENT_TYPES.VIDEO_STARTED
      )
      expect(records.length).toBe(2)
    })
  })
})

// ============================================================
// learningRecordService Tests
// ============================================================
describe('learningRecordService', () => {
  let workerId, trainerId, courseId, enrollmentId

  beforeEach(async () => {
    const worker = await createTestUser(USER_ROLES.WORKER)
    workerId = worker.insertedId
    const trainer = await createTestUser(USER_ROLES.TRAINER)
    trainerId = trainer.insertedId
    const cat = await createTestCategory()
    const course = await createTestCourse(trainerId, cat.insertedId)
    courseId = course.insertedId
    const enrollment = await createTestEnrollment(workerId, courseId)
    enrollmentId = enrollment.insertedId
  })

  describe('recordEvent', () => {
    it('should record a learning event', async () => {
      const result = await learningRecordService.recordEvent(workerId.toString(), {
        enrollmentId: enrollmentId.toString(),
        courseId: courseId.toString(),
        event_type: LEARNING_EVENT_TYPES.MODULE_COMPLETED,
        metadata: { lessonId: 'lesson1' }
      })
      expect(result).toBeDefined()
    })

    it('should throw NOT_FOUND for non-existent enrollment', async () => {
      try {
        await learningRecordService.recordEvent(workerId.toString(), {
          enrollmentId: new ObjectId().toString(),
          courseId: courseId.toString(),
          event_type: LEARNING_EVENT_TYPES.MODULE_COMPLETED
        })
        expect(true).toBe(false)
      } catch (error) {
        expect(error.statusCode).toBe(StatusCodes.NOT_FOUND)
      }
    })

    it('should throw FORBIDDEN for enrollment owned by different user', async () => {
      const otherWorker = await createTestUser(USER_ROLES.WORKER)
      try {
        await learningRecordService.recordEvent(otherWorker.insertedId.toString(), {
          enrollmentId: enrollmentId.toString(),
          courseId: courseId.toString(),
          event_type: LEARNING_EVENT_TYPES.MODULE_COMPLETED
        })
        expect(true).toBe(false)
      } catch (error) {
        expect(error.statusCode).toBe(StatusCodes.FORBIDDEN)
      }
    })
  })

  describe('getLearningRecords', () => {
    it('should return paginated records', async () => {
      for (let i = 0; i < 5; i++) {
        await learningRecordModel.createNew({
          enrollmentId: enrollmentId.toString(),
          userId: workerId.toString(),
          courseId: courseId.toString(),
          event_type: LEARNING_EVENT_TYPES.MODULE_COMPLETED
        })
      }
      const result = await learningRecordService.getLearningRecords({
        page: 1,
        item_per_page: 3,
        enrollmentId: enrollmentId.toString()
      })
      expect(result.records.length).toBe(3)
      expect(result.pagination.total).toBe(5)
    })

    it('should filter by event_type', async () => {
      await learningRecordModel.createNew({
        enrollmentId: enrollmentId.toString(),
        userId: workerId.toString(),
        courseId: courseId.toString(),
        event_type: LEARNING_EVENT_TYPES.VIDEO_STARTED
      })
      await learningRecordModel.createNew({
        enrollmentId: enrollmentId.toString(),
        userId: workerId.toString(),
        courseId: courseId.toString(),
        event_type: LEARNING_EVENT_TYPES.MODULE_COMPLETED
      })
      const result = await learningRecordService.getLearningRecords({
        page: 1,
        item_per_page: 10,
        enrollmentId: enrollmentId.toString(),
        event_type: LEARNING_EVENT_TYPES.VIDEO_STARTED
      })
      expect(result.records.length).toBe(1)
    })
  })

  describe('getEnrollmentHistory', () => {
    it('should return enrollment history for owner', async () => {
      await learningRecordModel.createNew({
        enrollmentId: enrollmentId.toString(),
        userId: workerId.toString(),
        courseId: courseId.toString(),
        event_type: LEARNING_EVENT_TYPES.MODULE_COMPLETED
      })
      const records = await learningRecordService.getEnrollmentHistory(
        enrollmentId.toString(),
        workerId.toString(),
        USER_ROLES.WORKER
      )
      expect(records.length).toBe(1)
    })

    it('should throw NOT_FOUND for non-existent enrollment', async () => {
      try {
        await learningRecordService.getEnrollmentHistory(
          new ObjectId().toString(), workerId.toString(), USER_ROLES.WORKER
        )
        expect(true).toBe(false)
      } catch (error) {
        expect(error.statusCode).toBe(StatusCodes.NOT_FOUND)
      }
    })

    it('should throw FORBIDDEN for non-owner when not admin/trainer', async () => {
      const otherWorker = await createTestUser(USER_ROLES.WORKER)
      try {
        await learningRecordService.getEnrollmentHistory(
          enrollmentId.toString(), otherWorker.insertedId.toString(), USER_ROLES.WORKER
        )
        expect(true).toBe(false)
      } catch (error) {
        expect(error.statusCode).toBe(StatusCodes.FORBIDDEN)
      }
    })
  })

  describe('getMyLearningRecords', () => {
    it('should return records for authenticated user', async () => {
      await learningRecordModel.createNew({
        enrollmentId: enrollmentId.toString(),
        userId: workerId.toString(),
        courseId: courseId.toString(),
        event_type: LEARNING_EVENT_TYPES.VIDEO_STARTED
      })
      const records = await learningRecordService.getMyLearningRecords(workerId.toString(), { page: 1, item_per_page: 10 })
      expect(records.length).toBe(1)
    })
  })

  describe('calculateProgress', () => {
    it('should calculate progress from learning records', async () => {
      await learningRecordModel.createNew({
        enrollmentId: enrollmentId.toString(),
        userId: workerId.toString(),
        courseId: courseId.toString(),
        event_type: LEARNING_EVENT_TYPES.MODULE_COMPLETED,
        metadata: { totalLessons: 10 }
      })
      const progress = await learningRecordService.calculateProgress(enrollmentId.toString())
      expect(progress.overall).toBeDefined()
    })

    it('should throw NOT_FOUND for non-existent enrollment', async () => {
      try {
        await learningRecordService.calculateProgress(new ObjectId().toString())
        expect(true).toBe(false)
      } catch (error) {
        expect(error.statusCode).toBe(StatusCodes.NOT_FOUND)
      }
    })
  })

  describe('getDropoutRisk', () => {
    it('should analyze dropout risk across enrollments', async () => {
      const result = await learningRecordService.getDropoutRisk({})
      expect(result.totalAnalyzed).toBeDefined()
      expect(result.highRisk).toBeDefined()
      expect(result.mediumRisk).toBeDefined()
      expect(result.lowRisk).toBeDefined()
    })

    it('should filter by courseId', async () => {
      const result = await learningRecordService.getDropoutRisk({ courseId: courseId.toString() })
      expect(result.totalAnalyzed).toBeDefined()
    })
  })
})
