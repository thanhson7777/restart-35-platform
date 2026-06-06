import { describe, it, expect, beforeEach } from '@jest/globals'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { userModel } from '~/models/userModel'
import { categoryModel } from '~/models/categoryModel'
import { courseModel } from '~/models/courseModel'
import { enrollmentModel } from '~/models/enrollmentModel'
import { partnershipModel } from '~/models/partnershipModel'
import { partnershipService } from '~/services/partnershipService'
import {
  USER_ROLES,
  COURSE_STATUS,
  DURATION_UNITS,
  LOCATION_TYPES,
  COURSE_DELIVERY_TYPES,
  COURSE_FUNDING_MODELS,
  ENROLLMENT_STATUS_V2,
  COMPLETION_STATUS,
  PARTNERSHIP_STATUS
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
    description: overrides.description || 'Đây là mô tả khóa học đủ dài để hợp lệ và phục vụ cho test trainer partnership APIs.',
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
    linkedPartnershipId: overrides.linkedPartnershipId || null,
    linkedEnterpriseId: overrides.linkedEnterpriseId || null,
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
      score: 20,
      level: 'low',
      reasons: [],
      last_calculated_at: Date.now(),
      interventions_sent: []
    },
    source: overrides.source || 'enterprise_linked',
    enterpriseId: overrides.enterpriseId || null,
    partnershipId: overrides.partnershipId || null,
    enrolledAt: overrides.enrolledAt || Date.now(),
    completedAt: overrides.completedAt || null,
    _destroy: false
  }, true)
}

async function createPartnership(enterpriseId, trainerId, overrides = {}) {
  return await partnershipModel.createNew({
    enterpriseId: enterpriseId.toString(),
    trainerId: trainerId.toString(),
    requestedCourseIds: overrides.requestedCourseIds || [],
    proposedCourseIds: overrides.proposedCourseIds || [],
    linkedCourseIds: overrides.linkedCourseIds || [],
    recruitmentNeeds: overrides.recruitmentNeeds || {
      jobTitle: 'Nhân viên pha chế',
      jobQuantity: 10,
      salaryRange: { min: 8000000, max: 12000000, currency: 'VND' },
      requirements: ['Giao tiếp tốt'],
      targetSkills: ['pha chế'],
      employmentType: 'full-time'
    },
    agreedTerms: overrides.agreedTerms || {
      linkedCourseIds: overrides.linkedCourseIds || [],
      tuitionFeePerLearner: 3000000,
      paymentTerms: '50/50',
      placementGuarantee: true,
      guaranteePeriodMonths: 3,
      referralBonus: 500000
    },
    referralBonus: overrides.referralBonus ?? 500000,
    tuitionFee: overrides.tuitionFee ?? 3000000,
    notes: overrides.notes || null,
    message: overrides.message || 'Initial request',
    respondedAt: overrides.respondedAt || null,
    signedAt: overrides.signedAt || null,
    expiresAt: overrides.expiresAt || null,
    status: overrides.status || PARTNERSHIP_STATUS.PENDING,
    stats: overrides.stats || {
      enrolledLearners: 0,
      completedLearners: 0,
      placedLearners: 0
    },
    createdAt: overrides.createdAt || Date.now(),
    updatedAt: overrides.updatedAt || Date.now(),
    _destroy: false
  }, true)
}

