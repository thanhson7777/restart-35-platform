import { describe, it, expect, beforeEach } from '@jest/globals'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { userModel } from '~/models/userModel'
import { categoryModel } from '~/models/categoryModel'
import { courseModel } from '~/models/courseModel'
import { enrollmentModel } from '~/models/enrollmentModel'
import { scheduleModel } from '~/models/scheduleModel'
import { learningRecordModel } from '~/models/learningRecordModel'
import { courseService } from '~/services/courseService'
import { enrollmentService } from '~/services/enrollmentService'
import { scheduleService } from '~/services/scheduleService'
import { learningRecordService } from '~/services/learningRecordService'
import {
  USER_ROLES,
  COURSE_STATUS,
  DURATION_UNITS,
  LOCATION_TYPES,
  COURSE_DELIVERY_TYPES,
  COURSE_FUNDING_MODELS,
  ENROLLMENT_STATUS_V2,
  LEARNING_EVENT_TYPES,
  SCHEDULE_STATUS,
  SESSION_STATUS
} from '~/utils/constants'

const db = () => GET_DB()

async function createTestUser(role = USER_ROLES.TRAINER, displayName = 'Test User', email = '') {
  const uniq = `${Date.now()}_${Math.random()}`
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
  return await categoryModel.createNew({
    name: `Category ${Date.now()}`,
    slug: `category-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    description: 'Test category description'
  })
}

async function createTrainerCourse(trainerId, categoryId, overrides = {}) {
  return await courseModel.createNew({
    title: overrides.title || `Trainer Course ${Date.now()}`,
    description: overrides.description || 'Đây là mô tả khóa học đủ dài để hợp lệ và phục vụ cho test trainer dashboard APIs.',
    shortDescription: overrides.shortDescription || 'Mô tả ngắn',
    slug: overrides.slug || `trainer-course-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    categoryId: categoryId.toString(),
    providerId: trainerId.toString(),
    providerName: overrides.providerName || 'Trainer Center',
    providerEmail: overrides.providerEmail || 'trainer-center@example.com',
    duration: overrides.duration || { value: 6, unit: DURATION_UNITS.WEEKS },
    location: overrides.location || { type: LOCATION_TYPES.ONLINE, address: '', link: '' },
    delivery_type: overrides.delivery_type || COURSE_DELIVERY_TYPES.VIDEO,
    funding_model: overrides.funding_model || COURSE_FUNDING_MODELS.FREE,
    fee: overrides.fee ?? 0,
    isFree: overrides.isFree ?? true,
    scholarshipEligibility: overrides.scholarshipEligibility ?? false,
    maxStudents: overrides.maxStudents ?? 25,
    skills: overrides.skills || ['JavaScript'],
    prerequisites: overrides.prerequisites || [],
    requirements: overrides.requirements || [],
    syllabus: overrides.syllabus || [],
    outcomes: overrides.outcomes || [],
    status: overrides.status || COURSE_STATUS.APPROVED,
    _destroy: false
  })
}

async function createEnrollment(userId, courseId, overrides = {}) {
  return await enrollmentModel.createNew({
    userId: userId.toString(),
    courseId: courseId.toString(),
    status: overrides.status || ENROLLMENT_STATUS_V2.ACTIVE,
    progress: overrides.progress || { percentage: 0, currentLesson: 0, totalLessons: 0 },
    attendance: overrides.attendance || { present: 0, absent: 0, late: 0, totalSessions: 0 },
    dropout_risk: overrides.dropout_risk || {
      score: 0,
      level: 'low',
      reasons: [],
      last_calculated_at: Date.now(),
      interventions_sent: []
    },
    enrolledAt: overrides.enrolledAt || Date.now(),
    _destroy: false
  }, true)
}

