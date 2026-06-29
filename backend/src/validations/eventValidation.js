import Joi from 'joi'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'

const createEvent = async (req, res, next) => {
  if (req.body.eventDate) {
    req.body.eventDate = Number(req.body.eventDate)
  }
  const schema = Joi.object({
    title: Joi.string().required().trim(),
    coverImage: Joi.string().allow('', null),
    eventDate: Joi.alternatives().try(
      Joi.date().timestamp('javascript'),
      Joi.number()
    ).required(),
    location: Joi.string().required().trim(),
    description: Joi.string().required().trim(),
  })

  try {
    await schema.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }
}

const getEvents = async (req, res, next) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    organizerId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/)
  })

  try {
    await schema.validateAsync(req.query, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }
}

export const eventValidation = {
  createEvent,
  getEvents
}
