import { eventModel } from '~/models/eventModel'
import { eventRegistrationModel } from '~/models/eventRegistrationModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { ObjectId } from 'mongodb'

const createEvent = async (data) => {
  try {
    const newEvent = await eventModel.createNew(data)
    const getNewEvent = await eventModel.findOneById(newEvent.insertedId)

    // Phát sóng cho tất cả người dùng (Realtime public event)
    const { notificationService } = await import('~/services/notificationService')
    notificationService.broadcastEvent('PUBLIC_EVENT_CREATED', { eventId: newEvent.insertedId })

    return getNewEvent
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message)
  }
}

const getEvents = async (page = 1, limit = 10, filters = {}) => {
  try {
    const skip = (page - 1) * limit
    const query = { _destroy: false, ...filters }
    if (query.organizerId) query.organizerId = new ObjectId(query.organizerId)
    
    const [events, totalCount] = await Promise.all([
      eventModel.findByQuery(query, skip, parseInt(limit)),
      eventModel.countDocuments(query)
    ])

    return {
      results: events,
      totalCount,
      totalPages: Math.ceil(totalCount / limit)
    }
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message)
  }
}

const getEventById = async (eventId) => {
  try {
    const event = await eventModel.getDetails(eventId)
    if (!event) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy sự kiện')
    return event
  } catch (error) {
    throw new ApiError(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR, error.message)
  }
}

const joinEvent = async (eventId, userId) => {
  try {
    const event = await eventModel.findOneById(eventId)
    if (!event) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy sự kiện')

    // Check if already joined
    const existingRegistration = await eventRegistrationModel.findOne(eventId, userId)
    if (existingRegistration) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Bạn đã đăng ký tham gia sự kiện này rồi')
    }

    // Create registration
    await eventRegistrationModel.createNew({ eventId, userId })

    // Increment participant count
    const updatedEvent = await eventModel.incrementParticipantCount(eventId)

    // Send realtime public event and notification
    const { notificationService } = await import('~/services/notificationService')
    const { getIO } = await import('~/config/socket')
    const { userModel } = await import('~/models/userModel')
    
    // Phát sự kiện broadcast cho tất cả client
    notificationService.broadcastEvent('EVENT_PARTICIPANT_UPDATED', {
      eventId: eventId.toString(),
      participantCount: updatedEvent ? updatedEvent.participantCount : event.participantCount + 1
    })

    // Lấy tên người dùng để tạo thông báo
    const worker = await userModel.findOneById(userId)
    const workerName = worker?.fullName || 'Một học viên'

    // Gửi thông báo cho NGO (organizerId)
    const notificationData = notificationService.buildNotification(
      'event_new_participant',
      {
        eventId: eventId.toString(),
        eventTitle: event.title,
        workerName: workerName
      }
    )
    
    await notificationService.createUserNotification({
      ...notificationData,
      recipientId: event.organizerId.toString(),
      entityType: 'event',
      entityId: eventId.toString(),
      link: '/ngo/events'
    })

    return { message: 'Đăng ký tham gia thành công' }
  } catch (error) {
    throw new ApiError(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR, error.message)
  }
}

const getEventParticipants = async (eventId, organizerId, page = 1, limit = 20) => {
  try {
    const event = await eventModel.findOneById(eventId)
    if (!event) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy sự kiện')
    
    if (event.organizerId.toString() !== organizerId.toString()) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền xem danh sách này')
    }

    const skip = (page - 1) * limit
    
    const [registrations, totalCount] = await Promise.all([
      eventRegistrationModel.findByEventId(eventId, skip, parseInt(limit)),
      eventRegistrationModel.countDocuments({ eventId: new ObjectId(eventId) })
    ])

    return {
      results: registrations.map(reg => ({
        _id: reg._id,
        user: reg.user,
        registeredAt: reg.createdAt
      })),
      totalCount,
      totalPages: Math.ceil(totalCount / limit)
    }
  } catch (error) {
    throw new ApiError(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR, error.message)
  }
}

const checkUserJoined = async (eventId, userId) => {
  try {
    if (!userId) return false
    const existingRegistration = await eventRegistrationModel.findOne(eventId, userId)
    return !!existingRegistration
  } catch (error) {
    return false
  }
}

export const eventService = {
  createEvent,
  getEvents,
  getEventById,
  joinEvent,
  getEventParticipants,
  checkUserJoined
}