describe('Phase 7 — Trainer Partnerships', () => {
  let trainerId
  let otherTrainerId
  let enterpriseId
  let otherEnterpriseId
  let worker1Id
  let worker2Id
  let categoryId
  let linkedCourseId
  let secondLinkedCourseId
  let otherTrainerCourseId
  let activePartnershipId
  let pendingPartnershipId
  let otherTrainerPartnershipId

  beforeEach(async () => {
    const trainer = await createTestUser(USER_ROLES.TRAINER, 'Trainer One')
    trainerId = trainer.insertedId.toString()

    const otherTrainer = await createTestUser(USER_ROLES.TRAINER, 'Trainer Two')
    otherTrainerId = otherTrainer.insertedId.toString()

    const enterprise = await createTestUser(USER_ROLES.ENTERPRISE, 'Enterprise One', `enterprise_${Date.now()}@example.com`)
    enterpriseId = enterprise.insertedId.toString()

    const otherEnterprise = await createTestUser(USER_ROLES.ENTERPRISE, 'Enterprise Two', `enterprise_other_${Date.now()}@example.com`)
    otherEnterpriseId = otherEnterprise.insertedId.toString()

    const worker1 = await createTestUser(USER_ROLES.WORKER, 'Worker One', `worker1_${Date.now()}@example.com`)
    worker1Id = worker1.insertedId.toString()

    const worker2 = await createTestUser(USER_ROLES.WORKER, 'Worker Two', `worker2_${Date.now()}@example.com`)
    worker2Id = worker2.insertedId.toString()

    const category = await createTestCategory()
    categoryId = category.insertedId.toString()

    const linkedCourse = await createTrainerCourse(trainerId, categoryId, {
      title: 'Enterprise Linked Course',
      slug: `enterprise-linked-course-${Date.now()}`
    })
    linkedCourseId = linkedCourse.insertedId.toString()

    const secondCourse = await createTrainerCourse(trainerId, categoryId, {
      title: 'Second Enterprise Course',
      slug: `second-enterprise-course-${Date.now()}`
    })
    secondLinkedCourseId = secondCourse.insertedId.toString()

    const otherCourse = await createTrainerCourse(otherTrainerId, categoryId, {
      title: 'Other Trainer Enterprise Course',
      slug: `other-trainer-enterprise-course-${Date.now()}`
    })
    otherTrainerCourseId = otherCourse.insertedId.toString()

    const activePartnership = await createPartnership(enterpriseId, trainerId, {
      linkedCourseIds: [linkedCourseId],
      status: PARTNERSHIP_STATUS.ACTIVE,
      signedAt: Date.now(),
      message: 'Active partnership'
    })
    activePartnershipId = activePartnership.insertedId.toString()

    const pendingPartnership = await createPartnership(enterpriseId, trainerId, {
      linkedCourseIds: [secondLinkedCourseId],
      status: PARTNERSHIP_STATUS.PENDING,
      message: 'Pending partnership'
    })
    pendingPartnershipId = pendingPartnership.insertedId.toString()

    const otherPartnership = await createPartnership(otherEnterpriseId, otherTrainerId, {
      linkedCourseIds: [otherTrainerCourseId],
      status: PARTNERSHIP_STATUS.ACTIVE,
      message: 'Other trainer partnership'
    })
    otherTrainerPartnershipId = otherPartnership.insertedId.toString()

    await courseModel.update(linkedCourseId, {
      linkedPartnershipId: activePartnershipId,
      linkedEnterpriseId: enterpriseId
    })
    await courseModel.update(secondLinkedCourseId, {
      linkedPartnershipId: pendingPartnershipId,
      linkedEnterpriseId: enterpriseId
    })
    await courseModel.update(otherTrainerCourseId, {
      linkedPartnershipId: otherTrainerPartnershipId,
      linkedEnterpriseId: otherEnterpriseId
    })

    await createEnrollment(worker1Id, linkedCourseId, {
      partnershipId: activePartnershipId,
      enterpriseId,
      status: ENROLLMENT_STATUS_V2.ACTIVE
    })
    await createEnrollment(worker2Id, linkedCourseId, {
      partnershipId: activePartnershipId,
      enterpriseId,
      status: ENROLLMENT_STATUS_V2.COMPLETED,
      completedAt: Date.now(),
      progress: {
        percentage: 100,
        completionStatus: COMPLETION_STATUS.COMPLETED,
        currentLesson: 10,
        totalLessons: 10,
        byDelivery: { video: 10, live: 0, offline: 0 }
      }
    })
    await createEnrollment(worker1Id, otherTrainerCourseId, {
      partnershipId: otherTrainerPartnershipId,
      enterpriseId: otherEnterpriseId,
      status: ENROLLMENT_STATUS_V2.ACTIVE
    })
  })

  describe('getPartnerships', () => {
    it('should return only current trainer partnerships and enrich enterprise/course data', async () => {
      const result = await partnershipService.getPartnerships(trainerId, USER_ROLES.TRAINER, { page: 1, limit: 10 })

      expect(result.partnerships).toHaveLength(2)
      expect(result.partnerships.every(item => item.trainerId === trainerId)).toBe(true)
      expect(result.partnerships[0].enterprise).toBeDefined()
      expect(Array.isArray(result.partnerships[0].linkedCourses)).toBe(true)
    })

    it('should filter partnerships by status', async () => {
      const result = await partnershipService.getPartnerships(trainerId, USER_ROLES.TRAINER, {
        page: 1,
        limit: 10,
        status: PARTNERSHIP_STATUS.PENDING
      })

      expect(result.partnerships).toHaveLength(1)
      expect(result.partnerships[0].status).toBe(PARTNERSHIP_STATUS.PENDING)
      expect(result.partnerships[0]._id.toString()).toBe(pendingPartnershipId)
    })
  })

  describe('getPartnershipById', () => {
    it('should return enriched partnership detail with summary', async () => {
      const detail = await partnershipService.getPartnershipById(activePartnershipId, trainerId, USER_ROLES.TRAINER)

      expect(detail.enterprise.displayName).toBe('Enterprise One')
      expect(detail.trainer.displayName).toBe('Trainer One')
      expect(detail.linkedCourses).toHaveLength(1)
      expect(detail.summary.totalLearners).toBe(2)
      expect(detail.summary.totalGraduates).toBe(1)
    })
  })

  describe('respond/negotiate/confirm/cancel', () => {
    it('should reject responding to partnership owned by another trainer', async () => {
      await expect(
        partnershipService.respondPartnership(otherTrainerPartnershipId, trainerId, {
          status: PARTNERSHIP_STATUS.NEGOTIATING,
          proposedCourseIds: [linkedCourseId],
          message: 'Trying to hijack'
        })
      ).rejects.toThrow('Bạn không thể phản hồi partnership này!')
    })

    it('should update partnership through respond, confirm and cancel flow', async () => {
      const responded = await partnershipService.respondPartnership(pendingPartnershipId, trainerId, {
        status: PARTNERSHIP_STATUS.NEGOTIATING,
        proposedCourseIds: [secondLinkedCourseId],
        tuitionFee: 4500000,
        message: 'Có thể đàm phán tiếp'
      })
      expect(responded.status).toBe(PARTNERSHIP_STATUS.NEGOTIATING)
      expect(responded.proposedCourseIds).toContain(secondLinkedCourseId)

      const confirmed = await partnershipService.confirmPartnership(pendingPartnershipId, trainerId, USER_ROLES.TRAINER, {
        agreedTerms: {
          linkedCourseIds: [secondLinkedCourseId],
          tuitionFeePerLearner: 5000000,
          paymentTerms: '100% after completion',
          placementGuarantee: true,
          guaranteePeriodMonths: 6,
          referralBonus: 900000
        },
        signedAt: Date.now()
      })
      expect(confirmed.status).toBe(PARTNERSHIP_STATUS.ACTIVE)
      expect(confirmed.linkedCourseIds).toContain(secondLinkedCourseId)

      const cancelled = await partnershipService.cancelPartnership(pendingPartnershipId, trainerId, USER_ROLES.TRAINER, 'Đổi kế hoạch hợp tác')
      expect(cancelled.status).toBe(PARTNERSHIP_STATUS.CANCELLED)
      expect(cancelled.notes).toBe('Đổi kế hoạch hợp tác')
    })
  })

  describe('learners and graduates', () => {
    it('should return learners scoped by partnership with enriched user/course data', async () => {
      const result = await partnershipService.getPartnershipLearners(activePartnershipId, trainerId, USER_ROLES.TRAINER, {
        page: 1,
        limit: 10
      })

      expect(result.learners).toHaveLength(2)
      expect(result.learners[0].user).toBeDefined()
      expect(result.learners[0].course).toBeDefined()
      expect(result.pagination.totalRecords).toBe(2)
    })

    it('should return only completed graduates for a partnership', async () => {
      const result = await partnershipService.getPartnershipGraduates(activePartnershipId, trainerId, USER_ROLES.TRAINER, {
        page: 1,
        limit: 10
      })

      expect(result.graduates).toHaveLength(1)
      expect(result.graduates[0].status).toBe(ENROLLMENT_STATUS_V2.COMPLETED)
      expect(result.graduates[0].user.displayName).toBe('Worker Two')
    })
  })

  describe('stats and enterprise students scope', () => {
    it('should return partnership stats with totals and metadata', async () => {
      const stats = await partnershipService.getPartnershipStats(activePartnershipId, trainerId, USER_ROLES.TRAINER)

      expect(stats.status).toBe(PARTNERSHIP_STATUS.ACTIVE)
      expect(stats.stats.totalLearners).toBe(2)
      expect(stats.stats.totalGraduates).toBe(1)
      expect(stats.enterprise.displayName).toBe('Enterprise One')
      expect(stats.agreedTerms).toBeDefined()
    })

    it('should only count enterprise students within trainer active partnerships', async () => {
      const database = GET_DB()
      const partnershipIds = [activePartnershipId]

      const pipeline = [
        {
          $match: {
            enterpriseId: { $exists: true, $ne: null },
            partnershipId: { $in: partnershipIds },
            _destroy: { $ne: true }
          }
        },
        {
          $facet: {
            total: [{ $count: 'count' }],
            recent: [
              { $sort: { enrolledAt: -1 } },
              { $limit: 50 }
            ]
          }
        }
      ]

      const [result] = await database.collection('enrollments').aggregate(pipeline).toArray()

      expect(result.total[0].count).toBe(2)
      expect(result.recent.every(item => item.partnershipId === activePartnershipId)).toBe(true)
    })
  })
})
