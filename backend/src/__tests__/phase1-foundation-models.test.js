import { describe, it, expect } from '@jest/globals'
import { ObjectId } from 'mongodb'
import { partnershipModel } from '~/models/partnershipModel'
import { courseSponsorshipModel } from '~/models/courseSponsorshipModel'
import { courseModel } from '~/models/courseModel'
import { enrollmentModel } from '~/models/enrollmentModel'
import {
  PARTNERSHIP_STATUS,
  COURSE_SPONSORSHIP_STATUS,
  COURSE_SPONSORSHIP_MODEL,
  DISBURSEMENT_MODEL,
  ENROLLMENT_SOURCE,
  PLACEMENT_REFERRAL_SOURCE,
  ORGANIZATION_TYPES,
  SCHOLARSHIP_COVERAGE,
  COURSE_STATUS,
  COURSE_FUNDING_MODELS,
  DURATION_UNITS,
  LOCATION_TYPES,
  COURSE_DELIVERY_TYPES
} from '~/utils/constants'

describe('phase1 foundation models', () => {
  describe('constants', () => {
    it('should expose new partnership and sponsorship enums', () => {
      expect(PARTNERSHIP_STATUS.ACTIVE).toBe('active')
      expect(COURSE_SPONSORSHIP_STATUS.EXHAUSTED).toBe('exhausted')
      expect(COURSE_SPONSORSHIP_MODEL.CO_FUNDED).toBe('co_funded')
      expect(DISBURSEMENT_MODEL.MILESTONE).toBe('milestone')
      expect(ENROLLMENT_SOURCE.ENTERPRISE_LINKED).toBe('enterprise_linked')
      expect(PLACEMENT_REFERRAL_SOURCE.MIXED).toBe('mixed')
    })
  })

  describe('partnershipModel.validateBeforeCreate', () => {
    it('should validate a valid partnership payload', async () => {
      const data = {
        enterpriseId: new ObjectId().toString(),
        trainerId: new ObjectId().toString(),
        requestedCourseIds: [new ObjectId().toString()],
        recruitmentNeeds: {
          jobTitle: 'Nhân viên pha chế',
          jobQuantity: 10,
          salaryRange: {
            min: 8000000,
            max: 12000000,
            currency: 'VND'
          },
          requirements: ['Có kỹ năng giao tiếp'],
          targetSkills: ['pha chế'],
          employmentType: 'full-time'
        }
      }

      const validated = await partnershipModel.validateBeforeCreate(data)
      expect(validated.status).toBe(PARTNERSHIP_STATUS.PENDING)
      expect(validated.stats.enrolledLearners).toBe(0)
    })
  })

  describe('courseSponsorshipModel.validateBeforeCreate', () => {
    it('should validate a valid course sponsorship payload', async () => {
      const data = {
        sponsorType: ORGANIZATION_TYPES.ENTERPRISE,
        sponsorId: new ObjectId().toString(),
        title: 'Enterprise hỗ trợ học phí',
        fundingModel: COURSE_SPONSORSHIP_MODEL.ENTERPRISE,
        linkedCourses: [
          {
            courseId: new ObjectId().toString(),
            coverage: SCHOLARSHIP_COVERAGE.FULL,
            maxAmount: 5000000
          }
        ],
        budget: 50000000,
        coverageType: SCHOLARSHIP_COVERAGE.FULL,
        disbursementModel: DISBURSEMENT_MODEL.UPFRONT
      }

      const validated = await courseSponsorshipModel.validateBeforeCreate(data)
      expect(validated.status).toBe(COURSE_SPONSORSHIP_STATUS.DRAFT)
      expect(validated.remaining).toBe(0)
    })

    it('should reject missing linked courses', async () => {
      await expect(courseSponsorshipModel.validateBeforeCreate({
        sponsorType: ORGANIZATION_TYPES.NGO,
        sponsorId: new ObjectId().toString(),
        title: 'NGO hỗ trợ học phí',
        budget: 10000000,
        linkedCourses: []
      })).rejects.toThrow()
    })
  })

  describe('courseModel.validateBeforeCreate', () => {
    it('should accept partnership and sponsorship metadata', async () => {
      const data = {
        title: 'Khóa học liên kết',
        slug: 'khoa-hoc-lien-ket',
        description: 'Mô tả khóa học liên kết đủ dài để vượt validate.',
        shortDescription: 'Mô tả ngắn',
        categoryId: new ObjectId().toString(),
        providerId: new ObjectId().toString(),
        duration: { value: 6, unit: DURATION_UNITS.WEEKS },
        location: { type: LOCATION_TYPES.ONLINE, address: '', link: '' },
        delivery_type: COURSE_DELIVERY_TYPES.VIDEO,
        funding_model: COURSE_FUNDING_MODELS.ENTERPRISE_FUNDED,
        linkedPartnershipId: new ObjectId().toString(),
        linkedEnterpriseId: new ObjectId().toString(),
        sponsorship: {
          hasSponsorship: true,
          sponsorTypes: [ORGANIZATION_TYPES.ENTERPRISE, ORGANIZATION_TYPES.NGO],
          activeSponsorshipIds: [new ObjectId().toString()],
          priorityRecruitment: true,
          badgeLabel: 'Được tài trợ bởi doanh nghiệp'
        },
        status: COURSE_STATUS.DRAFT
      }

      const validated = await courseModel.validateBeforeCreate(data)
      expect(validated.linkedPartnershipId).toBeTruthy()
      expect(validated.sponsorship.hasSponsorship).toBe(true)
    })
  })

  describe('enrollmentModel.validateBeforeCreate', () => {
    it('should accept partnership and sponsorship contract fields', async () => {
      const data = {
        userId: new ObjectId().toString(),
        courseId: new ObjectId().toString(),
        source: ENROLLMENT_SOURCE.CO_FUNDED,
        partnershipId: new ObjectId().toString(),
        enterpriseId: new ObjectId().toString(),
        sponsorships: [
          {
            sponsorshipId: new ObjectId().toString(),
            sponsorType: ORGANIZATION_TYPES.ENTERPRISE,
            fundedAmount: 3000000,
            disbursedAmount: 0,
            coverage: SCHOLARSHIP_COVERAGE.PARTIAL
          }
        ]
      }

      const validated = await enrollmentModel.validateBeforeCreate(data)
      expect(validated.source).toBe(ENROLLMENT_SOURCE.CO_FUNDED)
      expect(validated.sponsorships).toHaveLength(1)
    })
  })
})
