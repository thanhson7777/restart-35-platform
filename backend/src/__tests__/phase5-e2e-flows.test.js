/**
 * Phase 5 — E2E Flow Tests
 *
 * End-to-end integration tests covering the 3 main business flows:
 * - Flow A: Enterprise Recruitment Partnership (Enterprise links Trainer → Trainer trains workers → Workers complete → Placed)
 * - Flow B: Enterprise Sponsorship (Enterprise creates scholarship → Worker enrolls → Completes → Drop triggers clawback)
 * - Flow C: NGO Sponsorship (NGO creates scholarship → Worker enrolls → Completes → Disbursement recorded)
 */

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
    description: 'E2E test category'
  })
}

async function createCourse(trainerId, categoryId, overrides = {}) {
  return await courseModel.createNew({
    title: overrides.title || `Course ${Date.now()}`,
    description: overrides.description || 'Day la mo ta khoa hoc du dai de pass validation cho E2E test.',
    shortDescription: overrides.shortDescription || 'Mo ta ngan',
    slug: overrides.slug || `course-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    categoryId: categoryId.toString(),
    providerId: trainerId.toString(),
    providerName: overrides.providerName || 'Trainer Center',
    providerEmail: overrides.providerEmail || 'trainer@example.com',
    duration: overrides.duration || { value: 6, unit: DURATION_UNITS.WEEKS },
    location: overrides.location || { type: LOCATION_TYPES.ONLINE, address: '', link: '' },
    delivery_type: overrides.delivery_type || COURSE_DELIVERY_TYPES.VIDEO,
    funding_model: overrides.funding_model || COURSE_FUNDING_MODELS.FREE,
    fee: overrides.fee ?? 0,
    isFree: overrides.isFree ?? false,
    maxStudents: overrides.maxStudents ?? 25,
    skills: overrides.skills || ['JavaScript'],
    prerequisites: overrides.prerequisites || [],
    requirements: overrides.requirements || [],
    syllabus: overrides.syllabus || [],
    outcomes: overrides.outcomes || [],
    linkedPartnershipId: overrides.linkedPartnershipId || null,
    linkedEnterpriseId: overrides.linkedEnterpriseId || null,
    sponsorship: { hasSponsorship: false, sponsorTypes: [], activeSponsorshipIds: [], priorityRecruitment: false, badgeLabel: null },
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
      province: 'HCM',
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
      jobTitle: 'Nhan vien pha che',
      jobQuantity: 10,
      salaryRange: { min: 8000000, max: 12000000, currency: 'VND' },
      requirements: ['Giao tiep tot'],
      targetSkills: ['pha che'],
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
    clawbackPolicy: overrides.clawbackPolicy || {
      enabled: false,
      refundOnDrop: false,
      refundOnNoShow: false,
      notes: null
    },
    disbursements: overrides.disbursements || []
  })
}

describe('Phase 5 — E2E Flows', () => {
  // ====================================================================
  // Flow A: Enterprise Recruitment Partnership
  // enterprise creates → trainer responds → confirm → worker enrolls → complete → placement
  // ====================================================================
  describe('Flow A: Enterprise Recruitment Partnership', () => {
    let trainerId, enterpriseId, workerId, categoryId, courseId, partnershipId

    beforeEach(async () => {
      const trainer = await createTestUser(USER_ROLES.TRAINER, 'Flow A Trainer')
      trainerId = trainer.insertedId.toString()

      const enterprise = await createTestUser(USER_ROLES.ENTERPRISE, 'Flow A Enterprise', `flowa_ent_${Date.now()}@example.com`)
      enterpriseId = enterprise.insertedId.toString()

      const worker = await createTestUser(USER_ROLES.WORKER, 'Flow A Worker', `flowa_worker_${Date.now()}@example.com`)
      workerId = worker.insertedId.toString()
      await createWorkerProfile(workerId)

      const category = await createTestCategory()
      categoryId = category.insertedId.toString()

      const course = await createCourse(trainerId, categoryId, {
        title: 'Flow A Course',
        slug: `flow-a-course-${Date.now()}`
      })
      courseId = course.insertedId.toString()
    })

    it('E2E: enterprise creates → trainer responds → confirm → workers enroll → complete → placement', async () => {
      // Step 1: Enterprise creates partnership (PENDING)
      const partnership = await partnershipModel.createNew({
        enterpriseId,
        trainerId,
        requestedCourseIds: [courseId],
        recruitmentNeeds: {
          jobTitle: 'Nhan vien pha che',
          jobQuantity: 10,
          salaryRange: { min: 8000000, max: 12000000, currency: 'VND' },
          requirements: ['Giao tiep tot'],
          targetSkills: ['pha che'],
          employmentType: 'full-time'
        },
        agreedTerms: {
          linkedCourseIds: [],
          tuitionFeePerLearner: 3000000,
          paymentTerms: '50/50',
          placementGuarantee: true,
          guaranteePeriodMonths: 3,
          referralBonus: 500000
        },
        referralBonus: 500000,
        status: PARTNERSHIP_STATUS.PENDING,
        message: 'Want to hire trained baristas',
        stats: { enrolledLearners: 0, completedLearners: 0, placedLearners: 0 }
      }, true)
      partnershipId = partnership.insertedId.toString()

      expect(partnership.status).toBe(PARTNERSHIP_STATUS.PENDING)

      // Step 2: Trainer responds (NEGOTIATING)
      const responded = await partnershipModel.respond(partnershipId, {
        proposedCourseIds: [courseId],
        tuitionFee: 3500000,
        message: 'Trainer agrees to deliver barista course'
      })
      expect(responded.status).toBe(PARTNERSHIP_STATUS.NEGOTIATING)

      // Step 3: Enterprise confirms partnership (ACTIVE)
      const confirmed = await partnershipModel.confirm(partnershipId, {
        linkedCourseIds: [courseId],
        agreedTerms: {
          linkedCourseIds: [courseId],
          tuitionFeePerLearner: 3500000,
          paymentTerms: '50/50',
          placementGuarantee: true,
          guaranteePeriodMonths: 3,
          referralBonus: 500000
        }
      })
      expect(confirmed.status).toBe(PARTNERSHIP_STATUS.ACTIVE)
      expect(confirmed.signedAt).toBeTruthy()

      // Link course to partnership
      await courseModel.update(courseId, {
        linkedPartnershipId: partnershipId,
        linkedEnterpriseId: enterpriseId
      })

      // Step 4: Worker enrolls in linked course
      const enrollmentResult = await enrollmentService.enrollCourse(workerId, courseId, {
        motivation: 'Want to become a barista',
        source: 'enterprise_linked'
      })

      expect(enrollmentResult.enrollment.source).toBe('enterprise_linked')
      expect(enrollmentResult.enrollment.partnershipId).toBe(partnershipId)
      expect(enrollmentResult.enrollment.enterpriseId).toBe(enterpriseId)

      const enrollmentId = enrollmentResult.enrollment._id.toString()

      // Step 5: Trainer marks enrollment as completed
      await enrollmentService.completeEnrollment(enrollmentId, trainerId)

      const completedEnrollment = await enrollmentModel.findOneById(enrollmentId)
      expect(completedEnrollment.status).toBe(ENROLLMENT_STATUS_V2.COMPLETED)
      expect(completedEnrollment.partnershipId).toBe(partnershipId)

      const updatedPartnership = await partnershipModel.findOneById(partnershipId)
      expect(updatedPartnership.stats.completedLearners).toBe(1)

      // Step 6: Trainer creates placement ACCEPTED → referral bonus + placedLearners
      const placement = await placementModel.createNew({
        enrollmentId,
        userId: workerId,
        courseId,
        status: PLACEMENT_STATUS.OFFERED,
        employer: {
          name: 'Flow A Coffee Shop',
          industry: 'Food & Beverage',
          address: 'HCM City',
          contactPerson: 'HR Manager',
          contactEmail: 'hr@coffeeshop.com'
        },
        job: {
          title: 'Barista',
          salary: 10000000,
          currency: 'VND',
          employmentType: 'full-time'
        },
        partnershipId,
        referralBonusRecorded: false,
        partnershipStatsUpdated: false
      })

      const acceptedPlacement = await placementService.updatePlacementStatus(
        placement.insertedId.toString(),
        PLACEMENT_STATUS.ACCEPTED,
        {},
        trainerId
      )

      const finalPartnership = await partnershipModel.findOneById(partnershipId)
      const notifications = await GET_DB().collection('notification_jobs').find({}).toArray()
      const bonusNotifications = notifications.filter(
        n => n.eventType === notificationService.NOTIFICATION_EVENT_TYPES.REFERRAL_BONUS_CREATED
      )

      expect(acceptedPlacement.status).toBe(PLACEMENT_STATUS.ACCEPTED)
      expect(finalPartnership.stats.placedLearners).toBe(1)
      expect(bonusNotifications.length).toBe(1)
      expect(bonusNotifications[0].payload.bonus.amount).toBe(500000)
    })
  })

  // ====================================================================
  // Flow B: Enterprise Sponsorship
  // enterprise creates sponsorship → admin approves → worker enrolls → completes → drops → clawback
  // ====================================================================
  describe('Flow B: Enterprise Sponsorship', () => {
    let trainerId, enterpriseId, workerId, categoryId, courseId, sponsorshipId

    beforeEach(async () => {
      const trainer = await createTestUser(USER_ROLES.TRAINER, 'Flow B Trainer')
      trainerId = trainer.insertedId.toString()

      const enterprise = await createTestUser(USER_ROLES.ENTERPRISE, 'Flow B Enterprise', `flowb_ent_${Date.now()}@example.com`)
      enterpriseId = enterprise.insertedId.toString()

      const worker = await createTestUser(USER_ROLES.WORKER, 'Flow B Worker', `flowb_worker_${Date.now()}@example.com`)
      workerId = worker.insertedId.toString()
      await createWorkerProfile(workerId)

      const category = await createTestCategory()
      categoryId = category.insertedId.toString()

      const course = await createCourse(trainerId, categoryId, {
        title: 'Flow B Course',
        slug: `flow-b-course-${Date.now()}`
      })
      courseId = course.insertedId.toString()
    })

    it('E2E: enterprise creates sponsorship (draft) → admin approves → worker enrolls → completes → drops → clawback triggered', async () => {
      // Step 1: Enterprise creates sponsorship (DRAFT)
      const sponsorship = await courseSponsorshipModel.createNew({
        sponsorType: ORGANIZATION_TYPES.ENTERPRISE,
        sponsorId: enterpriseId,
        title: 'Enterprise Flow B Scholarship',
        linkedCourses: [{ courseId, coverage: SCHOLARSHIP_COVERAGE.FULL, maxAmount: 5000000 }],
        budget: 50000000,
        coverageType: SCHOLARSHIP_COVERAGE.FULL,
        maxAmountPerLearner: 5000000,
        disbursementModel: DISBURSEMENT_MODEL.COMPLETION,
        eligibilityCriteria: {
          ageMin: 35,
          ageMax: 60,
          provinces: ['HCM'],
          education: ['university']
        },
        status: COURSE_SPONSORSHIP_STATUS.DRAFT,
        clawbackPolicy: {
          enabled: true,
          refundOnDrop: true,
          refundOnNoShow: false,
          notes: 'Enterprise requires refund on dropout'
        }
      })
      sponsorshipId = sponsorship.insertedId.toString()

      expect(sponsorship.status).toBe(COURSE_SPONSORSHIP_STATUS.DRAFT)

      // Step 2: Admin approves → ACTIVE
      const approved = await courseSponsorshipModel.updateStatus(
        sponsorshipId,
        COURSE_SPONSORSHIP_STATUS.ACTIVE
      )
      expect(approved.status).toBe(COURSE_SPONSORSHIP_STATUS.ACTIVE)

      // Step 3: Worker enrolls (eligible) → auto-matched → source = 'enterprise_sponsored'
      const enrollmentResult = await enrollmentService.enrollCourse(workerId, courseId, {
        motivation: 'Want to learn programming',
        source: 'enterprise_sponsored'
      })

      expect(enrollmentResult.enrollment.source).toBe('enterprise_sponsored')
      expect(enrollmentResult.enrollment.sponsorships).toHaveLength(1)
      expect(enrollmentResult.enrollment.sponsorships[0].sponsorType).toBe(ORGANIZATION_TYPES.ENTERPRISE)

      const enrollmentId = enrollmentResult.enrollment._id.toString()

      // Step 4: Worker completes → disbursement recorded
      await enrollmentService.completeEnrollment(enrollmentId, trainerId)

      const completedEnrollment = await enrollmentModel.findOneById(enrollmentId)
      const updatedSponsorship = await courseSponsorshipModel.findOneById(sponsorshipId)
      const notifications = await GET_DB().collection('notification_jobs').find({}).toArray()

      expect(completedEnrollment.sponsorships[0].disbursedAmount).toBeGreaterThan(0)
      expect(completedEnrollment.sponsorships[0].status).toBe('disbursed')
      expect(updatedSponsorship.spent).toBeGreaterThan(0)
      expect(updatedSponsorship.remaining).toBeLessThan(50000000)
      expect(notifications.some(n => n.eventType === notificationService.NOTIFICATION_EVENT_TYPES.SPONSORSHIP_DISBURSEMENT_CREATED)).toBe(true)

      // Step 5: Worker drops → clawback triggered
      await enrollmentService.dropEnrollment(enrollmentId, workerId, 'Personal reason')

      const droppedEnrollment = await enrollmentModel.findOneById(enrollmentId)
      const finalSponsorship = await courseSponsorshipModel.findOneById(sponsorshipId)
      const allNotifications = await GET_DB().collection('notification_jobs').find({}).toArray()

      expect(droppedEnrollment.sponsorships[0].clawbackAmount).toBeGreaterThan(0)
      expect(droppedEnrollment.sponsorships[0].status).toBe('clawback')
      expect(finalSponsorship.disbursements.some(d => d.type === 'clawback')).toBe(true)
      expect(allNotifications.some(n => n.eventType === notificationService.NOTIFICATION_EVENT_TYPES.SPONSORSHIP_CLAWBACK_CREATED)).toBe(true)
    })
  })

  // ====================================================================
  // Flow C: NGO Sponsorship
  // NGO creates sponsorship → worker enrolls → completes → disbursement + impact stats
  // ====================================================================
  describe('Flow C: NGO Sponsorship', () => {
    let trainerId, ngoId, workerId, categoryId, courseId, sponsorshipId

    beforeEach(async () => {
      const trainer = await createTestUser(USER_ROLES.TRAINER, 'Flow C Trainer')
      trainerId = trainer.insertedId.toString()

      const ngo = await createTestUser(USER_ROLES.NGO, 'Flow C NGO', `flowc_ngo_${Date.now()}@example.com`)
      ngoId = ngo.insertedId.toString()

      const worker = await createTestUser(USER_ROLES.WORKER, 'Flow C Worker', `flowc_worker_${Date.now()}@example.com`)
      workerId = worker.insertedId.toString()
      await createWorkerProfile(workerId, {
        basicInfo: {
          age: 42,
          gender: 'female',
          province: 'Hanoi',
          education: EDUCATION_LEVELS.COLLEGE,
          maritalStatus: 'single',
          phone: '0900000000'
        }
      })

      const category = await createTestCategory()
      categoryId = category.insertedId.toString()

      const course = await createCourse(trainerId, categoryId, {
        title: 'Flow C Course',
        slug: `flow-c-course-${Date.now()}`
      })
      courseId = course.insertedId.toString()
    })

    it('E2E: NGO creates sponsorship → worker enrolls (eligible) → completes → disbursement recorded', async () => {
      // Step 1: NGO creates sponsorship (ACTIVE immediately)
      const sponsorship = await createSponsorship(ngoId, ORGANIZATION_TYPES.NGO, courseId, {
        title: 'NGO Flow C Scholarship',
        budget: 30000000,
        disbursementModel: DISBURSEMENT_MODEL.COMPLETION,
        status: COURSE_SPONSORSHIP_STATUS.ACTIVE,
        eligibilityCriteria: {
          ageMin: 35,
          ageMax: 60,
          provinces: ['Hanoi', 'HCM', 'Da Nang'],
          education: ['university', 'college']
        },
        clawbackPolicy: {
          enabled: false,
          refundOnDrop: false,
          refundOnNoShow: false,
          notes: null
        }
      })
      sponsorshipId = sponsorship.insertedId.toString()

      expect(sponsorship.status).toBe(COURSE_SPONSORSHIP_STATUS.ACTIVE)

      // Step 2: Worker enrolls → eligible → matched → source = 'ngo_sponsored'
      const enrollmentResult = await enrollmentService.enrollCourse(workerId, courseId, {
        motivation: 'Career transition to tech',
        source: 'ngo_sponsored'
      })

      expect(enrollmentResult.enrollment.source).toBe('ngo_sponsored')
      expect(enrollmentResult.enrollment.sponsorships).toHaveLength(1)
      expect(enrollmentResult.enrollment.sponsorships[0].sponsorType).toBe(ORGANIZATION_TYPES.NGO)

      const enrollmentId = enrollmentResult.enrollment._id.toString()

      // Step 3: Completion → disbursement
      await enrollmentService.completeEnrollment(enrollmentId, trainerId)

      const completedEnrollment = await enrollmentModel.findOneById(enrollmentId)
      const updatedSponsorship = await courseSponsorshipModel.findOneById(sponsorshipId)
      const notifications = await GET_DB().collection('notification_jobs').find({}).toArray()

      expect(completedEnrollment.status).toBe(ENROLLMENT_STATUS_V2.COMPLETED)
      expect(completedEnrollment.sponsorships[0].disbursedAmount).toBeGreaterThan(0)
      expect(completedEnrollment.sponsorships[0].status).toBe('disbursed')
      expect(updatedSponsorship.spent).toBeGreaterThan(0)
      expect(updatedSponsorship.stats.completedLearners).toBeGreaterThanOrEqual(1)
      expect(notifications.some(n => n.eventType === notificationService.NOTIFICATION_EVENT_TYPES.SPONSORSHIP_DISBURSEMENT_CREATED)).toBe(true)

      // Step 4: NGO can see impact stats (via courseSponsorshipService)
      const stats = await courseSponsorshipModel.findOneById(sponsorshipId)
      expect(stats.budget).toBe(30000000)
      expect(stats.spent).toBeGreaterThan(0)
      expect(stats.remaining).toBeLessThan(stats.budget)
    })
  })
})
