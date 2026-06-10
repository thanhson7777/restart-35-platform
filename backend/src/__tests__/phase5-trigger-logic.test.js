import { describe, it, expect, beforeEach } from '@jest/globals'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { userModel } from '~/models/userModel'
import { categoryModel } from '~/models/categoryModel'
import { courseModel } from '~/models/courseModel'
import { enrollmentModel } from '~/models/enrollmentModel'
import { partnershipModel } from '~/models/partnershipModel'
import { courseSponsorshipModel } from '~/models/courseSponsorshipModel'
import { placementModel } from '~/models/placementModel'
import { workerProfileModel } from '~/models/workerProfileModel'
import { enrollmentService } from '~/services/enrollmentService'
import { placementService } from '~/services/placementService'
import { notificationService } from '~/services/notificationService'
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
  PLACEMENT_STATUS,
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
    description: overrides.description || 'Mô tả khóa học đủ dài để hợp lệ và dùng cho trigger tests.',
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
      referralBonus: overrides.referralBonus ?? 500000
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
    description: overrides.description || 'Test sponsorship for trigger logic',
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

async function createPlacement(enrollmentId, userId, courseId, overrides = {}) {
  return await placementModel.createNew({
    enrollmentId: enrollmentId.toString(),
    userId: userId.toString(),
    courseId: courseId.toString(),
    status: overrides.status || PLACEMENT_STATUS.OFFERED,
    employer: overrides.employer || {
      name: 'Test Company',
      industry: 'Technology',
      address: 'HCM City',
      contactPerson: 'HR Manager',
      contactEmail: 'hr@test.com'
    },
    job: overrides.job || {
      title: 'Software Engineer',
      salary: 15000000,
      currency: 'VND',
      employmentType: 'full-time'
    },
    referralSource: overrides.referralSource || null,
    partnershipId: overrides.partnershipId || null,
    sponsorshipId: overrides.sponsorshipId || null,
    partnershipStatsUpdated: overrides.partnershipStatsUpdated ?? false,
    referralBonusRecorded: overrides.referralBonusRecorded ?? false
  })
}

