// backend/src/routes/v1/index.js - THÊM MỚI DÒNG

import express from 'express'
import { userRoute } from './userRoute'
import { workerProfileRoute } from './workerProfileRoute'
import { aiRoute } from './aiRoute'
import { interactionRoute } from './interactionRoute'
import { outcomeRoute } from './outcomeRoute'
import { dashboardRoute } from './dashboardRoute'
import { courseRoute } from './courseRoute'
import { enrollmentRoute } from './enrollmentRoute'
import { scheduleRoute } from './scheduleRoute'
import { reviewRoute } from './reviewRoute'
import { categoryRoute } from './categoryRoute'
import { scholarshipRoute } from './scholarshipRoute'
import { applicationRoute } from './applicationRoute'

const Router = express.Router()

Router.get('/', (req, res) => {
  res.json({
    message: 'Welcome to API version 1.0.0',
    modules: {
      users: '/v1/users',
      workerProfiles: '/v1/worker-profiles',
      ai: '/v1/ai',
      interactions: '/v1/interactions',
      outcomes: '/v1/outcomes',
      dashboard: '/v1/dashboard',
      courses: '/v1/courses',
      enrollments: '/v1/enrollments',
      schedules: '/v1/schedules',
      reviews: '/v1/reviews',
      categories: '/v1/categories',
      scholarships: '/v1/scholarships',
      applications: '/v1/applications'
    }
  })
})

Router.use('/users', userRoute)
Router.use('/worker-profiles', workerProfileRoute)
Router.use('/ai', aiRoute)
Router.use('/interactions', interactionRoute)
Router.use('/outcomes', outcomeRoute)
Router.use('/dashboard', dashboardRoute)
Router.use('/courses', courseRoute)
Router.use('/enrollments', enrollmentRoute)
Router.use('/schedules', scheduleRoute)
Router.use('/reviews', reviewRoute)
Router.use('/categories', categoryRoute)
Router.use('/scholarships', scholarshipRoute)
Router.use('/applications', applicationRoute)

export const APIS_V1 = Router