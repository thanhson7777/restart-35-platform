import express from 'express'
import { userRoute } from './userRoute'
import { workerProfileRoute } from './workerProfileRoute'
import { aiRoute } from './aiRoute'
import { interactionRoute } from './interactionRoute'

const Router = express.Router()

Router.get('/', (req, res) => {
  res.json({
    message: 'Welcome to API version 1.0.0',
    modules: {
      users: '/v1/users',
      workerProfiles: '/v1/worker-profiles',
      ai: '/v1/ai',
      interactions: '/v1/interactions'
    }
  })
})

Router.use('/users', userRoute)
Router.use('/worker-profiles', workerProfileRoute)
Router.use('/ai', aiRoute)
Router.use('/interactions', interactionRoute)

export const APIS_V1 = Router
