import { describe, it, expect, beforeEach } from '@jest/globals'
import { ObjectId } from 'mongodb'
import { userModel } from '~/models/userModel'
import { categoryModel } from '~/models/categoryModel'
import { courseModel } from '~/models/courseModel'
import { enrollmentModel } from '~/models/enrollmentModel'
import { reviewModel, REVIEW_STATUS } from '~/models/reviewModel'
import { enrollmentService } from '~/services/enrollmentService'
import { reviewService } from '~/services/reviewService'
import {
  USER_ROLES,
  COURSE_STATUS,
  DURATION_UNITS,
  LOCATION_TYPES,
  COURSE_DELIVERY_TYPES,
  COURSE_FUNDING_MODELS,
  ENROLLMENT_STATUS_V2,
  COMPLETION_STATUS
} from '~/utils/constants'

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
    description: overrides.description || 'Đây là mô tả khóa học đủ dài để hợp lệ và phục vụ cho test trainer workflow priority APIs.',
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
    progress: overrides.progress || {
      percentage: 0,
      completionStatus: COMPLETION_STATUS.NOT_STARTED,
      currentLesson: 0,
      totalLessons: 0,
      byDelivery: { video: 0, live: 0, offline: 0 }
    },
    attendance: overrides.attendance || { present: 0, absent: 0, late: 0, totalSessions: 0 },
    assessments: overrides.assessments || [],
    dropout_risk: overrides.dropout_risk || {
      score: 70,
      level: 'medium',
      reasons: ['Ít tương tác'],
      last_calculated_at: Date.now(),
      interventions_sent: []
    },
    enrolledAt: overrides.enrolledAt || Date.now(),
    notes: overrides.notes || null,
    _destroy: false
  }, true)
}

async function createReview(userId, courseId, overrides = {}) {
  return await reviewModel.createNew({
    courseId: courseId.toString(),
    userId: userId.toString(),
    rating: overrides.rating || {
      overall: 5,
      content: 5,
      instructor: 5,
      materials: 5,
      support: 5
    },
    title: overrides.title || 'Đánh giá tốt',
    content: overrides.content || 'Nội dung review phục vụ test trainer response.',
    workerProfile: overrides.workerProfile || null,
    helpful: overrides.helpful || { count: 0, voters: [] },
    response: overrides.response,
    status: overrides.status || REVIEW_STATUS.APPROVED,
    createdAt: overrides.createdAt || Date.now(),
    updatedAt: overrides.updatedAt || Date.now(),
    _destroy: false
  }, true)
}

