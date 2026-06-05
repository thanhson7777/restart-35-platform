import { describe, it, expect, beforeEach } from '@jest/globals'
import { ObjectId } from 'mongodb'
import { courseModel } from '~/models/courseModel'
import { userModel } from '~/models/userModel'
import { categoryModel } from '~/models/categoryModel'
import { courseService } from '~/services/courseService'
import { parseMultipartBody } from '~/routes/v1/courseRoute'
import { USER_ROLES, COURSE_STATUS } from '~/utils/constants'
import { GET_DB } from '~/config/mongodb'

const db = () => GET_DB()

async function createTestUser(role = USER_ROLES.TRAINER, displayName = 'Test Trainer') {
  const uniq = `${Date.now()}_${Math.random()}`;
  return await userModel.createNew({
    email: `test_${uniq}@example.com`,
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
  return await db().collection('categories').insertOne({
    name: 'Test Category',
    slug: `cat-${Date.now()}_${Math.random()}`,
    description: 'Test description',
    _destroy: false
  })
}

describe('Phase 4 — parseMultipartBody Middleware', () => {
  it('should parse stringified JSON objects and arrays', () => {
    const req = {
      body: {
        title: 'React for absolute beginners',
        duration: '{"value":6,"unit":"weeks"}',
        location: '{"type":"online","address":"","link":""}',
        skills: '["React","JavaScript"]',
        syllabus: '[{"week":1,"title":"Intro","content":"Hello","duration":"2h"}]',
        isFree: 'true',
        scholarshipEligibility: 'false',
        fee: '0',
        maxStudents: '25'
      }
    }
    const res = {}
    const next = jest.fn()

    parseMultipartBody(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(req.body.duration).toEqual({ value: 6, unit: 'weeks' })
    expect(req.body.location).toEqual({ type: 'online', address: '', link: '' })
    expect(req.body.skills).toEqual(['React', 'JavaScript'])
    expect(req.body.syllabus).toEqual([{ week: 1, title: 'Intro', content: 'Hello', duration: '2h' }])
    expect(req.body.isFree).toBe(true)
    expect(req.body.scholarshipEligibility).toBe(false)
    expect(req.body.fee).toBe(0)
    expect(req.body.maxStudents).toBe(25)
  })

  it('should ignore invalid JSON and leave them as strings', () => {
    const req = {
      body: {
        duration: '{invalidJSON}',
        skills: 'not-an-array'
      }
    }
    const res = {}
    const next = jest.fn()

    parseMultipartBody(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(req.body.duration).toBe('{invalidJSON}')
    expect(req.body.skills).toBe('not-an-array')
  })
})

describe('Phase 4 — Course CRUD Services', () => {
  let trainerId, categoryId

  beforeEach(async () => {
    const trainer = await createTestUser(USER_ROLES.TRAINER)
    trainerId = trainer.insertedId.toString()

    const cat = await createTestCategory()
    categoryId = cat.insertedId.toString()
  })

  describe('createCourse', () => {
    it('should create course in DRAFT status with valid data', async () => {
      const courseData = {
        title: 'Valid Course Title 10 chars',
        description: 'This is a long detailed description for the course that has at least fifty characters.',
        shortDescription: 'Short description',
        categoryId: categoryId,
        duration: { value: 12, unit: 'weeks' },
        location: { type: 'online' },
        fee: 0,
        isFree: true,
        maxStudents: 30,
        skills: ['Node.js'],
        prerequisites: [],
        requirements: [],
        syllabus: [],
        outcomes: []
      }

      const course = await courseService.createCourse(trainerId, courseData)
      expect(course).toBeDefined()
      expect(course._id).toBeDefined()
      expect(course.status).toBe(COURSE_STATUS.DRAFT)
      expect(course.providerId.toString()).toBe(trainerId)
      expect(course.title).toBe(courseData.title)
    })

    it('should throw FORBIDDEN for non-trainer user', async () => {
      const worker = await createTestUser(USER_ROLES.WORKER)
      const workerId = worker.insertedId.toString()

      const courseData = {
        title: 'Valid Course Title 10 chars',
        description: 'This is a long detailed description for the course that has at least fifty characters.',
        categoryId: categoryId
      }

      await expect(
        courseService.createCourse(workerId, courseData)
      ).rejects.toThrow('Chỉ Trung tâm đào tạo mới được tạo khóa học!')
    })
  })

  describe('updateCourse & submitForApproval', () => {
    let courseId

    beforeEach(async () => {
      const course = await courseModel.createNew({
        title: 'Initial Course Title 10 chars',
        description: 'This is a long detailed description for the course that has at least fifty characters.',
        shortDescription: 'Short description',
        categoryId: categoryId,
        providerId: trainerId,
        duration: { value: 12, unit: 'weeks' },
        location: { type: 'online' },
        fee: 0,
        isFree: true,
        maxStudents: 30,
        status: COURSE_STATUS.DRAFT
      })
      courseId = course.insertedId.toString()
    })

    it('should update course details successfully', async () => {
      const updateData = {
        title: 'Updated Course Title 10 chars',
        maxStudents: 40
      }

      const updated = await courseService.updateCourse(courseId, trainerId, updateData)
      expect(updated.title).toBe(updateData.title)
      expect(updated.maxStudents).toBe(updateData.maxStudents)
    })

    it('should throw FORBIDDEN if non-owner trainer tries to update', async () => {
      const otherTrainer = await createTestUser(USER_ROLES.TRAINER)
      const otherTrainerId = otherTrainer.insertedId.toString()

      await expect(
        courseService.updateCourse(courseId, otherTrainerId, { title: 'Unauthorized update' })
      ).rejects.toThrow('Bạn không có quyền sửa khóa học này!')
    })

    it('should submit course for approval transitioning status to PENDING', async () => {
      const submitted = await courseService.submitForApproval(courseId, trainerId)
      expect(submitted.status).toBe(COURSE_STATUS.PENDING)

      // Fetch from DB to verify persistence
      const found = await courseModel.findOneById(courseId)
      expect(found.status).toBe(COURSE_STATUS.PENDING)
    })
  })
})
