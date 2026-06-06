/**
 * Phase 5 — Course Sponsorship Service Tests
 *
 * Tests: courseSponsorshipModel CRUD, eligibility, availability,
 * disbursement, clawback, and fund management.
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { ObjectId } from 'mongodb'
import { courseSponsorshipModel } from '~/models/courseSponsorshipModel'
import {
  COURSE_SPONSORSHIP_STATUS,
  COURSE_SPONSORSHIP_MODEL,
  DISBURSEMENT_MODEL,
  ORGANIZATION_TYPES,
  SCHOLARSHIP_COVERAGE
} from '~/utils/constants'

const db = () => globalThis.__TEST_DB__

describe('courseSponsorshipModel', () => {
  let enterpriseId
  let ngoId
  let courseId

  beforeEach(async () => {
    enterpriseId = new ObjectId()
    ngoId = new ObjectId()
    courseId = new ObjectId()
  })

  // ====================================================================
  // validateBeforeCreate
  // ====================================================================
  describe('validateBeforeCreate', () => {
    it('should accept valid enterprise sponsorship payload', async () => {
      const data = {
        sponsorType: ORGANIZATION_TYPES.ENTERPRISE,
        sponsorId: enterpriseId.toString(),
        title: 'Enterprise ho tro hoc phi',
        linkedCourses: [
          { courseId: courseId.toString(), coverage: SCHOLARSHIP_COVERAGE.FULL, maxAmount: 5000000 }
        ],
        budget: 50000000,
        coverageType: SCHOLARSHIP_COVERAGE.FULL,
        disbursementModel: DISBURSEMENT_MODEL.COMPLETION
      }
      const validated = await courseSponsorshipModel.validateBeforeCreate(data)
      expect(validated.sponsorType).toBe(ORGANIZATION_TYPES.ENTERPRISE)
      expect(validated.status).toBe(COURSE_SPONSORSHIP_STATUS.DRAFT)
      expect(validated.remaining).toBe(0) // schema default, normalized on createNew
    })

    it('should accept valid NGO sponsorship payload', async () => {
      const data = {
        sponsorType: ORGANIZATION_TYPES.NGO,
        sponsorId: ngoId.toString(),
        title: 'NGO hoc bong',
        linkedCourses: [
          { courseId: courseId.toString(), coverage: SCHOLARSHIP_COVERAGE.PARTIAL, maxAmount: 3000000 }
        ],
        budget: 30000000,
        disbursementModel: DISBURSEMENT_MODEL.UPFRONT
      }
      const validated = await courseSponsorshipModel.validateBeforeCreate(data)
      expect(validated.sponsorType).toBe(ORGANIZATION_TYPES.NGO)
    })

    it('should reject empty linkedCourses', async () => {
      await expect(courseSponsorshipModel.validateBeforeCreate({
        sponsorType: ORGANIZATION_TYPES.ENTERPRISE,
        sponsorId: enterpriseId.toString(),
        title: 'Invalid',
        linkedCourses: [],
        budget: 10000000
      })).rejects.toBeDefined()
    })

    it('should reject invalid disbursementModel', async () => {
      await expect(courseSponsorshipModel.validateBeforeCreate({
        sponsorType: ORGANIZATION_TYPES.ENTERPRISE,
        sponsorId: enterpriseId.toString(),
        title: 'Invalid',
        linkedCourses: [{ courseId: courseId.toString() }],
        budget: 10000000,
        disbursementModel: 'invalid_model'
      })).rejects.toBeDefined()
    })

    it('should accept all disbursementModel enum values', async () => {
      for (const model of Object.values(DISBURSEMENT_MODEL)) {
        const data = {
          sponsorType: ORGANIZATION_TYPES.ENTERPRISE,
          sponsorId: enterpriseId.toString(),
          title: `Test ${model}`,
          linkedCourses: [{ courseId: courseId.toString() }],
          budget: 10000000,
          disbursementModel: model
        }
        const validated = await courseSponsorshipModel.validateBeforeCreate(data)
        expect(validated.disbursementModel).toBe(model)
      }
    })
  })

  // ====================================================================
  // createNew
  // ====================================================================
  describe('createNew', () => {
    it('should create sponsorship and normalize remaining = budget', async () => {
      const budget = 20000000
      const result = await courseSponsorshipModel.createNew({
        sponsorType: ORGANIZATION_TYPES.ENTERPRISE,
        sponsorId: enterpriseId.toString(),
        title: 'Enterprise Sponsorship',
        linkedCourses: [{ courseId: courseId.toString(), coverage: SCHOLARSHIP_COVERAGE.FULL, maxAmount: 5000000 }],
        budget,
        coverageType: SCHOLARSHIP_COVERAGE.FULL,
        disbursementModel: DISBURSEMENT_MODEL.COMPLETION
      })
      expect(result.insertedId).toBeDefined()

      const found = await courseSponsorshipModel.findOneById(result.insertedId)
      expect(found.remaining).toBe(budget)
      expect(found.spent).toBe(0)
      expect(found.status).toBe(COURSE_SPONSORSHIP_STATUS.DRAFT)
    })

    it('should NOT normalize remaining if already set explicitly', async () => {
      const result = await courseSponsorshipModel.createNew({
        sponsorType: ORGANIZATION_TYPES.NGO,
        sponsorId: ngoId.toString(),
        title: 'NGO Sponsorship',
        linkedCourses: [{ courseId: courseId.toString(), coverage: SCHOLARSHIP_COVERAGE.PARTIAL, maxAmount: 2000000 }],
        budget: 10000000,
        remaining: 8000000, // explicitly set
        spent: 2000000,
        disbursementModel: DISBURSEMENT_MODEL.UPFRONT
      })
      const found = await courseSponsorshipModel.findOneById(result.insertedId)
      expect(found.remaining).toBe(8000000)
      expect(found.spent).toBe(2000000)
    })

    it('should create with clawback policy', async () => {
      const result = await courseSponsorshipModel.createNew({
        sponsorType: ORGANIZATION_TYPES.ENTERPRISE,
        sponsorId: enterpriseId.toString(),
        title: 'Sponsorship with Clawback',
        linkedCourses: [{ courseId: courseId.toString() }],
        budget: 50000000,
        clawbackPolicy: {
          enabled: true,
          refundOnDrop: true,
          refundOnNoShow: false,
          notes: 'Test clawback policy'
        }
      })
      const found = await courseSponsorshipModel.findOneById(result.insertedId)
      expect(found.clawbackPolicy.enabled).toBe(true)
      expect(found.clawbackPolicy.refundOnDrop).toBe(true)
    })
  })

  // ====================================================================
  // findOneById
  // ====================================================================
  describe('findOneById', () => {
    it('should find sponsorship by id', async () => {
      const created = await courseSponsorshipModel.createNew({
        sponsorType: ORGANIZATION_TYPES.ENTERPRISE,
        sponsorId: enterpriseId.toString(),
        title: 'Find Test',
        linkedCourses: [{ courseId: courseId.toString() }],
        budget: 50000000
      })
      const found = await courseSponsorshipModel.findOneById(created.insertedId)
      expect(found).not.toBeNull()
      expect(found._id.toString()).toBe(created.insertedId.toString())
    })

    it('should return null for non-existent id', async () => {
      const found = await courseSponsorshipModel.findOneById(new ObjectId())
      expect(found).toBeNull()
    })

    it('should return null for soft-deleted sponsorship', async () => {
      const created = await courseSponsorshipModel.createNew({
        sponsorType: ORGANIZATION_TYPES.ENTERPRISE,
        sponsorId: enterpriseId.toString(),
        title: 'Soft Delete Test',
        linkedCourses: [{ courseId: courseId.toString() }],
        budget: 50000000
      })
      await courseSponsorshipModel.softDelete(created.insertedId)
      const found = await courseSponsorshipModel.findOneById(created.insertedId)
      expect(found).toBeNull()
    })
  })

  // ====================================================================
  // checkEligibility
  // ====================================================================
  describe('checkEligibility', () => {
    it('should return eligible when no criteria set', async () => {
      const sponsorship = { eligibilityCriteria: {} }
      const profile = { basicInfo: { age: 45 } }
      const result = await courseSponsorshipModel.checkEligibility(profile, sponsorship)
      expect(result.eligible).toBe(true)
      expect(result.reason).toBeNull()
    })

    it('should return eligible when age is within range', async () => {
      const sponsorship = {
        eligibilityCriteria: { ageMin: 30, ageMax: 55 }
      }
      const profile = { basicInfo: { age: 45 } }
      const result = await courseSponsorshipModel.checkEligibility(profile, sponsorship)
      expect(result.eligible).toBe(true)
    })

    it('should return NOT eligible when age is below minimum', async () => {
      const sponsorship = {
        eligibilityCriteria: { ageMin: 35, ageMax: 60 }
      }
      const profile = { basicInfo: { age: 30 } }
      const result = await courseSponsorshipModel.checkEligibility(profile, sponsorship)
      expect(result.eligible).toBe(false)
      expect(result.reason).toContain('tuổi tối thiểu')
    })

    it('should return NOT eligible when age exceeds maximum', async () => {
      const sponsorship = {
        eligibilityCriteria: { ageMin: 35, ageMax: 50 }
      }
      const profile = { basicInfo: { age: 55 } }
      const result = await courseSponsorshipModel.checkEligibility(profile, sponsorship)
      expect(result.eligible).toBe(false)
      expect(result.reason).toContain('quá độ tuổi tối đa')
    })

    it('should return NOT eligible when income exceeds maxIncome', async () => {
      const sponsorship = {
        eligibilityCriteria: { maxIncome: 10000000 }
      }
      const profile = { basicInfo: { age: 45, monthlyIncome: 15000000 } }
      const result = await courseSponsorshipModel.checkEligibility(profile, sponsorship)
      expect(result.eligible).toBe(false)
      expect(result.reason).toContain('Thu nhập')
    })

    it('should return eligible when income is below threshold', async () => {
      const sponsorship = {
        eligibilityCriteria: { maxIncome: 10000000 }
      }
      const profile = { basicInfo: { age: 45, monthlyIncome: 8000000 } }
      const result = await courseSponsorshipModel.checkEligibility(profile, sponsorship)
      expect(result.eligible).toBe(true)
    })

    it('should return NOT eligible when province not in list', async () => {
      const sponsorship = {
        eligibilityCriteria: { provinces: ['HCM', 'Hanoi', 'Da Nang'] }
      }
      const profile = { basicInfo: { province: 'Can Tho' } }
      const result = await courseSponsorshipModel.checkEligibility(profile, sponsorship)
      expect(result.eligible).toBe(false)
      expect(result.reason).toContain('Địa phương')
    })

    it('should return eligible when province is in list', async () => {
      const sponsorship = {
        eligibilityCriteria: { provinces: ['HCM', 'Hanoi'] }
      }
      const profile = { basicInfo: { province: 'HCM' } }
      const result = await courseSponsorshipModel.checkEligibility(profile, sponsorship)
      expect(result.eligible).toBe(true)
    })

    it('should return NOT eligible when education not in list', async () => {
      const sponsorship = {
        eligibilityCriteria: { education: ['university', 'college'] }
      }
      const profile = { basicInfo: { education: 'high_school' } }
      const result = await courseSponsorshipModel.checkEligibility(profile, sponsorship)
      expect(result.eligible).toBe(false)
      expect(result.reason).toContain('học vấn')
    })

    it('should return eligible when all criteria match', async () => {
      const sponsorship = {
        eligibilityCriteria: {
          ageMin: 35,
          ageMax: 55,
          maxIncome: 15000000,
          provinces: ['HCM'],
          education: ['university']
        }
      }
      const profile = {
        basicInfo: {
          age: 45,
          monthlyIncome: 10000000,
          province: 'HCM',
          education: 'university'
        },
        careerProfile: {}
      }
      const result = await courseSponsorshipModel.checkEligibility(profile, sponsorship)
      expect(result.eligible).toBe(true)
      expect(result.reason).toBeNull()
    })

    it('should handle missing profile basicInfo gracefully', async () => {
      const sponsorship = {
        eligibilityCriteria: { ageMin: 35 }
      }
      const profile = {}
      const result = await courseSponsorshipModel.checkEligibility(profile, sponsorship)
      expect(result.eligible).toBe(true)
    })
  })

  // ====================================================================
  // checkAvailability
  // ====================================================================
  describe('checkAvailability', () => {
    it('should return NOT available when sponsorship is null', async () => {
      const result = await courseSponsorshipModel.checkAvailability(null, 1000000)
      expect(result.available).toBe(false)
      expect(result.reason).toContain('Không tìm thấy')
    })

    it('should return NOT available when status is DRAFT', async () => {
      const sponsorship = {
        status: COURSE_SPONSORSHIP_STATUS.DRAFT,
        remaining: 50000000
      }
      const result = await courseSponsorshipModel.checkAvailability(sponsorship, 1000000)
      expect(result.available).toBe(false)
      expect(result.reason).toContain('chưa hoạt động')
    })

    it('should return NOT available when status is PAUSED', async () => {
      const sponsorship = {
        status: COURSE_SPONSORSHIP_STATUS.PAUSED,
        remaining: 50000000
      }
      const result = await courseSponsorshipModel.checkAvailability(sponsorship, 1000000)
      expect(result.available).toBe(false)
    })

    it('should return NOT available when remaining < requested amount', async () => {
      const sponsorship = {
        status: COURSE_SPONSORSHIP_STATUS.ACTIVE,
        remaining: 500000
      }
      const result = await courseSponsorshipModel.checkAvailability(sponsorship, 1000000)
      expect(result.available).toBe(false)
      expect(result.reason).toContain('không đủ')
    })

    it('should return available when remaining == 0 and requested amount == 0', async () => {
      const sponsorship = {
        status: COURSE_SPONSORSHIP_STATUS.ACTIVE,
        remaining: 0
      }
      const result = await courseSponsorshipModel.checkAvailability(sponsorship, 0)
      expect(result.available).toBe(true)
    })

    it('should return available when ACTIVE with sufficient remaining budget', async () => {
      const sponsorship = {
        status: COURSE_SPONSORSHIP_STATUS.ACTIVE,
        remaining: 50000000
      }
      const result = await courseSponsorshipModel.checkAvailability(sponsorship, 5000000)
      expect(result.available).toBe(true)
      expect(result.reason).toBeNull()
    })

    it('should return available when remaining exactly equals requested amount', async () => {
      const sponsorship = {
        status: COURSE_SPONSORSHIP_STATUS.ACTIVE,
        remaining: 5000000
      }
      const result = await courseSponsorshipModel.checkAvailability(sponsorship, 5000000)
      expect(result.available).toBe(true)
    })
  })

  // ====================================================================
  // incrementSpent
  // ====================================================================
  describe('incrementSpent', () => {
    it('should increase spent and decrease remaining', async () => {
      const result = await courseSponsorshipModel.createNew({
        sponsorType: ORGANIZATION_TYPES.ENTERPRISE,
        sponsorId: enterpriseId.toString(),
        title: 'Spend Test',
        linkedCourses: [{ courseId: courseId.toString() }],
        budget: 50000000,
        remaining: 50000000,
        spent: 0
      })
      const sponsorshipId = result.insertedId

      await courseSponsorshipModel.incrementSpent(sponsorshipId, 3000000)
      const updated = await courseSponsorshipModel.findOneById(sponsorshipId)
      expect(updated.spent).toBe(3000000)
      expect(updated.remaining).toBe(47000000)
    })

    it('should accumulate spent across multiple calls', async () => {
      const result = await courseSponsorshipModel.createNew({
        sponsorType: ORGANIZATION_TYPES.ENTERPRISE,
        sponsorId: enterpriseId.toString(),
        title: 'Accumulate Test',
        linkedCourses: [{ courseId: courseId.toString() }],
        budget: 50000000
      })
      const sponsorshipId = result.insertedId

      await courseSponsorshipModel.incrementSpent(sponsorshipId, 1000000)
      await courseSponsorshipModel.incrementSpent(sponsorshipId, 2000000)
      await courseSponsorshipModel.incrementSpent(sponsorshipId, 1500000)

      const updated = await courseSponsorshipModel.findOneById(sponsorshipId)
      expect(updated.spent).toBe(4500000)
      expect(updated.remaining).toBe(45500000)
    })
  })

  // ====================================================================
  // addDisbursement
  // ====================================================================
  describe('addDisbursement', () => {
    it('should add a disbursement record to the disbursements array', async () => {
      const result = await courseSponsorshipModel.createNew({
        sponsorType: ORGANIZATION_TYPES.ENTERPRISE,
        sponsorId: enterpriseId.toString(),
        title: 'Disbursement Test',
        linkedCourses: [{ courseId: courseId.toString() }],
        budget: 50000000
      })
      const sponsorshipId = result.insertedId

      const disbursement = {
        enrollmentId: new ObjectId().toString(),
        courseId: courseId.toString(),
        amount: 3000000,
        type: 'disbursement',
        status: 'completed',
        createdAt: Date.now()
      }

      await courseSponsorshipModel.addDisbursement(sponsorshipId, disbursement)
      const updated = await courseSponsorshipModel.findOneById(sponsorshipId)

      expect(updated.disbursements).toHaveLength(1)
      expect(updated.disbursements[0].amount).toBe(3000000)
      expect(updated.disbursements[0].type).toBe('disbursement')
    })

    it('should accumulate multiple disbursements', async () => {
      const result = await courseSponsorshipModel.createNew({
        sponsorType: ORGANIZATION_TYPES.NGO,
        sponsorId: ngoId.toString(),
        title: 'Multiple Disbursements',
        linkedCourses: [{ courseId: courseId.toString() }],
        budget: 50000000
      })
      const sponsorshipId = result.insertedId

      for (let i = 0; i < 3; i++) {
        await courseSponsorshipModel.addDisbursement(sponsorshipId, {
          enrollmentId: new ObjectId().toString(),
          courseId: courseId.toString(),
          amount: 1000000,
          type: 'disbursement',
          status: 'completed',
          createdAt: Date.now()
        })
      }

      const updated = await courseSponsorshipModel.findOneById(sponsorshipId)
      expect(updated.disbursements).toHaveLength(3)
      expect(updated.disbursements[2].amount).toBe(1000000)
    })
  })

  // ====================================================================
  // addClawback
  // ====================================================================
  describe('addClawback', () => {
    it('should add a clawback record and reverse spent/remaining', async () => {
      const result = await courseSponsorshipModel.createNew({
        sponsorType: ORGANIZATION_TYPES.ENTERPRISE,
        sponsorId: enterpriseId.toString(),
        title: 'Clawback Test',
        linkedCourses: [{ courseId: courseId.toString() }],
        budget: 50000000,
        spent: 3000000,
        remaining: 47000000
      })
      const sponsorshipId = result.insertedId

      const clawback = {
        enrollmentId: new ObjectId().toString(),
        courseId: courseId.toString(),
        amount: 3000000,
        status: 'completed',
        reason: 'Learner dropped out',
        createdAt: Date.now()
      }

      await courseSponsorshipModel.addClawback(sponsorshipId, clawback)
      const updated = await courseSponsorshipModel.findOneById(sponsorshipId)

      const lastEntry = updated.disbursements[updated.disbursements.length - 1]
      expect(lastEntry.type).toBe('clawback')
      expect(lastEntry.amount).toBe(3000000)
      expect(lastEntry.status).toBe('completed')
    })

    it('should accumulate multiple clawbacks', async () => {
      const result = await courseSponsorshipModel.createNew({
        sponsorType: ORGANIZATION_TYPES.ENTERPRISE,
        sponsorId: enterpriseId.toString(),
        title: 'Multiple Clawbacks',
        linkedCourses: [{ courseId: courseId.toString() }],
        budget: 50000000
      })
      const sponsorshipId = result.insertedId

      await courseSponsorshipModel.addClawback(sponsorshipId, {
        enrollmentId: new ObjectId().toString(),
        courseId: courseId.toString(),
        amount: 1000000,
        status: 'completed',
        reason: 'Dropout',
        createdAt: Date.now()
      })
      await courseSponsorshipModel.addClawback(sponsorshipId, {
        enrollmentId: new ObjectId().toString(),
        courseId: courseId.toString(),
        amount: 2000000,
        status: 'completed',
        reason: 'Dropout',
        createdAt: Date.now()
      })

      const updated = await courseSponsorshipModel.findOneById(sponsorshipId)
      const clawbacks = updated.disbursements.filter(d => d.type === 'clawback')
      expect(clawbacks).toHaveLength(2)
    })
  })

  // ====================================================================
  // findActiveByCourse
  // ====================================================================
  describe('findActiveByCourse', () => {
    let courseId1, courseId2

    beforeEach(() => {
      courseId1 = new ObjectId()
      courseId2 = new ObjectId()
    })

    it('should return only ACTIVE sponsorships linked to the course', async () => {
      // ACTIVE sponsorship linked to course1
      const active1 = await courseSponsorshipModel.createNew({
        sponsorType: ORGANIZATION_TYPES.ENTERPRISE,
        sponsorId: enterpriseId.toString(),
        title: 'Active Sponsorship 1',
        linkedCourses: [{ courseId: courseId1.toString() }],
        budget: 50000000,
        status: COURSE_SPONSORSHIP_STATUS.ACTIVE
      })

      // Another ACTIVE sponsorship linked to course1
      const active2 = await courseSponsorshipModel.createNew({
        sponsorType: ORGANIZATION_TYPES.NGO,
        sponsorId: ngoId.toString(),
        title: 'Active Sponsorship 2',
        linkedCourses: [{ courseId: courseId1.toString() }],
        budget: 30000000,
        status: COURSE_SPONSORSHIP_STATUS.ACTIVE
      })

      // DRAFT sponsorship — should NOT be returned
      await courseSponsorshipModel.createNew({
        sponsorType: ORGANIZATION_TYPES.ENTERPRISE,
        sponsorId: enterpriseId.toString(),
        title: 'Draft Sponsorship',
        linkedCourses: [{ courseId: courseId1.toString() }],
        budget: 20000000,
        status: COURSE_SPONSORSHIP_STATUS.DRAFT
      })

      // ACTIVE but linked to different course — should NOT be returned
      await courseSponsorshipModel.createNew({
        sponsorType: ORGANIZATION_TYPES.ENTERPRISE,
        sponsorId: enterpriseId.toString(),
        title: 'Different Course Sponsorship',
        linkedCourses: [{ courseId: courseId2.toString() }],
        budget: 40000000,
        status: COURSE_SPONSORSHIP_STATUS.ACTIVE
      })

      const results = await courseSponsorshipModel.findActiveByCourse(courseId1.toString())

      expect(results).toHaveLength(2)
      expect(results.map(r => r._id.toString()).sort()).toEqual(
        [active1.insertedId.toString(), active2.insertedId.toString()].sort()
      )
    })

    it('should return empty array when no sponsorships exist for course', async () => {
      const results = await courseSponsorshipModel.findActiveByCourse(new ObjectId().toString())
      expect(results).toHaveLength(0)
    })

    it('should not return soft-deleted sponsorships', async () => {
      const created = await courseSponsorshipModel.createNew({
        sponsorType: ORGANIZATION_TYPES.ENTERPRISE,
        sponsorId: enterpriseId.toString(),
        title: 'Soft Deleted Active',
        linkedCourses: [{ courseId: courseId1.toString() }],
        budget: 50000000,
        status: COURSE_SPONSORSHIP_STATUS.ACTIVE
      })
      await courseSponsorshipModel.softDelete(created.insertedId)

      const results = await courseSponsorshipModel.findActiveByCourse(courseId1.toString())
      expect(results.some(r => r._id.toString() === created.insertedId.toString())).toBe(false)
    })
  })

  // ====================================================================
  // updateStatus
  // ====================================================================
  describe('updateStatus', () => {
    it('should transition from DRAFT to ACTIVE', async () => {
      const result = await courseSponsorshipModel.createNew({
        sponsorType: ORGANIZATION_TYPES.ENTERPRISE,
        sponsorId: enterpriseId.toString(),
        title: 'Status Transition Test',
        linkedCourses: [{ courseId: courseId.toString() }],
        budget: 50000000
      })
      const sponsorshipId = result.insertedId

      const updated = await courseSponsorshipModel.updateStatus(
        sponsorshipId,
        COURSE_SPONSORSHIP_STATUS.ACTIVE
      )
      expect(updated.status).toBe(COURSE_SPONSORSHIP_STATUS.ACTIVE)
    })

    it('should transition from ACTIVE to PAUSED', async () => {
      const result = await courseSponsorshipModel.createNew({
        sponsorType: ORGANIZATION_TYPES.ENTERPRISE,
        sponsorId: enterpriseId.toString(),
        title: 'Pause Test',
        linkedCourses: [{ courseId: courseId.toString() }],
        budget: 50000000,
        status: COURSE_SPONSORSHIP_STATUS.ACTIVE
      })
      const sponsorshipId = result.insertedId

      const updated = await courseSponsorshipModel.updateStatus(
        sponsorshipId,
        COURSE_SPONSORSHIP_STATUS.PAUSED
      )
      expect(updated.status).toBe(COURSE_SPONSORSHIP_STATUS.PAUSED)
    })

    it('should transition from PAUSED to ACTIVE (resume)', async () => {
      const result = await courseSponsorshipModel.createNew({
        sponsorType: ORGANIZATION_TYPES.ENTERPRISE,
        sponsorId: enterpriseId.toString(),
        title: 'Resume Test',
        linkedCourses: [{ courseId: courseId.toString() }],
        budget: 50000000,
        status: COURSE_SPONSORSHIP_STATUS.PAUSED
      })
      const sponsorshipId = result.insertedId

      const updated = await courseSponsorshipModel.updateStatus(
        sponsorshipId,
        COURSE_SPONSORSHIP_STATUS.ACTIVE
      )
      expect(updated.status).toBe(COURSE_SPONSORSHIP_STATUS.ACTIVE)
    })
  })
})
