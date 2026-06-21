/**
 * Test Data Factory — reusable helpers for creating complex test fixtures
 * These helpers create documents in the TEST database and return them.
 * Usage: import factory from './helpers/testDataFactory';
 */

import { ObjectId } from 'mongodb';
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
  COURSE_SPONSORSHIP_MODEL,
  DISBURSEMENT_MODEL,
  SCHOLARSHIP_COVERAGE,
  PLACEMENT_STATUS,
  ORGANIZATION_TYPES
} from '~/utils/constants';

export const createTestUser = async (db, role = USER_ROLES.WORKER, displayName = 'Test User', email = '') => {
  const { userModel } = await import('~/models/userModel');
  const uniq = `${Date.now()}_${Math.random()}`;
  return await userModel.createNew({
    email: email || `test_${uniq}@example.com`,
    password: 'password123',
    username: `user_${uniq}`,
    displayName,
    phone: '0900000000',
    role,
    isActive: true,
    emailVerified: true
  });
};

export const createTestCategory = async (db, name = '') => {
  const { categoryModel } = await import('~/models/categoryModel');
  return await categoryModel.createNew({
    name: name || `Category ${Date.now()}`,
    slug: `category-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    description: 'Test category description'
  });
};

export const createTrainerCourse = async (db, trainerId, categoryId, overrides = {}) => {
  const { courseModel } = await import('~/models/courseModel');
  return await courseModel.createNew({
    title: overrides.title || `Trainer Course ${Date.now()}`,
    description: overrides.description || 'Day la mo ta khoa hoc du dai de pass validation.',
    shortDescription: overrides.shortDescription || 'Mo ta ngan',
    slug: overrides.slug || `trainer-course-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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
    scholarshipEligibility: overrides.scholarshipEligibility ?? false,
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
  });
};

export const createPartnership = async (db, enterpriseId, trainerId, overrides = {}) => {
  const { partnershipModel } = await import('~/models/partnershipModel');
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
  }, true);
};

export const createEnrollment = async (db, userId, courseId, overrides = {}) => {
  const { enrollmentModel } = await import('~/models/enrollmentModel');
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
    source: overrides.source || 'direct',
    enterpriseId: overrides.enterpriseId || null,
    partnershipId: overrides.partnershipId || null,
    sponsorships: overrides.sponsorships || [],
    enrolledAt: overrides.enrolledAt || Date.now(),
    completedAt: overrides.completedAt || null,
    _destroy: false
  }, true);
};

export const createWorkerProfile = async (db, userId, profileData = {}) => {
  const { workerProfileModel } = await import('~/models/workerProfileModel');
  const created = await workerProfileModel.createNew({
    userId: userId.toString(),
    currentStep: 1,
    isCompleted: false,
    basicInfo: profileData.basicInfo || {
      age: 45,
      gender: 'male',
      province: '79',
      education: 'university',
      maritalStatus: 'single',
      phone: '0900000000'
    },
    employmentHistory: profileData.employmentHistory || [{
      occupation: 'Software Engineer',
      companyName: 'Tech Corp',
      jobType: 'full-time'
    }],
    ...profileData
  }, true);
  // Mark profile as completed for eligibility checks
  await workerProfileModel.completeProfile(userId.toString()).catch(() => {});
  return created;
};

export const createSponsorship = async (db, sponsorId, sponsorType, overrides = {}) => {
  const { courseSponsorshipModel } = await import('~/models/courseSponsorshipModel');
  return await courseSponsorshipModel.createNew({
    sponsorId: sponsorId.toString(),
    sponsorType: sponsorType || ORGANIZATION_TYPES.ENTERPRISE,
    title: overrides.title || 'Test Sponsorship',
    description: overrides.description || 'Test sponsorship description',
    linkedCourses: overrides.linkedCourses || [],
    budget: overrides.budget || 50000000,
    targetLearners: overrides.targetLearners || 10,
    coverageType: overrides.coverageType || SCHOLARSHIP_COVERAGE.FULL,
    maxAmountPerLearner: overrides.maxAmountPerLearner || 5000000,
    disbursementModel: overrides.disbursementModel || DISBURSEMENT_MODEL.COMPLETION,
    eligibilityCriteria: overrides.eligibilityCriteria || {},
    clawbackPolicy: overrides.clawbackPolicy || {
      enabled: false,
      refundOnDrop: false,
      refundOnNoShow: false,
      notes: null
    },
    autoApprove: overrides.autoApprove ?? false,
    priorityRecruitment: overrides.priorityRecruitment ?? false,
    stats: overrides.stats || {
      approvedLearners: 0,
      activeLearners: 0,
      completedLearners: 0
    },
    disbursements: overrides.disbursements || [],
    startsAt: overrides.startsAt || null,
    expiresAt: overrides.expiresAt || null,
    ...overrides
  });
};

export const createPlacement = async (db, enrollmentId, userId, courseId, overrides = {}) => {
  const { placementModel } = await import('~/models/placementModel');
  return await placementModel.createNew({
    enrollmentId: enrollmentId.toString(),
    userId: userId.toString(),
    courseId: courseId.toString(),
    status: overrides.status || PLACEMENT_STATUS.REFERRED,
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
    ...overrides
  });
};

/**
 * Creates a sponsorship with disbursement history already present.
 * Useful for testing clawback logic.
 */
export const createSponsorshipWithDisbursements = async (db, sponsorId, sponsorType, courseId, disbursements = []) => {
  const totalSpent = disbursements.reduce((sum, d) => sum + d.amount, 0);
  return await createSponsorship(db, sponsorId, sponsorType, {
    linkedCourses: [{ courseId: courseId.toString(), coverage: SCHOLARSHIP_COVERAGE.FULL, maxAmount: 5000000 }],
    disbursements,
    budget: 50000000,
    spent: totalSpent,
    remaining: 50000000 - totalSpent,
    ...(totalSpent > 0 ? { status: COURSE_SPONSORSHIP_STATUS.ACTIVE } : {})
  });
};

/**
 * Creates an enrollment pre-populated with sponsorship records.
 * Useful for testing disbursement/clawback triggers.
 */
export const createEnrollmentWithSponsorships = async (db, userId, courseId, sponsorshipRecords = []) => {
  return await createEnrollment(db, userId, courseId, {
    sponsorships: sponsorshipRecords.map(r => ({
      sponsorshipId: r.sponsorshipId.toString(),
      sponsorType: r.sponsorType,
      fundedAmount: r.fundedAmount || 0,
      disbursedAmount: r.disbursedAmount || 0,
      clawbackAmount: r.clawbackAmount || 0,
      coverage: r.coverage || SCHOLARSHIP_COVERAGE.FULL,
      status: r.status || 'matched',
      disbursements: r.disbursements || [],
      matchedAt: r.matchedAt || Date.now()
    })),
    source: sponsorshipRecords.length > 1 ? 'co_funded' :
      sponsorshipRecords[0]?.sponsorType === ORGANIZATION_TYPES.ENTERPRISE ? 'enterprise_sponsored' :
      sponsorshipRecords[0]?.sponsorType === ORGANIZATION_TYPES.NGO ? 'ngo_sponsored' : 'direct'
  });
};
