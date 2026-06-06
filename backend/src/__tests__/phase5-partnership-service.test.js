import { describe, it, expect, beforeEach } from '@jest/globals'
import { ObjectId } from 'mongodb'
import { userModel } from '~/models/userModel'
import { categoryModel } from '~/models/categoryModel'
import { courseModel } from '~/models/courseModel'
import { partnershipModel } from '~/models/partnershipModel'
import { partnershipService } from '~/services/partnershipService'
import {
  USER_ROLES,
  COURSE_STATUS,
  DURATION_UNITS,
  LOCATION_TYPES,
  COURSE_DELIVERY_TYPES,
  COURSE_FUNDING_MODELS,
  PARTNERSHIP_STATUS
} from '~/utils/constants'
import { StatusCodes } from 'http-status-codes'

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
    description: overrides.description || 'Mô tả khóa học đủ dài để hợp lệ cho test partnership service phase 5.',
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
    sponsorship: overrides.sponsorship || { hasSponsorship: false, sponsorTypes: [], activeSponsorshipIds: [], priorityRecruitment: false, badgeLabel: null },
    status: overrides.status || COURSE_STATUS.APPROVED,
    _destroy: false
  })
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

describe('Phase 5 — partnershipService and partnershipModel', () => {
  let trainerId
  let otherTrainerId
  let enterpriseId
  let otherEnterpriseId
  let categoryId
  let course1Id
  let course2Id

  beforeEach(async () => {
    const trainer = await createTestUser(USER_ROLES.TRAINER, 'Trainer One')
    trainerId = trainer.insertedId.toString()

    const otherTrainer = await createTestUser(USER_ROLES.TRAINER, 'Trainer Two')
    otherTrainerId = otherTrainer.insertedId.toString()

    const enterprise = await createTestUser(USER_ROLES.ENTERPRISE, 'Enterprise One', `enterprise_${Date.now()}@example.com`)
    enterpriseId = enterprise.insertedId.toString()

    const otherEnterprise = await createTestUser(USER_ROLES.ENTERPRISE, 'Enterprise Two', `enterprise_other_${Date.now()}@example.com`)
    otherEnterpriseId = otherEnterprise.insertedId.toString()

    const category = await createTestCategory()
    categoryId = category.insertedId.toString()

    const course1 = await createTrainerCourse(trainerId, categoryId, {
      title: 'Linked Course 1',
      slug: `linked-course-1-${Date.now()}`
    })
    course1Id = course1.insertedId.toString()

    const course2 = await createTrainerCourse(trainerId, categoryId, {
      title: 'Linked Course 2',
      slug: `linked-course-2-${Date.now()}`
    })
    course2Id = course2.insertedId.toString()
  })

  describe('partnershipModel CRUD', () => {
    it('should create partnership with default PENDING status', async () => {
      const result = await createPartnership(enterpriseId, trainerId, {
        requestedCourseIds: [course1Id]
      })
      const created = await partnershipModel.findOneById(result.insertedId)
      expect(created.status).toBe(PARTNERSHIP_STATUS.PENDING)
      expect(created.stats.enrolledLearners).toBe(0)
      expect(created.stats.completedLearners).toBe(0)
      expect(created.stats.placedLearners).toBe(0)
    })

    it('should find partnership by id', async () => {
      const result = await createPartnership(enterpriseId, trainerId)
      const found = await partnershipModel.findOneById(result.insertedId)
      expect(found).not.toBeNull()
      expect(found._id.toString()).toBe(result.insertedId.toString())
    })

    it('should return null for non-existent partnership id', async () => {
      const found = await partnershipModel.findOneById(new ObjectId())
      expect(found).toBeNull()
    })

    it('should find partnerships by enterprise with pagination', async () => {
      await createPartnership(enterpriseId, trainerId, { requestedCourseIds: [course1Id] })
      await createPartnership(enterpriseId, trainerId, { requestedCourseIds: [course2Id] })
      await createPartnership(otherEnterpriseId, trainerId, { requestedCourseIds: [course1Id] })

      const result = await partnershipModel.findByEnterprise(enterpriseId, 0, 10)
      expect(result.partnerships).toHaveLength(2)
      expect(result.total).toBe(2)
    })

    it('should find partnerships by trainer with pagination', async () => {
      await createPartnership(enterpriseId, trainerId, { requestedCourseIds: [course1Id] })
      await createPartnership(otherEnterpriseId, trainerId, { requestedCourseIds: [course2Id] })
      await createPartnership(enterpriseId, otherTrainerId, { requestedCourseIds: [course1Id] })

      const result = await partnershipModel.findByTrainer(trainerId, 0, 10)
      expect(result.partnerships).toHaveLength(2)
      expect(result.total).toBe(2)
    })

    it('should find active partnership by linked course', async () => {
      const active = await createPartnership(enterpriseId, trainerId, {
        linkedCourseIds: [course1Id],
        status: PARTNERSHIP_STATUS.ACTIVE,
        signedAt: Date.now()
      })
      const pending = await createPartnership(enterpriseId, trainerId, {
        linkedCourseIds: [course2Id],
        status: PARTNERSHIP_STATUS.PENDING
      })

      const foundActive = await partnershipModel.findActiveByCourse(course1Id)
      const foundPending = await partnershipModel.findActiveByCourse(course2Id)
      expect(foundActive?._id.toString()).toBe(active.insertedId.toString())
      expect(foundPending).toBeNull()
      expect(pending.insertedId).toBeDefined()
    })

    it('should increment partnership stats atomically', async () => {
      const created = await createPartnership(enterpriseId, trainerId)
      const partnershipId = created.insertedId.toString()

      await partnershipModel.incrementStat(partnershipId, 'enrolledLearners', 2)
      await partnershipModel.incrementStat(partnershipId, 'completedLearners', 1)
      await partnershipModel.incrementStat(partnershipId, 'placedLearners', 3)

      const updated = await partnershipModel.findOneById(partnershipId)
      expect(updated.stats.enrolledLearners).toBe(2)
      expect(updated.stats.completedLearners).toBe(1)
      expect(updated.stats.placedLearners).toBe(3)
    })
  })

  describe('status transitions', () => {
    it('should respond partnership: PENDING -> NEGOTIATING', async () => {
      const created = await createPartnership(enterpriseId, trainerId, {
        requestedCourseIds: [course1Id]
      })

      const updated = await partnershipModel.respond(created.insertedId, {
        proposedCourseIds: [course1Id, course2Id],
        tuitionFee: 4500000,
        message: 'Trainer response'
      })

      expect(updated.status).toBe(PARTNERSHIP_STATUS.NEGOTIATING)
      expect(updated.proposedCourseIds).toEqual([course1Id, course2Id])
      expect(updated.tuitionFee).toBe(4500000)
      expect(updated.respondedAt).toBeTruthy()
    })

    it('should update negotiation terms', async () => {
      const created = await createPartnership(enterpriseId, trainerId, {
        status: PARTNERSHIP_STATUS.NEGOTIATING,
        proposedCourseIds: [course1Id]
      })

      const updated = await partnershipModel.updateNegotiation(created.insertedId, {
        proposedCourseIds: [course1Id, course2Id],
        agreedTerms: {
          linkedCourseIds: [course1Id, course2Id],
          tuitionFeePerLearner: 5000000,
          paymentTerms: '100%',
          placementGuarantee: true,
          guaranteePeriodMonths: 6,
          referralBonus: 1000000
        },
        notes: 'Negotiation updated'
      })

      expect(updated.proposedCourseIds).toEqual([course1Id, course2Id])
      expect(updated.agreedTerms.tuitionFeePerLearner).toBe(5000000)
      expect(updated.agreedTerms.referralBonus).toBe(1000000)
      expect(updated.notes).toBe('Negotiation updated')
    })

    it('should confirm partnership: NEGOTIATING -> ACTIVE and set signedAt', async () => {
      const created = await createPartnership(enterpriseId, trainerId, {
        status: PARTNERSHIP_STATUS.NEGOTIATING,
        proposedCourseIds: [course1Id, course2Id]
      })

      const updated = await partnershipModel.confirm(created.insertedId, {
        linkedCourseIds: [course1Id, course2Id],
        agreedTerms: {
          linkedCourseIds: [course1Id, course2Id],
          tuitionFeePerLearner: 4000000,
          paymentTerms: '50/50',
          placementGuarantee: true,
          guaranteePeriodMonths: 3,
          referralBonus: 500000
        }
      })

      expect(updated.status).toBe(PARTNERSHIP_STATUS.ACTIVE)
      expect(updated.linkedCourseIds).toEqual([course1Id, course2Id])
      expect(updated.signedAt).toBeTruthy()
    })

    it('should cancel partnership and set status to CANCELLED', async () => {
      const created = await createPartnership(enterpriseId, trainerId, {
        status: PARTNERSHIP_STATUS.NEGOTIATING
      })

      const updated = await partnershipModel.cancel(created.insertedId, 'Enterprise changed hiring plan')
      expect(updated.status).toBe(PARTNERSHIP_STATUS.CANCELLED)
      expect(updated.notes).toContain('Enterprise changed hiring plan')
    })
  })

  describe('partnershipService authorization and flows', () => {
    it('should allow enterprise to create partnership', async () => {
      const result = await partnershipService.createPartnership(enterpriseId, {
        trainerId,
        requestedCourseIds: [course1Id],
        recruitmentNeeds: {
          jobTitle: 'Nhân viên phục vụ',
          jobQuantity: 8,
          salaryRange: { min: 7000000, max: 10000000, currency: 'VND' },
          requirements: ['Kỹ năng giao tiếp'],
          targetSkills: ['giao tiếp'],
          employmentType: 'full-time'
        },
        message: 'Need trained workers'
      })

      expect(result._id).toBeDefined()
      expect(result.enterpriseId).toBe(enterpriseId)
      expect(result.trainerId).toBe(trainerId)
      expect(result.status).toBe(PARTNERSHIP_STATUS.PENDING)
    })

    it('should reject create partnership from non-enterprise user', async () => {
      await expect(
        partnershipService.createPartnership(trainerId, {
          trainerId,
          requestedCourseIds: [course1Id],
          recruitmentNeeds: {
            jobTitle: 'Invalid',
            jobQuantity: 1,
            salaryRange: { min: 1, max: 2, currency: 'VND' },
            requirements: ['req'],
            targetSkills: ['skill'],
            employmentType: 'full-time'
          }
        })
      ).rejects.toMatchObject({ statusCode: StatusCodes.FORBIDDEN })
    })

    it('should allow assigned trainer to respond', async () => {
      const created = await createPartnership(enterpriseId, trainerId, {
        requestedCourseIds: [course1Id]
      })

      const result = await partnershipService.respondPartnership(
        created.insertedId.toString(),
        trainerId,
        {
          proposedCourseIds: [course1Id],
          tuitionFee: 3000000,
          message: 'Trainer can deliver this course'
        }
      )

      expect(result.status).toBe(PARTNERSHIP_STATUS.NEGOTIATING)
      expect(result.proposedCourseIds).toEqual([course1Id])
    })

    it('should reject respond from non-assigned trainer', async () => {
      const created = await createPartnership(enterpriseId, trainerId)

      await expect(
        partnershipService.respondPartnership(
          created.insertedId.toString(),
          otherTrainerId,
          {
            proposedCourseIds: [course1Id],
            tuitionFee: 3000000,
            message: 'Unauthorized trainer'
          }
        )
      ).rejects.toMatchObject({ statusCode: StatusCodes.FORBIDDEN })
    })

    it('should allow enterprise participant to confirm partnership', async () => {
      const created = await createPartnership(enterpriseId, trainerId, {
        status: PARTNERSHIP_STATUS.NEGOTIATING,
        proposedCourseIds: [course1Id, course2Id]
      })

      const result = await partnershipService.confirmPartnership(
        created.insertedId.toString(),
        enterpriseId,
        USER_ROLES.ENTERPRISE,
        {
          linkedCourseIds: [course1Id, course2Id],
          agreedTerms: {
            linkedCourseIds: [course1Id, course2Id],
            tuitionFeePerLearner: 4500000,
            paymentTerms: '50/50',
            placementGuarantee: true,
            guaranteePeriodMonths: 3,
            referralBonus: 500000
          }
        }
      )

      expect(result.status).toBe(PARTNERSHIP_STATUS.ACTIVE)
      expect(result.linkedCourseIds).toEqual([course1Id, course2Id])
      expect(result.signedAt).toBeTruthy()
    })

    it('should reject confirm from non-participant user', async () => {
      const created = await createPartnership(enterpriseId, trainerId, {
        status: PARTNERSHIP_STATUS.NEGOTIATING,
        proposedCourseIds: [course1Id]
      })

      const worker = await createTestUser(USER_ROLES.WORKER, 'Worker User', `worker_${Date.now()}@example.com`)

      await expect(
        partnershipService.confirmPartnership(
          created.insertedId.toString(),
          worker.insertedId.toString(),
          USER_ROLES.WORKER,
          {
            linkedCourseIds: [course1Id],
            agreedTerms: {
              linkedCourseIds: [course1Id],
              tuitionFeePerLearner: 3000000,
              paymentTerms: '50/50',
              placementGuarantee: true,
              guaranteePeriodMonths: 3,
              referralBonus: 500000
            }
          }
        )
      ).rejects.toMatchObject({ statusCode: StatusCodes.FORBIDDEN })
    })

    it('should allow participant to cancel partnership', async () => {
      const created = await createPartnership(enterpriseId, trainerId, {
        status: PARTNERSHIP_STATUS.NEGOTIATING
      })

      const result = await partnershipService.cancelPartnership(
        created.insertedId.toString(),
        trainerId,
        USER_ROLES.TRAINER,
        'Unable to proceed'
      )

      expect(result.status).toBe(PARTNERSHIP_STATUS.CANCELLED)
    })

    it('should reject cancel from unrelated user', async () => {
      const created = await createPartnership(enterpriseId, trainerId, {
        status: PARTNERSHIP_STATUS.NEGOTIATING
      })
      const worker = await createTestUser(USER_ROLES.WORKER, 'Worker User', `worker2_${Date.now()}@example.com`)

      await expect(
        partnershipService.cancelPartnership(
          created.insertedId.toString(),
          worker.insertedId.toString(),
          USER_ROLES.WORKER,
          'Unauthorized cancel'
        )
      ).rejects.toMatchObject({ statusCode: StatusCodes.FORBIDDEN })
    })

    it('should reject operations for missing partnership', async () => {
      await expect(
        partnershipService.respondPartnership(
          new ObjectId().toString(),
          trainerId,
          {
            proposedCourseIds: [course1Id],
            tuitionFee: 3000000,
            message: 'No partnership'
          }
        )
      ).rejects.toMatchObject({ statusCode: StatusCodes.NOT_FOUND })
    })
  })
})
