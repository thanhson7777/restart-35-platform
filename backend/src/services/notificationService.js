import { GET_DB } from '~/config/mongodb'
import { notificationModel } from '~/models/notificationModel'
import { getIO } from '~/config/socket'

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
      title: 'Yêu cầu giải ngân được tạo',
      message: `Disbursement cho sponsorship ${context.sponsorshipId} được tạo với số tiền ${context.amount}.`
    },
    [NOTIFICATION_EVENT_TYPES.SPONSORSHIP_CLAWBACK_CREATED]: {
      title: 'Yêu cầu thu hồi quỹ được tạo',
      message: `Clawback cho sponsorship ${context.sponsorshipId} được tạo.`
    },
    [NOTIFICATION_EVENT_TYPES.ENROLLMENT_DROPPED_WITH_FUNDING]: {
      title: 'Học viên có tài trợ dừng học',
      message: `Enrollment ${context.enrollmentId} dừng học. Đang xử lý hoàn tiền.`
    },
    [NOTIFICATION_EVENT_TYPES.REFERRAL_BONUS_CREATED]: {
      title: 'Thưởng giới thiệu mới',
      message: `Bạn nhận được thưởng giới thiệu cho learner ${context.learnerId}.`
    }
  }

  const template = templates[eventType] || {
    title: 'Thông báo hệ thống',
    message: 'Có sự kiện mới trong hệ thống.'
  }

  return {
    ...template,
    type: eventType,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date()
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

// ================= USER NOTIFICATIONS (UI) =================

const createUserNotification = async (data) => {
  try {
    const newNotification = await notificationModel.createNew(data)
    
    try {
      const io = getIO()
      if (io) {
        io.to(newNotification.recipientId.toString()).emit('NEW_NOTIFICATION', newNotification)
      }
    } catch (ioError) {
      // Bỏ qua lỗi socket để không làm gián đoạn luồng API chính
      console.error('Socket.io error emitting notification:', ioError.message)
    }
    
    return newNotification
  } catch (error) {
    throw new Error(error.message)
  }
}

const getUserNotifications = async (userId, page = 1, limit = 20) => {
  try {
    return await notificationModel.findByUserId(userId, page, limit)
  } catch (error) {
    throw new Error(error.message)
  }
}

const markAsRead = async (notificationId, userId) => {
  try {
    const updatedNotification = await notificationModel.markAsRead(notificationId, userId)
    if (!updatedNotification) {
      throw new Error('Notification not found or access denied')
    }
    return updatedNotification
  } catch (error) {
    throw new Error(error.message)
  }
}

const markAllAsRead = async (userId) => {
  try {
    return await notificationModel.markAllAsRead(userId)
  } catch (error) {
    throw new Error(error.message)
  }
}

const notifyAdmins = async (data) => {
  try {
    const { userModel } = await import('~/models/userModel')
    const { users: admins } = await userModel.getUsers({ role: 'admin' }, 0, 100)
    
    const notifications = []
    for (const admin of admins) {
      const notificationData = {
        ...data,
        recipientId: admin._id.toString()
      }
      const newNotification = await createUserNotification(notificationData)
      notifications.push(newNotification)
    }
    return notifications
  } catch (error) {
    console.error('Failed to notify admins:', error.message)
  }
}

export const notificationService = {
  NOTIFICATION_COLLECTION_NAME,
  NOTIFICATION_EVENT_TYPES,
  buildNotification,
  queueNotification,
  notifyPartnershipParticipants,
  notifySponsors,
  createUserNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  notifyAdmins
}
