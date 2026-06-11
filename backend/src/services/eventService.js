import { eventModel } from '~/models/eventModel'
import { eventRegistrationModel } from '~/models/eventRegistrationModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { ObjectId } from 'mongodb'

const createEvent = async (data) => {
  try {
    const newEvent = await eventModel.createNew(data)
    const getNewEvent = await eventModel.findOneById(newEvent.insertedId)
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
    await eventModel.incrementParticipantCount(eventId)

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