async function createSchedule(courseId, providerId, overrides = {}) {
  return await scheduleModel.createNew({
    courseId: courseId.toString(),
    providerId: providerId.toString(),
    title: overrides.title || `Schedule ${Date.now()}`,
    description: overrides.description || 'Test schedule',
    status: overrides.status || SCHEDULE_STATUS.PUBLISHED,
    startDate: overrides.startDate || new Date('2026-06-10T00:00:00.000Z'),
    endDate: overrides.endDate || new Date('2026-06-20T00:00:00.000Z'),
    totalSessions: overrides.totalSessions ?? 2,
    completedSessions: overrides.completedSessions ?? 0,
    location: overrides.location || { type: LOCATION_TYPES.ONLINE, address: '', link: '' },
    sessions: overrides.sessions || [
      {
        _id: new ObjectId(),
        sessionNumber: 1,
        title: 'Session 1',
        date: new Date('2026-06-11T00:00:00.000Z'),
        startTime: '08:00',
        endTime: '10:00',
        duration: 120,
        topic: 'Introduction',
        status: SESSION_STATUS.SCHEDULED,
        attendance: []
      },
      {
        _id: new ObjectId(),
        sessionNumber: 2,
        title: 'Session 2',
        date: new Date('2026-06-13T00:00:00.000Z'),
        startTime: '08:00',
        endTime: '10:00',
        duration: 120,
        topic: 'Practice',
        status: SESSION_STATUS.SCHEDULED,
        attendance: []
      }
    ],
    reminders: [],
    _destroy: false
  }, true)
}

async function createLearningRecord(enrollmentId, userId, courseId, event_type, createdAt, metadata = {}) {
  return await learningRecordModel.createNew({
    enrollmentId: enrollmentId.toString(),
    userId: userId.toString(),
    courseId: courseId.toString(),
    event_type,
    metadata,
    createdAt,
    updatedAt: createdAt,
    _destroy: false
  })
}

