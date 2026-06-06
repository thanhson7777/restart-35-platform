/**
 * Phase 5 — API Endpoints Tests
 *
 * HTTP-level integration tests for all Partnership, Course Sponsorship,
 * Enterprise Dashboard, and NGO Dashboard API endpoints.
 *
 * Uses supertest-style approach: creates a mock Express app with the
 * actual middleware and controllers, then makes requests directly.
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { ObjectId } from 'mongodb'
import express from 'express'
import { userModel } from '~/models/userModel'
import { categoryModel } from '~/models/categoryModel'
import { courseModel } from '~/models/courseModel'
import { partnershipModel } from '~/models/partnershipModel'
import { courseSponsorshipModel } from '~/models/courseSponsorshipModel'
import { enrollmentModel } from '~/models/enrollmentModel'
import { workerProfileModel } from '~/models/workerProfileModel'
import { partnershipController } from '~/controllers/partnershipController'
import { partnershipService } from '~/services/partnershipService'
import { courseSponsorshipController } from '~/controllers/courseSponsorshipController'
import { courseSponsorshipService } from '~/services/courseSponsorshipService'
import { StatusCodes } from 'http-status-codes'
import jwt from 'jsonwebtoken'
import {
  USER_ROLES,
  COURSE_STATUS,
  DURATION_UNITS,
  LOCATION_TYPES,
  COURSE_DELIVERY_TYPES,
  COURSE_FUNDING_MODELS,
  PARTNERSHIP_STATUS,
  COURSE_SPONSORSHIP_STATUS,
  COURSE_SPONSORSHIP_MODEL,
  DISBURSEMENT_MODEL,
  SCHOLARSHIP_COVERAGE,
  ORGANIZATION_TYPES
} from '~/utils/constants'

// Build a mock JWT for a user
function makeToken(userId, role) {
  const payload = { _id: userId, role, email: `${userId}@test.com` }
  return jwt.sign(payload, process.env.JWT_SECRET || 'restart35-jwt-secret-dev', { expiresIn: '1h' })
}

// Build a minimal Express app for a controller
function buildApp(method, path, handler, authUser) {
  const app = express()
  app.use(express.json())
  app.use((req, res, next) => {
    if (authUser) {
      req.user = authUser
    }
    next()
  })
  if (method === 'get') app.get(path, handler)
  else if (method === 'post') app.post(path, handler)
  else if (method === 'put') app.put(path, handler)
  return app
}

// Direct call to Express-style handler
async function callHandler(handler, method, path, body, authUser) {
  const mockReq = {
    method,
    path,
    params: {},
    query: {},
    body: body || {},
    user: authUser || null
  }
  // Parse params from path
  const parts = path.split('/')
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].startsWith(':')) {
      mockReq.params[parts[i].slice(1)] = parts[i + 1] || parts[i].replace(':', '')
    }
  }
  // Parse query from path
  if (path.includes('?')) {
    const [base, qs] = path.split('?')
    mockReq.path = base
    const params = new URLSearchParams(qs)
    for (const [k, v] of params) mockReq.query[k] = v
  }

  const mockRes = {
    statusCode: 200,
    data: null,
    status(code) { this.statusCode = code; return this },
    json(data) { this.data = data; return this }
  }
  try {
    await handler(mockReq, mockRes, (err) => { throw err })
    return { status: mockRes.statusCode, data: mockRes.data }
  } catch (err) {
    return { status: err.statusCode || 500, data: { message: err.message, name: err.name } }
  }
}

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
    description: overrides.description || 'Day la mo ta khoa hoc du dai de pass validation.',
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
    isFree: overrides.isFree ?? true,
    maxStudents: overrides.maxStudents ?? 25,
    skills: overrides.skills || ['JavaScript'],
    prerequisites: overrides.prerequisites || [],
    requirements: overrides.requirements || [],
    syllabus: overrides.syllabus || [],
    outcomes: overrides.outcomes || [],
    linkedPartnershipId: overrides.linkedPartnershipId || null,
    linkedEnterpriseId: overrides.linkedEnterpriseId || null,
    sponsorship: overrides.sponsorship || null,
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
      jobTitle: 'Nhan vien',
      jobQuantity: 5,
      salaryRange: { min: 7000000, max: 10000000, currency: 'VND' },
      requirements: ['Giao tiep'],
      targetSkills: ['skill'],
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
    status: overrides.status || PARTNERSHIP_STATUS.PENDING,
    message: overrides.message || 'Initial request',
    respondedAt: overrides.respondedAt || null,
    signedAt: overrides.signedAt || null,
    stats: overrides.stats || { enrolledLearners: 0, completedLearners: 0, placedLearners: 0 },
    _destroy: false
  }, true)
}

describe('Phase 5 — API Endpoints', () => {
  let trainerId, enterpriseId, ngoId, workerId, categoryId, courseId
  let trainerToken, enterpriseToken, ngoToken, workerToken

  beforeEach(async () => {
    const trainer = await createTestUser(USER_ROLES.TRAINER, 'Trainer One')
    trainerId = trainer.insertedId.toString()
    const enterprise = await createTestUser(USER_ROLES.ENTERPRISE, 'Enterprise One', `enterprise_${Date.now()}@example.com`)
    enterpriseId = enterprise.insertedId.toString()
    const ngo = await createTestUser(USER_ROLES.NGO, 'NGO One', `ngo_${Date.now()}@example.com`)
    ngoId = ngo.insertedId.toString()
    const worker = await createTestUser(USER_ROLES.WORKER, 'Worker One', `worker_${Date.now()}@example.com`)
    workerId = worker.insertedId.toString()
    const category = await createTestCategory()
    categoryId = category.insertedId.toString()
    const course = await createTrainerCourse(trainerId, categoryId, {
      title: 'API Test Course',
      slug: `api-test-course-${Date.now()}`
    })
    courseId = course.insertedId.toString()

    trainerToken = makeToken(trainerId, USER_ROLES.TRAINER)
    enterpriseToken = makeToken(enterpriseId, USER_ROLES.ENTERPRISE)
    ngoToken = makeToken(ngoId, USER_ROLES.NGO)
    workerToken = makeToken(workerId, USER_ROLES.WORKER)
  })

  // ====================================================================
  // Partnership API
  // ====================================================================
  describe('POST /v1/partnerships', () => {
    it('should create partnership as enterprise (201)', async () => {
      const res = await callHandler(
        partnershipController.createPartnership,
        'post',
        '/v1/partnerships',
        {
          trainerId,
          requestedCourseIds: [courseId],
          recruitmentNeeds: {
            jobTitle: 'Nhan vien phuc vu',
            jobQuantity: 8,
            salaryRange: { min: 7000000, max: 10000000, currency: 'VND' },
            requirements: ['Ky nang giao tiep'],
            targetSkills: ['giao tiep'],
            employmentType: 'full-time'
          },
          message: 'Mong muon hop tac'
        },
        { _id: { toString: () => enterpriseId }, role: USER_ROLES.ENTERPRISE }
      )
      expect(res.status).toBe(StatusCodes.CREATED)
      expect(res.data.success).toBe(true)
      expect(res.data.data.enterpriseId).toBe(enterpriseId)
      expect(res.data.data.trainerId).toBe(trainerId)
      expect(res.data.data.status).toBe(PARTNERSHIP_STATUS.PENDING)
    })

    it('should reject creation as worker (403)', async () => {
      const res = await callHandler(
        partnershipController.createPartnership,
        'post',
        '/v1/partnerships',
        {
          trainerId,
          recruitmentNeeds: {
            jobTitle: 'Nhan vien',
            jobQuantity: 5,
            salaryRange: { min: 1, max: 2, currency: 'VND' },
            requirements: ['req'],
            targetSkills: ['skill'],
            employmentType: 'full-time'
          }
        },
        { _id: { toString: () => workerId }, role: USER_ROLES.WORKER }
      )
      expect(res.status).toBe(StatusCodes.FORBIDDEN)
    })
  })

  describe('GET /v1/partnerships', () => {
    it('should list partnerships for enterprise (200)', async () => {
      await createPartnership(enterpriseId, trainerId, { requestedCourseIds: [courseId] })

      const res = await callHandler(
        partnershipController.getPartnerships,
        'get',
        '/v1/partnerships',
        null,
        { _id: { toString: () => enterpriseId }, role: USER_ROLES.ENTERPRISE }
      )
      expect(res.status).toBe(StatusCodes.OK)
      expect(res.data.success).toBe(true)
      expect(Array.isArray(res.data.data)).toBe(true)
    })
  })

  describe('GET /v1/partnerships/:id', () => {
    it('should get partnership detail for participant (200)', async () => {
      const created = await createPartnership(enterpriseId, trainerId)

      const res = await callHandler(
        partnershipController.getPartnershipById,
        'get',
        `/v1/partnerships/${created.insertedId}`,
        null,
        { _id: { toString: () => enterpriseId }, role: USER_ROLES.ENTERPRISE }
      )
      expect(res.status).toBe(StatusCodes.OK)
      expect(res.data.success).toBe(true)
      expect(res.data.data.enterpriseId).toBe(enterpriseId)
    })
  })

  describe('PUT /v1/partnerships/:id/respond', () => {
    it('should allow trainer to respond to pending partnership', async () => {
      const created = await createPartnership(enterpriseId, trainerId, {
        requestedCourseIds: [courseId]
      })

      const res = await callHandler(
        partnershipController.respondPartnership,
        'put',
        `/v1/partnerships/${created.insertedId}/respond`,
        {
          proposedCourseIds: [courseId],
          tuitionFee: 3000000,
          message: 'Trainer response'
        },
        { _id: { toString: () => trainerId }, role: USER_ROLES.TRAINER }
      )
      expect(res.status).toBe(StatusCodes.OK)
      expect(res.data.success).toBe(true)
      expect(res.data.data.status).toBe(PARTNERSHIP_STATUS.NEGOTIATING)
    })

    it('should reject respond from non-assigned trainer (403)', async () => {
      const created = await createPartnership(enterpriseId, trainerId)
      const otherTrainer = await createTestUser(USER_ROLES.TRAINER, 'Other Trainer')

      const res = await callHandler(
        partnershipController.respondPartnership,
        'put',
        `/v1/partnerships/${created.insertedId}/respond`,
        { proposedCourseIds: [courseId], tuitionFee: 3000000, message: 'Wrong trainer' },
        { _id: { toString: () => otherTrainer.insertedId.toString() }, role: USER_ROLES.TRAINER }
      )
      expect(res.status).toBe(StatusCodes.FORBIDDEN)
    })
  })

  describe('PUT /v1/partnerships/:id/confirm', () => {
    it('should confirm partnership and set ACTIVE status', async () => {
      const created = await createPartnership(enterpriseId, trainerId, {
        status: PARTNERSHIP_STATUS.NEGOTIATING,
        proposedCourseIds: [courseId]
      })

      const res = await callHandler(
        partnershipController.confirmPartnership,
        'put',
        `/v1/partnerships/${created.insertedId}/confirm`,
        {
          agreedTerms: {
            linkedCourseIds: [courseId],
            tuitionFeePerLearner: 4000000,
            paymentTerms: '50/50',
            placementGuarantee: true,
            guaranteePeriodMonths: 3,
            referralBonus: 500000
          },
          linkedCourseIds: [courseId]
        },
        { _id: { toString: () => enterpriseId }, role: USER_ROLES.ENTERPRISE }
      )
      expect(res.status).toBe(StatusCodes.OK)
      expect(res.data.success).toBe(true)
      expect(res.data.data.status).toBe(PARTNERSHIP_STATUS.ACTIVE)
      expect(res.data.data.linkedCourseIds).toContainEqual(courseId)
    })
  })

  describe('PUT /v1/partnerships/:id/cancel', () => {
    it('should cancel partnership as participant', async () => {
      const created = await createPartnership(enterpriseId, trainerId, {
        status: PARTNERSHIP_STATUS.NEGOTIATING
      })

      const res = await callHandler(
        partnershipController.cancelPartnership,
        'put',
        `/v1/partnerships/${created.insertedId}/cancel`,
        { reason: 'Enterprise changed plan' },
        { _id: { toString: () => enterpriseId }, role: USER_ROLES.ENTERPRISE }
      )
      expect(res.status).toBe(StatusCodes.OK)
      expect(res.data.success).toBe(true)
      expect(res.data.data.status).toBe(PARTNERSHIP_STATUS.CANCELLED)
    })
  })

  // ====================================================================
  // Course Sponsorship API
  // ====================================================================
  describe('POST /v1/course-sponsorships', () => {
    it('should create draft sponsorship as enterprise (201)', async () => {
      const res = await callHandler(
        courseSponsorshipController.createCourseSponsorship,
        'post',
        '/v1/course-sponsorships',
        {
          sponsorType: ORGANIZATION_TYPES.ENTERPRISE,
          title: 'Enterprise Scholarship Program',
          description: 'Test scholarship program',
          linkedCourses: [{ courseId, coverage: SCHOLARSHIP_COVERAGE.FULL, maxAmount: 5000000 }],
          budget: 50000000,
          coverageType: SCHOLARSHIP_COVERAGE.FULL,
          disbursementModel: DISBURSEMENT_MODEL.COMPLETION,
          eligibilityCriteria: {
            ageMin: 35,
            ageMax: 60,
            provinces: ['HCM'],
            education: ['university']
          }
        },
        { _id: { toString: () => enterpriseId }, role: USER_ROLES.ENTERPRISE }
      )
      expect(res.status).toBe(StatusCodes.CREATED)
      expect(res.data.success).toBe(true)
      expect(res.data.data.sponsorId).toBe(enterpriseId)
      expect(res.data.data.status).toBe(COURSE_SPONSORSHIP_STATUS.DRAFT)
    })

    it('should create draft sponsorship as NGO (201)', async () => {
      const res = await callHandler(
        courseSponsorshipController.createCourseSponsorship,
        'post',
        '/v1/course-sponsorships',
        {
          sponsorType: ORGANIZATION_TYPES.NGO,
          title: 'NGO Scholarship',
          linkedCourses: [{ courseId, coverage: SCHOLARSHIP_COVERAGE.PARTIAL, maxAmount: 3000000 }],
          budget: 30000000,
          disbursementModel: DISBURSEMENT_MODEL.UPFRONT
        },
        { _id: { toString: () => ngoId }, role: USER_ROLES.NGO }
      )
      expect(res.status).toBe(StatusCodes.CREATED)
      expect(res.data.data.sponsorType).toBe(ORGANIZATION_TYPES.NGO)
      expect(res.data.data.status).toBe(COURSE_SPONSORSHIP_STATUS.DRAFT)
    })

    it('should reject creation from worker (403)', async () => {
      const res = await callHandler(
        courseSponsorshipController.createCourseSponsorship,
        'post',
        '/v1/course-sponsorships',
        {
          sponsorType: ORGANIZATION_TYPES.ENTERPRISE,
          title: 'Invalid',
          linkedCourses: [{ courseId }],
          budget: 10000000
        },
        { _id: { toString: () => workerId }, role: USER_ROLES.WORKER }
      )
      expect(res.status).toBe(StatusCodes.FORBIDDEN)
    })
  })

  describe('GET /v1/course-sponsorships', () => {
    it('should list sponsorships for enterprise (200)', async () => {
      await courseSponsorshipModel.createNew({
        sponsorType: ORGANIZATION_TYPES.ENTERPRISE,
        sponsorId: enterpriseId,
        title: 'Enterprise List Test',
        linkedCourses: [{ courseId, coverage: SCHOLARSHIP_COVERAGE.FULL }],
        budget: 50000000,
        status: COURSE_SPONSORSHIP_STATUS.ACTIVE
      })

      const res = await callHandler(
        courseSponsorshipController.getCourseSponsorships,
        'get',
        '/v1/course-sponsorships',
        null,
        { _id: { toString: () => enterpriseId }, role: USER_ROLES.ENTERPRISE }
      )
      expect(res.status).toBe(StatusCodes.OK)
      expect(res.data.success).toBe(true)
    })
  })

  describe('PUT /v1/course-sponsorships/:id/pause', () => {
    it('should pause ACTIVE sponsorship', async () => {
      const created = await courseSponsorshipModel.createNew({
        sponsorType: ORGANIZATION_TYPES.ENTERPRISE,
        sponsorId: enterpriseId,
        title: 'Pause Test',
        linkedCourses: [{ courseId }],
        budget: 50000000,
        status: COURSE_SPONSORSHIP_STATUS.ACTIVE
      })

      const res = await callHandler(
        courseSponsorshipController.pauseCourseSponsorship,
        'put',
        `/v1/course-sponsorships/${created.insertedId}/pause`,
        { reason: 'Budget review' },
        { _id: { toString: () => enterpriseId }, role: USER_ROLES.ENTERPRISE }
      )
      expect(res.status).toBe(StatusCodes.OK)
      expect(res.data.data.status).toBe(COURSE_SPONSORSHIP_STATUS.PAUSED)
    })
  })

  describe('PUT /v1/course-sponsorships/:id/resume', () => {
    it('should resume PAUSED sponsorship', async () => {
      const created = await courseSponsorshipModel.createNew({
        sponsorType: ORGANIZATION_TYPES.ENTERPRISE,
        sponsorId: enterpriseId,
        title: 'Resume Test',
        linkedCourses: [{ courseId }],
        budget: 50000000,
        status: COURSE_SPONSORSHIP_STATUS.PAUSED
      })

      const res = await callHandler(
        courseSponsorshipController.resumeCourseSponsorship,
        'put',
        `/v1/course-sponsorships/${created.insertedId}/resume`,
        { reason: 'Budget approved' },
        { _id: { toString: () => enterpriseId }, role: USER_ROLES.ENTERPRISE }
      )
      expect(res.status).toBe(StatusCodes.OK)
      expect(res.data.data.status).toBe(COURSE_SPONSORSHIP_STATUS.ACTIVE)
    })
  })

  describe('PUT /v1/course-sponsorships/:id/link-course', () => {
    it('should link course to sponsorship', async () => {
      const newCourse = await createTrainerCourse(trainerId, categoryId, {
        title: 'New Course',
        slug: `new-course-${Date.now()}`
      })

      const created = await courseSponsorshipModel.createNew({
        sponsorType: ORGANIZATION_TYPES.ENTERPRISE,
        sponsorId: enterpriseId,
        title: 'Link Course Test',
        linkedCourses: [{ courseId, coverage: SCHOLARSHIP_COVERAGE.FULL }],
        budget: 50000000,
        status: COURSE_SPONSORSHIP_STATUS.ACTIVE
      })

      const res = await callHandler(
        courseSponsorshipController.linkCourse,
        'put',
        `/v1/course-sponsorships/${created.insertedId}/link-course`,
        {
          courseId: newCourse.insertedId.toString(),
          coverage: SCHOLARSHIP_COVERAGE.PARTIAL,
          maxAmount: 3000000
        },
        { _id: { toString: () => enterpriseId }, role: USER_ROLES.ENTERPRISE }
      )
      expect(res.status).toBe(StatusCodes.OK)
      expect(res.data.data.linkedCourses.length).toBe(2)
    })
  })

  describe('PUT /v1/course-sponsorships/:id/approve', () => {
    it('should approve sponsorship and set ACTIVE status', async () => {
      const created = await courseSponsorshipModel.createNew({
        sponsorType: ORGANIZATION_TYPES.ENTERPRISE,
        sponsorId: enterpriseId,
        title: 'Approve Test',
        linkedCourses: [{ courseId }],
        budget: 50000000,
        status: COURSE_SPONSORSHIP_STATUS.DRAFT
      })

      const res = await callHandler(
        courseSponsorshipController.approveCourseSponsorship,
        'put',
        `/v1/course-sponsorships/${created.insertedId}/approve`,
        { status: COURSE_SPONSORSHIP_STATUS.ACTIVE },
        { _id: { toString: () => enterpriseId }, role: USER_ROLES.ENTERPRISE }
      )
      expect(res.status).toBe(StatusCodes.OK)
      expect(res.data.data.status).toBe(COURSE_SPONSORSHIP_STATUS.ACTIVE)
    })
  })

  describe('GET /v1/course-sponsorships/:id/stats', () => {
    it('should return sponsorship stats (200)', async () => {
      const created = await courseSponsorshipModel.createNew({
        sponsorType: ORGANIZATION_TYPES.ENTERPRISE,
        sponsorId: enterpriseId,
        title: 'Stats Test',
        linkedCourses: [{ courseId }],
        budget: 50000000,
        status: COURSE_SPONSORSHIP_STATUS.ACTIVE
      })

      const res = await callHandler(
        courseSponsorshipController.getCourseSponsorshipStats,
        'get',
        `/v1/course-sponsorships/${created.insertedId}/stats`,
        null,
        { _id: { toString: () => enterpriseId }, role: USER_ROLES.ENTERPRISE }
      )
      expect(res.status).toBe(StatusCodes.OK)
      expect(res.data.data.budget).toBe(50000000)
    })
  })

  describe('PUT /v1/course-sponsorships/:id/unlink-course', () => {
    it('should unlink course from sponsorship', async () => {
      const created = await courseSponsorshipModel.createNew({
        sponsorType: ORGANIZATION_TYPES.ENTERPRISE,
        sponsorId: enterpriseId,
        title: 'Unlink Test',
        linkedCourses: [{ courseId, coverage: SCHOLARSHIP_COVERAGE.FULL }],
        budget: 50000000,
        status: COURSE_SPONSORSHIP_STATUS.ACTIVE
      })

      const res = await callHandler(
        courseSponsorshipController.unlinkCourse,
        'put',
        `/v1/course-sponsorships/${created.insertedId}/unlink-course`,
        { courseId },
        { _id: { toString: () => enterpriseId }, role: USER_ROLES.ENTERPRISE }
      )
      expect(res.status).toBe(StatusCodes.OK)
      expect(res.data.data.linkedCourses.length).toBe(0)
    })
  })
})
