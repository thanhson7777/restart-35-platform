import { GET_DB } from '~/config/mongodb'

const NOTIFICATION_COLLECTION_NAME = 'notification_jobs'

const NOTIFICATION_EVENT_TYPES = {
  ENROLLMENT_COMPLETED_FOR_PARTNERSHIP: 'enrollment_completed_for_partnership',
  ENROLLMENT_PLACED_FOR_PARTNERSHIP: 'enrollment_placed_for_partnership',
  SPONSORSHIP_ELIGIBLE_MATCH_FOUND: 'sponsorship_eligible_match_found',
  SPONSORSHIP_DISBURSEMENT_CREATED: 'sponsorship_disbursement_created',
  SPONSORSHIP_CLAWBACK_CREATED: 'sponsorship_clawback_created',
  ENROLLMENT_DROPPED_WITH_FUNDING: 'enrollment_dropped_with_funding',
  REFERRAL_BONUS_CREATED: 'referral_bonus_created'
}

const buildNotification = (eventType, context = {}) => {
  const templates = {
    [NOTIFICATION_EVENT_TYPES.ENROLLMENT_COMPLETED_FOR_PARTNERSHIP]: {
      title: 'Learner hoàn thành khóa học trong partnership',
      message: `Enrollment ${context.enrollmentId} đã hoàn thành.`
    },
    [NOTIFICATION_EVENT_TYPES.ENROLLMENT_PLACED_FOR_PARTNERSHIP]: {
      title: 'Learner đã được placement',
      message: `Placement ${context.placementId} đã đạt milestone placement.`
    },
    [NOTIFICATION_EVENT_TYPES.SPONSORSHIP_ELIGIBLE_MATCH_FOUND]: {
      title: 'Tìm thấy sponsorship phù hợp',
      message: `Enrollment ${context.enrollmentId || ''} phù hợp với ${context.matches?.length || 0} sponsorship.`
    },
    [NOTIFICATION_EVENT_TYPES.SPONSORSHIP_DISBURSEMENT_CREATED]: {
      title: 'Đã tạo disbursement tài trợ',
      message: `Đã ghi nhận disbursement ${context.amount || 0} cho sponsorship ${context.sponsorshipId}.`
    },
    [NOTIFICATION_EVENT_TYPES.SPONSORSHIP_CLAWBACK_CREATED]: {
      title: 'Đã tạo clawback tài trợ',
      message: `Đã ghi nhận clawback ${context.amount || 0} cho sponsorship ${context.sponsorshipId}.`
    },
    [NOTIFICATION_EVENT_TYPES.ENROLLMENT_DROPPED_WITH_FUNDING]: {
      title: 'Enrollment bị drop có funding',
      message: `Enrollment ${context.enrollmentId} đã drop và cần xử lý funding.`
    },
    [NOTIFICATION_EVENT_TYPES.REFERRAL_BONUS_CREATED]: {
      title: 'Đã tạo referral bonus',
      message: `Referral bonus ${context.amount || 0} đã được tính cho placement ${context.placementId}.`
    }
  }

  const template = templates[eventType] || {
    title: eventType,
    message: context.message || 'Notification nội bộ'
  }

  return {
    eventType,
    title: template.title,
    message: template.message,
    recipients: context.recipients || [],
    entityType: context.entityType || null,
    entityId: context.entityId || null,
    payload: context,
    status: 'pending',
    createdAt: Date.now(),
    processedAt: null
  }
}

const queueNotification = async (notification) => {
  const result = await GET_DB().collection(NOTIFICATION_COLLECTION_NAME).insertOne(notification)
  return { _id: result.insertedId, ...notification }
}

const notifyPartnershipParticipants = async (partnership, eventType, context = {}) => {
  const notification = buildNotification(eventType, {
    ...context,
    entityType: 'partnership',
    entityId: partnership?._id?.toString?.() || partnership?._id || null,
    recipients: [partnership?.enterpriseId, partnership?.trainerId].filter(Boolean)
  })
  return await queueNotification(notification)
}

const notifySponsors = async (sponsorshipRecords = [], eventType, context = {}) => {
  const jobs = []
  for (const sponsorshipRecord of sponsorshipRecords) {
    const notification = buildNotification(eventType, {
      ...context,
      sponsorshipId: sponsorshipRecord.sponsorshipId,
      entityType: 'course_sponsorship',
      entityId: sponsorshipRecord.sponsorshipId,
      recipients: sponsorshipRecord.recipients || []
    })
    jobs.push(await queueNotification(notification))
  }
  return jobs
}

export const notificationService = {
  NOTIFICATION_COLLECTION_NAME,
  NOTIFICATION_EVENT_TYPES,
  buildNotification,
  queueNotification,
  notifyPartnershipParticipants,
  notifySponsors
}
