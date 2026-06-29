import { eventService } from '~/services/eventService'
import { StatusCodes } from 'http-status-codes'
import { CloudinaryProvider } from '~/providers/CloudinaryProvider'

const createEvent = async (req, res, next) => {
  try {
    let coverImageUrl = req.body.coverImage || ''
    
    // Nếu có file upload, xử lý upload qua Cloudinary
    if (req.file) {
      const uploadResult = await CloudinaryProvider.streamUpload(req.file.buffer, 'events')
      coverImageUrl = uploadResult.secure_url
    }

    const data = {
      ...req.body,
      coverImage: coverImageUrl,
      organizerId: req.user._id // Get from authenticated user (NGO)
    }
    const newEvent = await eventService.createEvent(data)
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Tạo sự kiện thành công',
      data: newEvent
    })
  } catch (error) {
    next(error)
  }
}

const getEvents = async (req, res, next) => {
  try {
    const { page, limit, organizerId } = req.query
    const filters = {}
    if (organizerId) filters.organizerId = organizerId

    const result = await eventService.getEvents(page, limit, filters)
    res.status(StatusCodes.OK).json({
      success: true,
      data: result.results,
      totalCount: result.totalCount,
      totalPages: result.totalPages
    })
  } catch (error) {
    next(error)
  }
}

const getEventById = async (req, res, next) => {
  try {
    const event = await eventService.getEventById(req.params.id)
    
    // Check if current user is joined
    let isJoined = false
    if (req.user) {
      isJoined = await eventService.checkUserJoined(event._id, req.user._id)
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: { ...event, isJoined }
    })
  } catch (error) {
    next(error)
  }
}

const joinEvent = async (req, res, next) => {
  try {
    const registration = await eventService.joinEvent(req.params.id, req.user._id)
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Đăng ký tham gia sự kiện thành công',
      data: registration
    })
  } catch (error) {
    next(error)
  }
}

const getEventParticipants = async (req, res, next) => {
  try {
    const { page, limit } = req.query
    const result = await eventService.getEventParticipants(req.params.id, req.user._id, page, limit)
    res.status(StatusCodes.OK).json({
      success: true,
      data: result.results,
      totalCount: result.totalCount,
      totalPages: result.totalPages
    })
  } catch (error) {
    next(error)
  }
}

export const eventController = {
  createEvent,
  getEvents,
  getEventById,
  joinEvent,
  getEventParticipants
}
