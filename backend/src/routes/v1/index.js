import express from 'express'
import { userRoute } from './userRoute'
import { workerProfileRoute } from './workerProfileRoute'
import { aiRoute } from './aiRoute'

const Router = express.Router()

Router.get('/', (req, res) => {
  res.json({
    message: 'Welcome to API version 1.0.0',
    modules: {
      users: '/v1/users',
      workerProfiles: '/v1/worker-profiles',
      ai: '/v1/ai'
    }
  })
})

Router.use('/users', userRoute)
Router.use('/worker-profiles', workerProfileRoute)
Router.use('/ai', aiRoute)

export const APIS_V1 = Router