describe('Phase 5 — trigger logic', () => {
  let trainerId
  let enterpriseId
  let ngoId
  let workerId
  let categoryId
  let courseId
  let partnershipId

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

    const category = await createTestCategory()
    categoryId = category.insertedId.toString()

    const course = await createTrainerCourse(trainerId, categoryId, {
      title: 'Sponsored Course',
      slug: `sponsored-course-${Date.now()}`
    })
    courseId = course.insertedId.toString()

    const partnership = await createPartnership(enterpriseId, trainerId, {
      linkedCourseIds: [courseId],
      status: PARTNERSHIP_STATUS.ACTIVE,
      signedAt: Date.now(),
      agreedTerms: {
        linkedCourseIds: [courseId],
        tuitionFeePerLearner: 3000000,
        paymentTerms: '50/50',
        placementGuarantee: true,
        guaranteePeriodMonths: 3,
        referralBonus: 500000
      }
    })
    partnershipId = partnership.insertedId.toString()

    await courseModel.update(courseId, {
      linkedPartnershipId: partnershipId,
      linkedEnterpriseId: enterpriseId
    })
  })

  describe('disbursement trigger on completion', () => {
    it('should trigger disbursement when enrollment is completed (completion model)', async () => {
      const sponsorship = await createSponsorship(enterpriseId, ORGANIZATION_TYPES.ENTERPRISE, courseId, {
        disbursementModel: DISBURSEMENT_MODEL.COMPLETION,
        clawbackPolicy: { enabled: true, refundOnDrop: true, refundOnNoShow: false, notes: null }
      })

      const enrollmentResult = await enrollmentService.enrollCourse(workerId, courseId, {
        motivation: 'Learn',
        source: 'enterprise_sponsored'
      })

      const beforeSponsorship = await courseSponsorshipModel.findOneById(sponsorship.insertedId)
      expect(beforeSponsorship.spent).toBe(0)
      expect((beforeSponsorship.disbursements || []).length).toBe(0)

      await enrollmentService.completeEnrollment(enrollmentResult.enrollment._id.toString(), trainerId)

      const updatedEnrollment = await enrollmentModel.findOneById(enrollmentResult.enrollment._id.toString())
      const updatedSponsorship = await courseSponsorshipModel.findOneById(sponsorship.insertedId)
      const updatedPartnership = await partnershipModel.findOneById(partnershipId)
      const notifications = await GET_DB().collection('notification_jobs').find({}).toArray()

      expect(updatedEnrollment.sponsorships).toHaveLength(1)
      expect(updatedEnrollment.sponsorships[0].disbursedAmount).toBeGreaterThan(0)
      expect(updatedEnrollment.sponsorships[0].status).toBe('disbursed')
      expect(updatedSponsorship.spent).toBeGreaterThan(0)
      expect(updatedSponsorship.remaining).toBeLessThan(50000000)
      expect(updatedSponsorship.disbursements.some(d => d.type === 'disbursement')).toBe(true)
      expect(updatedPartnership.stats.completedLearners).toBe(1)
      expect(notifications.some(n => n.eventType === notificationService.NOTIFICATION_EVENT_TYPES.SPONSORSHIP_DISBURSEMENT_CREATED)).toBe(true)
      expect(notifications.some(n => n.eventType === notificationService.NOTIFICATION_EVENT_TYPES.ENROLLMENT_COMPLETED_FOR_PARTNERSHIP)).toBe(true)
    })

    it('should NOT disburse twice for same milestone', async () => {
      const sponsorship = await createSponsorship(enterpriseId, ORGANIZATION_TYPES.ENTERPRISE, courseId, {
        disbursementModel: DISBURSEMENT_MODEL.COMPLETION
      })

      const enrollmentResult = await enrollmentService.enrollCourse(workerId, courseId, {
        motivation: 'Learn',
        source: 'enterprise_sponsored'
      })

      await enrollmentService.completeEnrollment(enrollmentResult.enrollment._id.toString(), trainerId)
      const afterFirst = await courseSponsorshipModel.findOneById(sponsorship.insertedId)
      const firstSpent = afterFirst.spent
      const firstCount = (afterFirst.disbursements || []).filter(d => d.type === 'disbursement').length

      const refreshedEnrollment = await enrollmentModel.findOneById(enrollmentResult.enrollment._id.toString())
      await enrollmentService.processEnrollmentCompletionTriggers(refreshedEnrollment)

      const afterSecond = await courseSponsorshipModel.findOneById(sponsorship.insertedId)
      const secondSpent = afterSecond.spent
      const secondCount = (afterSecond.disbursements || []).filter(d => d.type === 'disbursement').length

      expect(secondSpent).toBe(firstSpent)
      expect(secondCount).toBe(firstCount)
    })
  })

  describe('clawback trigger on dropout', () => {
    it('should trigger clawback when learner drops and policy enabled', async () => {
      const sponsorship = await createSponsorship(enterpriseId, ORGANIZATION_TYPES.ENTERPRISE, courseId, {
        disbursementModel: DISBURSEMENT_MODEL.COMPLETION,
        clawbackPolicy: {
          enabled: true,
          refundOnDrop: true,
          refundOnNoShow: false,
          notes: 'Clawback enabled'
        }
      })

      const enrollmentResult = await enrollmentService.enrollCourse(workerId, courseId, {
        motivation: 'Learn',
        source: 'enterprise_sponsored'
      })
      const enrollmentId = enrollmentResult.enrollment._id.toString()

      await enrollmentService.completeEnrollment(enrollmentId, trainerId)
      await enrollmentService.dropEnrollment(enrollmentId, workerId, 'Personal issue')

      const updatedEnrollment = await enrollmentModel.findOneById(enrollmentId)
      const updatedSponsorship = await courseSponsorshipModel.findOneById(sponsorship.insertedId)
      const notifications = await GET_DB().collection('notification_jobs').find({}).toArray()

      expect(updatedEnrollment.sponsorships[0].clawbackAmount).toBeGreaterThan(0)
      expect(updatedEnrollment.sponsorships[0].status).toBe('clawback')
      expect(updatedSponsorship.disbursements.some(d => d.type === 'clawback')).toBe(true)
      expect(notifications.some(n => n.eventType === notificationService.NOTIFICATION_EVENT_TYPES.SPONSORSHIP_CLAWBACK_CREATED)).toBe(true)
      expect(notifications.some(n => n.eventType === notificationService.NOTIFICATION_EVENT_TYPES.ENROLLMENT_DROPPED_WITH_FUNDING)).toBe(true)
    })

    it('should NOT trigger clawback if policy disabled', async () => {
      const sponsorship = await createSponsorship(enterpriseId, ORGANIZATION_TYPES.ENTERPRISE, courseId, {
        disbursementModel: DISBURSEMENT_MODEL.COMPLETION,
        clawbackPolicy: {
          enabled: false,
          refundOnDrop: false,
          refundOnNoShow: false,
          notes: null
        }
      })

      const enrollmentResult = await enrollmentService.enrollCourse(workerId, courseId, {
        motivation: 'Learn',
        source: 'enterprise_sponsored'
      })
      const enrollmentId = enrollmentResult.enrollment._id.toString()

      await enrollmentService.completeEnrollment(enrollmentId, trainerId)
      await enrollmentService.dropEnrollment(enrollmentId, workerId, 'Personal issue')

      const updatedEnrollment = await enrollmentModel.findOneById(enrollmentId)
      const updatedSponsorship = await courseSponsorshipModel.findOneById(sponsorship.insertedId)
      const notifications = await GET_DB().collection('notification_jobs').find({}).toArray()

      expect(updatedEnrollment.sponsorships[0].clawbackAmount || 0).toBe(0)
      expect(updatedSponsorship.disbursements.some(d => d.type === 'clawback')).toBe(false)
      expect(notifications.some(n => n.eventType === notificationService.NOTIFICATION_EVENT_TYPES.SPONSORSHIP_CLAWBACK_CREATED)).toBe(false)
    })

    it('should NOT trigger clawback if no disbursement was made', async () => {
      await createSponsorship(enterpriseId, ORGANIZATION_TYPES.ENTERPRISE, courseId, {
        disbursementModel: DISBURSEMENT_MODEL.UPFRONT,
        clawbackPolicy: {
          enabled: true,
          refundOnDrop: true,
          refundOnNoShow: false,
          notes: 'Clawback enabled'
        }
      })

      const enrollmentResult = await enrollmentService.enrollCourse(workerId, courseId, {
        motivation: 'Learn',
        source: 'enterprise_sponsored'
      })
      const enrollmentId = enrollmentResult.enrollment._id.toString()

      const enrollment = await enrollmentModel.findOneById(enrollmentId)
      await enrollmentService.processEnrollmentDropTriggers(enrollment, 'Dropped before completion')

      const updatedEnrollment = await enrollmentModel.findOneById(enrollmentId)
      expect(updatedEnrollment.sponsorships[0].clawbackAmount || 0).toBe(0)
    })
  })

  describe('referral bonus on placement', () => {
    it('should calculate and record referral bonus when placement ACCEPTED', async () => {
      const enrollmentResult = await enrollmentService.enrollCourse(workerId, courseId, {
        motivation: 'Learn',
        source: 'enterprise_linked'
      })
      const enrollmentId = enrollmentResult.enrollment._id.toString()

      const createdPlacement = await createPlacement(enrollmentId, workerId, courseId, {
        status: PLACEMENT_STATUS.OFFERED,
        partnershipId
      })

      const updatedPlacement = await placementService.updatePlacementStatus(
        createdPlacement.insertedId.toString(),
        PLACEMENT_STATUS.ACCEPTED,
        {},
        trainerId
      )

      const refreshedPartnership = await partnershipModel.findOneById(partnershipId)
      const notifications = await GET_DB().collection('notification_jobs').find({}).toArray()
      const bonusNotifications = notifications.filter(
        n => n.eventType === notificationService.NOTIFICATION_EVENT_TYPES.REFERRAL_BONUS_CREATED
      )

      expect(updatedPlacement.status).toBe(PLACEMENT_STATUS.ACCEPTED)
      expect(refreshedPartnership.stats.placedLearners).toBe(1)
      expect(bonusNotifications.length).toBe(1)
      expect(bonusNotifications[0].payload.bonus.amount).toBe(500000)
      expect(notifications.some(n => n.eventType === notificationService.NOTIFICATION_EVENT_TYPES.ENROLLMENT_PLACED_FOR_PARTNERSHIP)).toBe(true)
    })

    it('should NOT record bonus twice', async () => {
      const enrollmentResult = await enrollmentService.enrollCourse(workerId, courseId, {
        motivation: 'Learn',
        source: 'enterprise_linked'
      })
      const enrollmentId = enrollmentResult.enrollment._id.toString()

      const createdPlacement = await createPlacement(enrollmentId, workerId, courseId, {
        status: PLACEMENT_STATUS.OFFERED,
        partnershipId
      })

      await placementService.updatePlacementStatus(
        createdPlacement.insertedId.toString(),
        PLACEMENT_STATUS.ACCEPTED,
        {},
        trainerId
      )

      const afterFirst = await GET_DB().collection('notification_jobs').find({
        eventType: notificationService.NOTIFICATION_EVENT_TYPES.REFERRAL_BONUS_CREATED
      }).toArray()

      await placementService.updatePlacementStatus(
        createdPlacement.insertedId.toString(),
        PLACEMENT_STATUS.ACCEPTED,
        {},
        trainerId
      ).catch(() => {})

      const afterSecond = await GET_DB().collection('notification_jobs').find({
        eventType: notificationService.NOTIFICATION_EVENT_TYPES.REFERRAL_BONUS_CREATED
      }).toArray()

      expect(afterSecond.length).toBe(afterFirst.length)
    })

    it('should update partnership stats.placedLearners on ACCEPTED', async () => {
      const enrollmentResult = await enrollmentService.enrollCourse(workerId, courseId, {
        motivation: 'Learn',
        source: 'enterprise_linked'
      })
      const enrollmentId = enrollmentResult.enrollment._id.toString()

      const createdPlacement = await createPlacement(enrollmentId, workerId, courseId, {
        status: PLACEMENT_STATUS.OFFERED,
        partnershipId
      })

      const before = await partnershipModel.findOneById(partnershipId)
      expect(before.stats.placedLearners).toBe(0)

      await placementService.updatePlacementStatus(
        createdPlacement.insertedId.toString(),
        PLACEMENT_STATUS.ACCEPTED,
        {},
        trainerId
      )

      const after = await partnershipModel.findOneById(partnershipId)
      expect(after.stats.placedLearners).toBe(1)
    })
  })

  describe('sponsorship matching on enrollCourse', () => {
    it('should auto-match eligible sponsorship when worker enrolls', async () => {
      await createSponsorship(ngoId, ORGANIZATION_TYPES.NGO, courseId, {
        eligibilityCriteria: {
          ageMin: 35,
          ageMax: 55,
          maxIncome: 20000000,
          provinces: ['79'],
          education: [EDUCATION_LEVELS.UNIVERSITY]
        }
      })

      const result = await enrollmentService.enrollCourse(workerId, courseId, {
        motivation: 'Learn',
        source: 'ngo_sponsored'
      })

      expect(result.enrollment.sponsorships).toHaveLength(1)
      expect(result.enrollment.sponsorships[0].sponsorType).toBe(ORGANIZATION_TYPES.NGO)
      expect(result.enrollment.source).toBe('ngo_sponsored')
    })

    it('should resolve co_funded source when both enterprise and NGO sponsor same course', async () => {
      await createSponsorship(enterpriseId, ORGANIZATION_TYPES.ENTERPRISE, courseId)
      await createSponsorship(ngoId, ORGANIZATION_TYPES.NGO, courseId)

      const result = await enrollmentService.enrollCourse(workerId, courseId, {
        motivation: 'Learn'
      })

      expect(result.enrollment.sponsorships.length).toBeGreaterThanOrEqual(2)
      expect(result.enrollment.source).toBe('co_funded')
    })
  })
})
