import express from 'express'
import { eventController } from '~/controllers/eventController'
import { eventValidation } from '~/validations/eventValidation'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

// Worker + Ngo can get all events
Router.route('/')
  .get(authMiddleware.isAuthorized, eventValidation.getEvents, eventController.getEvents)
  .post(authMiddleware.isAuthorizedNGO, eventValidation.createEvent, eventController.createEvent)

Router.route('/:id')
  .get(authMiddleware.isAuthorized, eventController.getEventById)

Router.route('/:id/join')
  .post(authMiddleware.isAuthorizedWorker, eventController.joinEvent)

Router.route('/:id/participants')
  .get(authMiddleware.isAuthorizedNGO, eventController.getEventParticipants)

export default Router