describe('Phase 6 — Trainer Second Priority APIs', () => {
  let trainerId
  let otherTrainerId
  let workerId
  let categoryId
  let courseId
  let otherCourseId

  beforeEach(async () => {
    const trainer = await createTestUser(USER_ROLES.TRAINER, 'Trainer One')
    trainerId = trainer.insertedId.toString()

    const otherTrainer = await createTestUser(USER_ROLES.TRAINER, 'Trainer Two')
    otherTrainerId = otherTrainer.insertedId.toString()

    const worker = await createTestUser(USER_ROLES.WORKER, 'Worker One', 'worker.one@example.com')
    workerId = worker.insertedId.toString()

    const category = await createTestCategory()
    categoryId = category.insertedId.toString()

    const course = await createTrainerCourse(trainerId, categoryId, {
      title: 'Primary Trainer Course',
      slug: `primary-trainer-course-${Date.now()}`,
      status: COURSE_STATUS.APPROVED
    })
    courseId = course.insertedId.toString()

    const otherCourse = await createTrainerCourse(otherTrainerId, categoryId, {
      title: 'Other Trainer Course',
      slug: `other-trainer-course-${Date.now()}`,
      status: COURSE_STATUS.APPROVED
    })
    otherCourseId = otherCourse.insertedId.toString()
  })

  describe('Enrollment state transitions', () => {
    it('suspendEnrollment should move active enrollment to suspended', async () => {
      const enrollment = await createEnrollment(workerId, courseId, {
        status: ENROLLMENT_STATUS_V2.ACTIVE
      })

      const updated = await enrollmentService.suspendEnrollment(
        enrollment.insertedId.toString(),
        trainerId,
        'Nghỉ tạm thời do bận việc riêng'
      )

      expect(updated.status).toBe(ENROLLMENT_STATUS_V2.SUSPENDED)
      expect(updated.notes).toBe('Nghỉ tạm thời do bận việc riêng')
    })

    it('suspendEnrollment should reject non-active enrollment', async () => {
      const enrollment = await createEnrollment(workerId, courseId, {
        status: ENROLLMENT_STATUS_V2.COMPLETED
      })

      await expect(
        enrollmentService.suspendEnrollment(enrollment.insertedId.toString(), trainerId, 'reason')
      ).rejects.toThrow('Chỉ có thể tạm ngưng đăng ký đang hoạt động!')
    })

    it('completeEnrollment should mark completion and append final assessment', async () => {
      const enrollment = await createEnrollment(workerId, courseId, {
        status: ENROLLMENT_STATUS_V2.SUSPENDED,
        assessments: [{ name: 'Quiz 1', score: 75, passed: true, date: Date.now() }]
      })

      const updated = await enrollmentService.completeEnrollment(
        enrollment.insertedId.toString(),
        trainerId,
        { score: 88, notes: 'Hoàn thành tốt' }
      )

      expect(updated.status).toBe(ENROLLMENT_STATUS_V2.COMPLETED)
      expect(updated.progress.percentage).toBe(100)
      expect(updated.progress.completionStatus).toBe(COMPLETION_STATUS.COMPLETED)
      expect(updated.assessments).toHaveLength(2)
      expect(updated.assessments[1].score).toBe(88)
    })

    it('failEnrollment should mark enrollment failed with drop reason', async () => {
      const enrollment = await createEnrollment(workerId, courseId, {
        status: ENROLLMENT_STATUS_V2.SUSPENDED
      })

      const updated = await enrollmentService.failEnrollment(
        enrollment.insertedId.toString(),
        trainerId,
        'Không đạt đầu ra cuối khóa'
      )

      expect(updated.status).toBe(ENROLLMENT_STATUS_V2.FAILED)
      expect(updated.dropReason).toBe('Không đạt đầu ra cuối khóa')
    })

    it('failEnrollment should reject completed enrollment', async () => {
      const enrollment = await createEnrollment(workerId, courseId, {
        status: ENROLLMENT_STATUS_V2.COMPLETED
      })

      await expect(
        enrollmentService.failEnrollment(enrollment.insertedId.toString(), trainerId, 'reason')
      ).rejects.toThrow('Không thể đánh fail đăng ký đã kết thúc!')
    })
  })

  describe('Manual intervention', () => {
    it('triggerManualIntervention should log zalo reminder for trainer-owned enrollment', async () => {
      const enrollment = await createEnrollment(workerId, courseId, {
        status: ENROLLMENT_STATUS_V2.ACTIVE,
        dropout_risk: {
          score: 85,
          level: 'high',
          reasons: ['Vắng nhiều buổi'],
          last_calculated_at: Date.now(),
          interventions_sent: []
        }
      })

      const result = await enrollmentService.triggerManualIntervention(
        enrollment.insertedId.toString(),
        'zalo_reminder',
        trainerId
      )

      expect(result.success).toBe(true)

      const persisted = await enrollmentModel.findOneById(enrollment.insertedId.toString())
      expect(persisted.dropout_risk.interventions_sent).toHaveLength(1)
      expect(persisted.dropout_risk.interventions_sent[0].type).toBe('zalo_reminder')
    })

    it('triggerManualIntervention should reject invalid intervention type', async () => {
      const enrollment = await createEnrollment(workerId, courseId)

      await expect(
        enrollmentService.triggerManualIntervention(enrollment.insertedId.toString(), 'sms_blast', trainerId)
      ).rejects.toThrow('Loại can thiệp không hợp lệ!')
    })
  })

  describe('Review response', () => {
    it('addResponse should let owning trainer respond to review', async () => {
      const review = await createReview(workerId, courseId, {
        status: REVIEW_STATUS.APPROVED
      })

      const updated = await reviewService.addResponse(
        review.insertedId.toString(),
        courseId,
        { content: 'Cảm ơn bạn đã phản hồi.' },
        trainerId
      )

      expect(updated.response).toBeDefined()
      expect(updated.response.content).toBe('Cảm ơn bạn đã phản hồi.')
      expect(updated.response.respondedBy).toBe(trainerId)
    })

    it('addResponse should reject response from non-owner trainer', async () => {
      const review = await createReview(workerId, courseId, {
        status: REVIEW_STATUS.APPROVED
      })

      await expect(
        reviewService.addResponse(
          review.insertedId.toString(),
          courseId,
          { content: 'Tôi không sở hữu khóa này.' },
          otherTrainerId
        )
      ).rejects.toThrow('Bạn không có quyền trả lời review này!')
    })

    it('addResponse should reject mismatched courseId', async () => {
      const review = await createReview(workerId, courseId, {
        status: REVIEW_STATUS.APPROVED
      })

      await expect(
        reviewService.addResponse(
          review.insertedId.toString(),
          otherCourseId,
          { content: 'Sai course id' },
          otherTrainerId
        )
      ).rejects.toThrow('Review không thuộc khóa học này!')
    })
  })
})
