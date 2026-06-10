import { describe, it, expect, beforeEach } from '@jest/globals'
import { ObjectId } from 'mongodb'
import { userModel } from '~/models/userModel'
import { categoryModel } from '~/models/categoryModel'
import { courseModel } from '~/models/courseModel'
import { workerProfileModel } from '~/models/workerProfileModel'
import { enrollmentModel } from '~/models/enrollmentModel'
import { partnershipModel } from '~/models/partnershipModel'
import { courseSponsorshipModel } from '~/models/courseSponsorshipModel'
import { enrollmentService } from '~/services/enrollmentService'
import { StatusCodes } from 'http-status-codes'
import {
  USER_ROLES,
  COURSE_STATUS,
  DURATION_UNITS,
  LOCATION_TYPES,
  COURSE_DELIVERY_TYPES,
  COURSE_FUNDING_MODELS,
  ENROLLMENT_STATUS_V2,
  COMPLETION_STATUS,
  PARTNERSHIP_STATUS,
  COURSE_SPONSORSHIP_STATUS,
  DISBURSEMENT_MODEL,
  SCHOLARSHIP_COVERAGE,
  ORGANIZATION_TYPES,
  EDUCATION_LEVELS,
  JOB_TYPES
} from '~/utils/constants'

async function createTestUser(role = USER_ROLES.WORKER, displayName = 'Test User', email = '') {
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
    description: overrides.description || 'Mô tả khóa học đủ dài để hợp lệ cho enrollment integration tests.',
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
    fee: overrides.fee ?? 5000000,
    isFree: overrides.isFree ?? false,
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

async function createWorkerProfile(userId, profileData = {}) {
  const created = await workerProfileModel.createNew({
    userId: userId.toString(),
    currentStep: 1,
    isCompleted: false,
    basicInfo: profileData.basicInfo || {
      age: 45,
      gender: 'male',
      province: '79',
      education: EDUCATION_LEVELS.UNIVERSITY,
      maritalStatus: 'single',
      phone: '0900000000'
    },
    employmentHistory: profileData.employmentHistory || [{
      occupation: 'Software Engineer',
      companyName: 'Tech Corp',
      jobType: JOB_TYPES.FULL_TIME
    }],
    ...profileData
  }, true)
  await workerProfileModel.completeProfile(userId.toString())
  return created
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

async function createSponsorship(sponsorId, sponsorType, courseId, overrides = {}) {
  return await courseSponsorshipModel.createNew({
    sponsorType,
    sponsorId: sponsorId.toString(),
    title: overrides.title || 'Test Sponsorship',
    description: overrides.description || 'Test sponsorship for enrollment integration',
    linkedCourses: overrides.linkedCourses || [
      { courseId: courseId.toString(), coverage: SCHOLARSHIP_COVERAGE.FULL, maxAmount: 5000000 }
    ],
    budget: overrides.budget || 50000000,
    spent: overrides.spent || 0,
    remaining: overrides.remaining ?? (overrides.budget || 50000000),
    coverageType: overrides.coverageType || SCHOLARSHIP_COVERAGE.FULL,
    maxAmountPerLearner: overrides.maxAmountPerLearner || 5000000,
    disbursementModel: overrides.disbursementModel || DISBURSEMENT_MODEL.COMPLETION,
    eligibilityCriteria: overrides.eligibilityCriteria || {},
    status: overrides.status || COURSE_SPONSORSHIP_STATUS.ACTIVE,
    autoApprove: overrides.autoApprove ?? false,
    priorityRecruitment: overrides.priorityRecruitment ?? false,
    clawbackPolicy: overrides.clawbackPolicy || {
      enabled: false,
      refundOnDrop: false,
      refundOnNoShow: false,
      notes: null
    },
    disbursements: overrides.disbursements || []
  })
}

describe('Phase 5 — enrollmentService integration', () => {
  let trainerId
  let enterpriseId
  let ngoId
  let workerId
  let otherWorkerId
  let categoryId
  let directCourseId
  let linkedCourseId

  beforeEach(async () => {
    const trainer = await createTestUser(USER_ROLES.TRAINER, 'Trainer One')
    trainerId = trainer.insertedId.toString()

    const enterprise = await createTestUser(USER_ROLES.ENTERPRISE, 'Enterprise One', `enterprise_${Date.now()}@example.com`)
    enterpriseId = enterprise.insertedId.toString()

    const ngo = await createTestUser(USER_ROLES.NGO, 'NGO One', `ngo_${Date.now()}@example.com`)
    ngoId = ngo.insertedId.toString()

    const worker = await createTestUser(USER_ROLES.WORKER, 'Worker One', `worker_${Date.now()}@example.com`)
    workerId = worker.insertedId.toString()
    await createWorkerProfile(workerId)

    const otherWorker = await createTestUser(USER_ROLES.WORKER, 'Worker Two', `worker2_${Date.now()}@example.com`)
    otherWorkerId = otherWorker.insertedId.toString()
    await createWorkerProfile(otherWorkerId)

    const category = await createTestCategory()
    categoryId = category.insertedId.toString()

    const directCourse = await createTrainerCourse(trainerId, categoryId, {
      title: 'Direct Course',
      slug: `direct-course-${Date.now()}`
    })
    directCourseId = directCourse.insertedId.toString()

    const linkedCourse = await createTrainerCourse(trainerId, categoryId, {
      title: 'Enterprise Linked Course',
      slug: `linked-course-${Date.now()}`
    })
    linkedCourseId = linkedCourse.insertedId.toString()
  })

  describe('enrollCourse with sponsorship matching', () => {
    it('should reject duplicate active enrollment', async () => {
      await enrollmentService.enrollCourse(workerId, directCourseId, {
        motivation: 'First enrollment',
        source: 'direct'
      })

      await expect(
        enrollmentService.enrollCourse(workerId, directCourseId, {
          motivation: 'Second enrollment',
          source: 'direct'
        })
      ).rejects.toMatchObject({ statusCode: StatusCodes.CONFLICT })
    })

    it('should resolve enterprise_sponsored source from course sponsorship', async () => {
      await createSponsorship(enterpriseId, ORGANIZATION_TYPES.ENTERPRISE, directCourseId, {
        eligibilityCriteria: {
          ageMin: 35,
          ageMax: 55,
          provinces: ['79']
        }
      })

      const result = await enrollmentService.enrollCourse(workerId, directCourseId, {
        motivation: 'Enterprise funded',
        source: 'enterprise_sponsored'
      })

      expect(result.enrollment.source).toBe('enterprise_sponsored')
      expect(result.enrollment.sponsorships).toHaveLength(1)
      expect(result.enrollment.sponsorships[0].sponsorType).toBe(ORGANIZATION_TYPES.ENTERPRISE)
      expect(result.enrollment.enterpriseId).toBe(enterpriseId)
    })

    it('should resolve ngo_sponsored source from course sponsorship', async () => {
      await createSponsorship(ngoId, ORGANIZATION_TYPES.NGO, directCourseId, {
        eligibilityCriteria: {
          ageMin: 35,
          ageMax: 55,
          provinces: ['79']
        }
      })

      const result = await enrollmentService.enrollCourse(workerId, directCourseId, {
        motivation: 'NGO funded',
        source: 'ngo_sponsored'
      })

      expect(result.enrollment.source).toBe('ngo_sponsored')
      expect(result.enrollment.sponsorships).toHaveLength(1)
      expect(result.enrollment.sponsorships[0].sponsorType).toBe(ORGANIZATION_TYPES.NGO)
    })

    it('should resolve enterprise_linked source from partnership when no sponsorship match', async () => {
      const partnership = await createPartnership(enterpriseId, trainerId, {
        linkedCourseIds: [linkedCourseId],
        status: PARTNERSHIP_STATUS.ACTIVE,
        signedAt: Date.now()
      })
      await courseModel.update(linkedCourseId, {
        linkedPartnershipId: partnership.insertedId.toString(),
        linkedEnterpriseId: enterpriseId
      })

      const result = await enrollmentService.enrollCourse(workerId, linkedCourseId, {
        motivation: 'Enterprise linked',
        source: 'enterprise_linked'
      })

      expect(result.enrollment.source).toBe('enterprise_linked')
      expect(result.enrollment.partnershipId).toBe(partnership.insertedId.toString())
      expect(result.enrollment.enterpriseId).toBe(enterpriseId)
      expect(result.enrollment.sponsorships).toHaveLength(0)
    })

    it('should leave source=direct if no sponsorship match and no partnership', async () => {
      const result = await enrollmentService.enrollCourse(workerId, directCourseId, {
        motivation: 'Direct self-funded',
        source: 'direct'
      })

      expect(result.enrollment.source).toBe('direct')
      expect(result.enrollment.sponsorships).toHaveLength(0)
      expect(result.enrollment.partnershipId).toBeNull()
      expect(result.enrollment.enterpriseId).toBeNull()
    })

    it('should resolve co_funded when both enterprise and NGO sponsor same course', async () => {
      await createSponsorship(enterpriseId, ORGANIZATION_TYPES.ENTERPRISE, directCourseId)
      await createSponsorship(ngoId, ORGANIZATION_TYPES.NGO, directCourseId)

      const result = await enrollmentService.enrollCourse(workerId, directCourseId, {
        motivation: 'Co-funded enrollment'
      })

      expect(result.enrollment.source).toBe('co_funded')
      expect(result.enrollment.sponsorships.length).toBeGreaterThanOrEqual(2)
    })

    it('should reject enrollment when worker profile is missing', async () => {
      const incompleteWorker = await createTestUser(USER_ROLES.WORKER, 'No Profile Worker', `noprof_${Date.now()}@example.com`)

      await expect(
        enrollmentService.enrollCourse(incompleteWorker.insertedId.toString(), directCourseId, {
          motivation: 'Should fail',
          source: 'direct'
        })
      ).rejects.toMatchObject({ statusCode: StatusCodes.BAD_REQUEST })
    })
  })

  describe('status update triggers', () => {
    it('updateProgress should NOT trigger disbursement', async () => {
      const sponsorship = await createSponsorship(enterpriseId, ORGANIZATION_TYPES.ENTERPRISE, directCourseId, {
        disbursementModel: DISBURSEMENT_MODEL.COMPLETION
      })

      const result = await enrollmentService.enrollCourse(workerId, directCourseId, {
        motivation: 'Progress test',
        source: 'enterprise_sponsored'
      })
      const enrollmentId = result.enrollment._id.toString()

      await enrollmentService.updateProgress(
        enrollmentId,
        {
          percentage: 50,
          currentLesson: 5,
          totalLessons: 10,
          assessments: [],
          notes: 'Halfway through'
        },
        trainerId
      )

      const updatedSponsorship = await courseSponsorshipModel.findOneById(sponsorship.insertedId)
      expect(updatedSponsorship.spent).toBe(0)
      expect((updatedSponsorship.disbursements || []).length).toBe(0)
    })

    it('updateStatus active -> active should NOT trigger disbursement', async () => {
      const sponsorship = await createSponsorship(enterpriseId, ORGANIZATION_TYPES.ENTERPRISE, directCourseId, {
        disbursementModel: DISBURSEMENT_MODEL.COMPLETION
      })

      const result = await enrollmentService.enrollCourse(workerId, directCourseId, {
        motivation: 'Status no-op test',
        source: 'enterprise_sponsored'
      })
      const enrollmentId = result.enrollment._id.toString()

      await enrollmentService.updateStatus(enrollmentId, ENROLLMENT_STATUS_V2.ACTIVE, {}, trainerId)

      const updatedSponsorship = await courseSponsorshipModel.findOneById(sponsorship.insertedId)
      expect(updatedSponsorship.spent).toBe(0)
    })

    it('updateStatus active -> completed should trigger disbursement', async () => {
      const sponsorship = await createSponsorship(enterpriseId, ORGANIZATION_TYPES.ENTERPRISE, directCourseId, {
        disbursementModel: DISBURSEMENT_MODEL.COMPLETION
      })

      const result = await enrollmentService.enrollCourse(workerId, directCourseId, {
        motivation: 'Completion trigger',
        source: 'enterprise_sponsored'
      })
      const enrollmentId = result.enrollment._id.toString()

      await enrollmentService.completeEnrollment(enrollmentId, trainerId)

      const updatedEnrollment = await enrollmentModel.findOneById(enrollmentId)
      const updatedSponsorship = await courseSponsorshipModel.findOneById(sponsorship.insertedId)

      expect(updatedEnrollment.status).toBe(ENROLLMENT_STATUS_V2.COMPLETED)
      expect(updatedEnrollment.sponsorships[0].disbursedAmount).toBeGreaterThan(0)
      expect(updatedSponsorship.spent).toBeGreaterThan(0)
    })

    it('cancelEnrollment should trigger clawback if disbursed', async () => {
      const sponsorship = await createSponsorship(enterpriseId, ORGANIZATION_TYPES.ENTERPRISE, directCourseId, {
        disbursementModel: DISBURSEMENT_MODEL.COMPLETION,
        clawbackPolicy: {
          enabled: true,
          refundOnDrop: true,
          refundOnNoShow: false,
          notes: 'Cancel clawback test'
        }
      })

      const result = await enrollmentService.enrollCourse(workerId, directCourseId, {
        motivation: 'Cancel test',
        source: 'enterprise_sponsored'
      })
      const enrollmentId = result.enrollment._id.toString()

      await enrollmentService.completeEnrollment(enrollmentId, trainerId)
      await enrollmentService.cancelEnrollment(enrollmentId, workerId, 'Cancel after completion')

      const updatedEnrollment = await enrollmentModel.findOneById(enrollmentId)
      const updatedSponsorship = await courseSponsorshipModel.findOneById(sponsorship.insertedId)

      expect(updatedEnrollment.sponsorships[0].clawbackAmount).toBeGreaterThan(0)
      expect(updatedSponsorship.disbursements.some(d => d.type === 'clawback')).toBe(true)
    })

    it('failEnrollment should trigger clawback', async () => {
      const sponsorship = await createSponsorship(enterpriseId, ORGANIZATION_TYPES.ENTERPRISE, directCourseId, {
        disbursementModel: DISBURSEMENT_MODEL.COMPLETION,
        clawbackPolicy: {
          enabled: true,
          refundOnDrop: true,
          refundOnNoShow: false,
          notes: 'Fail clawback test'
        }
      })

      const result = await enrollmentService.enrollCourse(workerId, directCourseId, {
        motivation: 'Fail test',
        source: 'enterprise_sponsored'
      })
      const enrollmentId = result.enrollment._id.toString()

      await enrollmentService.completeEnrollment(enrollmentId, trainerId)
      await enrollmentService.failEnrollment(enrollmentId, trainerId, 'Did not pass assessment')

      const updatedEnrollment = await enrollmentModel.findOneById(enrollmentId)
      const updatedSponsorship = await courseSponsorshipModel.findOneById(sponsorship.insertedId)

      expect(updatedEnrollment.sponsorships[0].clawbackAmount).toBeGreaterThan(0)
      expect(updatedSponsorship.disbursements.some(d => d.type === 'clawback')).toBe(true)
    })

    it('dropEnrollment should trigger clawback + partnership notification', async () => {
      const partnership = await createPartnership(enterpriseId, trainerId, {
        linkedCourseIds: [linkedCourseId],
        status: PARTNERSHIP_STATUS.ACTIVE,
        signedAt: Date.now()
      })
      await courseModel.update(linkedCourseId, {
        linkedPartnershipId: partnership.insertedId.toString(),
        linkedEnterpriseId: enterpriseId
      })

      const sponsorship = await createSponsorship(enterpriseId, ORGANIZATION_TYPES.ENTERPRISE, linkedCourseId, {
        disbursementModel: DISBURSEMENT_MODEL.COMPLETION,
        clawbackPolicy: {
          enabled: true,
          refundOnDrop: true,
          refundOnNoShow: false,
          notes: 'Dropout clawback test'
        }
      })

      const result = await enrollmentService.enrollCourse(workerId, linkedCourseId, {
        motivation: 'Drop test',
        source: 'enterprise_sponsored'
      })
      const enrollmentId = result.enrollment._id.toString()

      await enrollmentService.completeEnrollment(enrollmentId, trainerId)
      await enrollmentService.dropEnrollment(enrollmentId, workerId, 'Dropped out')

      const updatedEnrollment = await enrollmentModel.findOneById(enrollmentId)
      const updatedSponsorship = await courseSponsorshipModel.findOneById(sponsorship.insertedId)

      expect(updatedEnrollment.sponsorships[0].clawbackAmount).toBeGreaterThan(0)
      expect(updatedSponsorship.disbursements.some(d => d.type === 'clawback')).toBe(true)
    })
  })
})