describe('Phase 5 — Trainer Dashboard High Priority APIs', () => {
  let trainerId
  let otherTrainerId
  let worker1Id
  let worker2Id
  let categoryId
  let course1Id
  let course2Id
  let otherTrainerCourseId

  beforeEach(async () => {
    const trainer = await createTestUser(USER_ROLES.TRAINER, 'Trainer One')
    trainerId = trainer.insertedId.toString()

    const otherTrainer = await createTestUser(USER_ROLES.TRAINER, 'Trainer Two')
    otherTrainerId = otherTrainer.insertedId.toString()

    const worker1 = await createTestUser(USER_ROLES.WORKER, 'Alice Worker', 'alice.worker@example.com')
    worker1Id = worker1.insertedId.toString()

    const worker2 = await createTestUser(USER_ROLES.WORKER, 'Bob Worker', 'bob.worker@example.com')
    worker2Id = worker2.insertedId.toString()

    const category = await createTestCategory()
    categoryId = category.insertedId.toString()

    const course1 = await createTrainerCourse(trainerId, categoryId, {
      title: 'React Trainer Course',
      slug: `react-trainer-course-${Date.now()}`,
      status: COURSE_STATUS.APPROVED
    })
    course1Id = course1.insertedId.toString()

    const course2 = await createTrainerCourse(trainerId, categoryId, {
      title: 'Node Trainer Course',
      slug: `node-trainer-course-${Date.now()}`,
      status: COURSE_STATUS.DRAFT
    })
    course2Id = course2.insertedId.toString()

    const otherCourse = await createTrainerCourse(otherTrainerId, categoryId, {
      title: 'Other Trainer Course',
      slug: `other-trainer-course-${Date.now()}`,
      status: COURSE_STATUS.APPROVED
    })
    otherTrainerCourseId = otherCourse.insertedId.toString()
  })

  describe('Courses priority', () => {
    it('getMyCourses should return only current trainer courses with pagination', async () => {
      const result = await courseService.getMyCourses(trainerId, { page: 1, limit: 10 })

      expect(result.courses).toHaveLength(2)
      expect(result.pagination.totalRecords).toBe(2)
      expect(result.courses.every(course => course.providerId.toString() === trainerId)).toBe(true)
    })

    it('createCourse should create a draft course for trainer', async () => {
      const courseData = {
        title: 'Khóa học ưu tiên trainer dashboard',
        description: 'Mô tả khóa học khá dài để đạt điều kiện validate và dùng cho luồng test ưu tiên trainer dashboard.',
        shortDescription: 'Khóa học ưu tiên cho trainer dashboard',
        categoryId,
        duration: { value: 8, unit: DURATION_UNITS.WEEKS },
        location: { type: LOCATION_TYPES.ONLINE, address: '', link: '' },
        delivery_type: COURSE_DELIVERY_TYPES.VIDEO,
        funding_model: COURSE_FUNDING_MODELS.FREE,
        fee: 0,
        isFree: true,
        maxStudents: 30,
        skills: ['React'],
        prerequisites: [],
        requirements: [],
        syllabus: [],
        outcomes: []
      }

      const course = await courseService.createCourse(trainerId, courseData)

      expect(course).toBeDefined()
      expect(course.status).toBe(COURSE_STATUS.DRAFT)
      expect(course.providerId.toString()).toBe(trainerId)
      expect(course.title).toBe(courseData.title)
    })

    it('updateCourse should allow owner trainer and reject other trainer', async () => {
      const updated = await courseService.updateCourse(course1Id, trainerId, { title: 'Updated React Trainer Course' })
      expect(updated.title).toBe('Updated React Trainer Course')

      await expect(
        courseService.updateCourse(course1Id, otherTrainerId, { title: 'Hacked title' })
      ).rejects.toThrow('Bạn không có quyền sửa khóa học này!')
    })

    it('submitForApproval should move draft course to pending', async () => {
      const submitted = await courseService.submitForApproval(course2Id, trainerId)
      expect(submitted.status).toBe(COURSE_STATUS.PENDING)
    })
  })

  describe('Enrollments priority', () => {
    let enrollment1Id
    let enrollment2Id
    let enrollmentOtherId

    beforeEach(async () => {
      const e1 = await createEnrollment(worker1Id, course1Id, {
        status: ENROLLMENT_STATUS_V2.ACTIVE,
        dropout_risk: {
          score: 78,
          level: 'high',
          reasons: ['Vắng mặt nhiều'],
          last_calculated_at: Date.now(),
          interventions_sent: []
        }
      })
      enrollment1Id = e1.insertedId.toString()

      const e2 = await createEnrollment(worker2Id, course1Id, {
        status: ENROLLMENT_STATUS_V2.SUSPENDED,
        dropout_risk: {
          score: 20,
          level: 'low',
          reasons: [],
          last_calculated_at: Date.now(),
          interventions_sent: []
        }
      })
      enrollment2Id = e2.insertedId.toString()

      const e3 = await createEnrollment(worker2Id, otherTrainerCourseId, {
        status: ENROLLMENT_STATUS_V2.ACTIVE
      })
      enrollmentOtherId = e3.insertedId.toString()
    })

    it('getEnrollmentsByCourse should return only enrollments of owned course', async () => {
      const result = await enrollmentService.getEnrollmentsByCourse(course1Id, {}, trainerId)

      expect(result.enrollments).toHaveLength(2)
      expect(result.pagination.totalRecords).toBe(2)
      expect(result.enrollments.every(item => item.courseId.toString() === course1Id)).toBe(true)
    })

    it('getTrainerEnrollments should support search and risk filter for dashboard list', async () => {
      const highRiskResult = await enrollmentService.getTrainerEnrollments({ riskLevel: 'high' }, trainerId)
      expect(highRiskResult.enrollments).toHaveLength(1)
      expect(highRiskResult.enrollments[0].user.displayName).toBe('Alice Worker')

      const searchResult = await enrollmentService.getTrainerEnrollments({ search: 'bob.worker@example.com' }, trainerId)
      expect(searchResult.enrollments).toHaveLength(1)
      expect(searchResult.enrollments[0].user.displayName).toBe('Bob Worker')
    })

    it('getEnrollmentStats should aggregate stats for trainer-owned courses', async () => {
      const stats = await enrollmentService.getEnrollmentStats(null, trainerId)

      expect(stats).toBeDefined()
      expect(typeof stats.total).toBe('number')
      expect(stats.total).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Schedules priority', () => {
    beforeEach(async () => {
      await createSchedule(course1Id, trainerId, {
        title: 'Published Trainer Schedule',
        status: SCHEDULE_STATUS.PUBLISHED,
        totalSessions: 2,
        completedSessions: 0
      })

      await createSchedule(course2Id, trainerId, {
        title: 'Draft Trainer Schedule',
        status: SCHEDULE_STATUS.DRAFT,
        totalSessions: 1,
        completedSessions: 0,
        sessions: [
          {
            _id: new ObjectId(),
            sessionNumber: 1,
            title: 'Draft Session',
            date: new Date('2026-06-15T00:00:00.000Z'),
            startTime: '09:00',
            endTime: '11:00',
            duration: 120,
            topic: 'Draft Topic',
            status: SESSION_STATUS.SCHEDULED,
            attendance: []
          }
        ]
      })

      await createSchedule(otherTrainerCourseId, otherTrainerId, {
        title: 'Other Trainer Schedule',
        status: SCHEDULE_STATUS.PUBLISHED
      })
    })

    it('getTrainerSchedules should return only current trainer schedules with enriched course info', async () => {
      const result = await scheduleService.getTrainerSchedules(trainerId, { page: 1, limit: 10 })

      expect(result.schedules).toHaveLength(2)
      expect(result.pagination.totalRecords).toBe(2)
      expect(result.schedules.every(schedule => schedule.providerId.toString() === trainerId)).toBe(true)
      expect(result.schedules.every(schedule => schedule.course && schedule.course.title)).toBe(true)
    })

    it('getScheduleStats should return aggregated status counts for trainer dashboard', async () => {
      const stats = await scheduleService.getScheduleStats(trainerId)

      expect(stats).toBeDefined()
      expect(stats.total).toBe(2)
      expect(stats.byStatus[SCHEDULE_STATUS.PUBLISHED].count).toBe(1)
      expect(stats.byStatus[SCHEDULE_STATUS.DRAFT].count).toBe(1)
    })
  })

  describe('Dropout risk priority', () => {
    let activeEnrollmentId
    let inactiveEnrollmentId

    beforeEach(async () => {
      const activeEnrollment = await createEnrollment(worker1Id, course1Id, {
        status: ENROLLMENT_STATUS_V2.ACTIVE
      })
      activeEnrollmentId = activeEnrollment.insertedId.toString()

      const inactiveEnrollment = await createEnrollment(worker2Id, course1Id, {
        status: ENROLLMENT_STATUS_V2.ACTIVE
      })
      inactiveEnrollmentId = inactiveEnrollment.insertedId.toString()

      const now = Date.now()
      const twentyDaysAgo = now - 20 * 24 * 60 * 60 * 1000
      const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000

      await createLearningRecord(
        activeEnrollmentId,
        worker1Id,
        course1Id,
        LEARNING_EVENT_TYPES.VIDEO_COMPLETED,
        new Date(threeDaysAgo),
        { videoId: 'v1', videoDuration: 300, watchedDuration: 300 }
      )
      await createLearningRecord(
        activeEnrollmentId,
        worker1Id,
        course1Id,
        LEARNING_EVENT_TYPES.QUIZ_SUBMITTED,
        new Date(threeDaysAgo + 1000),
        { quizId: 'q1', passed: true }
      )

      await createLearningRecord(
        inactiveEnrollmentId,
        worker2Id,
        course1Id,
        LEARNING_EVENT_TYPES.VIDEO_STARTED,
        new Date(twentyDaysAgo),
        { videoId: 'v2', videoDuration: 300, watchedDuration: 50 }
      )
    })

    it('getDropoutRisk should scope by trainerId and identify inactive learners', async () => {
      const result = await learningRecordService.getDropoutRisk({ trainerId, minDaysInactive: 7 })

      expect(result).toBeDefined()
      expect(result.totalAnalyzed).toBeGreaterThanOrEqual(1)
      expect(result.learners.some(learner => learner.enrollmentId.toString() === inactiveEnrollmentId)).toBe(true)
    })

    it('getDropoutRisk should support courseId filtering', async () => {
      const result = await learningRecordService.getDropoutRisk({ courseId: course1Id, minDaysInactive: 7 })

      expect(result.learners.every(learner => learner.courseId.toString() === course1Id)).toBe(true)
    })
  })
})
