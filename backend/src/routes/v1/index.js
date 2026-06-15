// backend/src/routes/v1/index.js - THÊM MỚI DÒNG

import express from 'express'
import { userRoute } from './userRoute'
import { workerProfileRoute } from './workerProfileRoute'
import { aiRoute } from './aiRoute'
import { interactionRoute } from './interactionRoute'
import { outcomeRoute } from './outcomeRoute'
import { dashboardRoute } from './dashboardRoute'
import { enterpriseDashboardRoute } from './enterpriseDashboardRoute'
import { ngoDashboardRoute } from './ngoDashboardRoute'
import { trainerDashboardRoute } from './trainerDashboardRoute'
import { courseRoute } from './courseRoute'
import { enrollmentRoute } from './enrollmentRoute'
import { scheduleRoute } from './scheduleRoute'
import { reviewRoute } from './reviewRoute'
import { categoryRoute } from './categoryRoute'
import { scholarshipRoute } from './scholarshipRoute'
import { workerApplicationRoute } from './workerApplicationRoute'
import { escoRoute } from './escoRoute'
import { jobRoute } from './jobRoute'
import { learningPathRoute } from './learningPathRoute'
import { jobCategoryRoute } from './jobCategoryRoute'
import forumRoute from './forumRoute'
import mentorRoute from './mentorRoute'
import mentorSessionRoute from './mentorSessionRoute'
import { organizationRoute } from './organizationRoute'
import { fundingConfigRoute } from './fundingConfigRoute'
import { paymentRoute } from './paymentRoute'
import { paymentTestRoute } from './paymentTestRoute'
import { isaRepaymentRoute } from './isaRepaymentRoute'
import workerSponsorshipRoute from './workerSponsorshipRoute'
import { learningRecordRoute } from './learningRecordRoute'
import { certificateRoute } from './certificateRoute'
import { placementRoute } from './placementRoute'
import { partnershipRoute } from './partnershipRoute'
import { courseSponsorshipRoute } from './courseSponsorshipRoute'
import { lessonProgressRoute } from './lessonProgressRoute'
import { videoNoteRoute } from './videoNoteRoute'
import { recommendationFeedbackRoute } from './recommendationFeedbackRoute'
import { contactRoute } from './contactRoute'
import { recruitmentJobRoute } from './recruitmentJobRoute'
import { adminJobRoute } from './adminJobRoute'
import { publicJobRoute } from './publicJobRoute'
import { enterpriseApplicationRoute } from './enterpriseApplicationRoute'
import { interviewRoute } from './interviewRoute'
import { workerInterviewRoute } from './workerInterviewRoute'
import { offerRoute } from './offerRoute'
import { workerOfferRoute } from './workerOfferRoute'
import eventRoute from './eventRoute'
import { mapRoute } from './mapRoute'
import { adminAnalyticsRoute } from './adminAnalyticsRoute'

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
      enterpriseDashboard: '/v1/enterprise/dashboard',
      ngoDashboard: '/v1/ngo/dashboard',
      trainerDashboard: '/v1/trainer/dashboard',
      courses: '/v1/courses',
      enrollments: '/v1/enrollments',
      schedules: '/v1/schedules',
      reviews: '/v1/reviews',
      categories: '/v1/categories',
      scholarships: '/v1/scholarships',
      applications: '/v1/applications',
      esco: '/v1/esco',
      jobs: '/v1/jobs',
      organizations: '/v1/organizations',
      fundingConfigs: '/v1/funding-configs',
      payments: '/v1/payments',
      isaRepayments: '/v1/isa-repayments',
      learningRecords: '/v1/learning-records',
      certificates: '/v1/certificates',
      placements: '/v1/placements',
      partnerships: '/v1/partnerships',
      courseSponsorships: '/v1/course-sponsorships',
      contacts: '/v1/contacts',
      adminAnalytics: '/v1/admin-analytics'
    }
  })
})

Router.use('/users', userRoute)
Router.use('/worker-profiles', workerProfileRoute)
Router.use('/ai', aiRoute)
Router.use('/interactions', interactionRoute)
Router.use('/outcomes', outcomeRoute)
Router.use('/dashboard', dashboardRoute)
Router.use('/enterprise/dashboard', enterpriseDashboardRoute)
Router.use('/ngo/dashboard', ngoDashboardRoute)
Router.use('/trainer/dashboard', trainerDashboardRoute)
Router.use('/courses', courseRoute)
Router.use('/enrollments', enrollmentRoute)
Router.use('/schedules', scheduleRoute)
Router.use('/reviews', reviewRoute)
Router.use('/categories', categoryRoute)
Router.use('/scholarships', scholarshipRoute)
Router.use('/esco', escoRoute)
Router.use('/jobs', publicJobRoute)
Router.use('/jobs', jobRoute)
Router.use('/jobs', learningPathRoute)
Router.use('/job-categories', jobCategoryRoute)
Router.use('/forum', forumRoute)
Router.use('/mentors', mentorRoute)
Router.use('/mentor-sessions', mentorSessionRoute)
Router.use('/worker-sponsorships', workerSponsorshipRoute)
Router.use('/organizations', organizationRoute)
Router.use('/funding-configs', fundingConfigRoute)
Router.use('/payments', paymentRoute)
Router.use('/paymentTest', paymentTestRoute)
Router.use('/isa-repayments', isaRepaymentRoute)
Router.use('/learning-records', learningRecordRoute)
Router.use('/certificates', certificateRoute)
Router.use('/placements', placementRoute)
Router.use('/partnerships', partnershipRoute)
Router.use('/course-sponsorships', courseSponsorshipRoute)
Router.use('/lesson-progress', lessonProgressRoute)
Router.use('/video-notes', videoNoteRoute)
Router.use('/recommendation-feedback', recommendationFeedbackRoute)
Router.use('/contacts', contactRoute)
Router.use('/events', eventRoute)
Router.use('/map', mapRoute)
Router.use('/admin-analytics', adminAnalyticsRoute)

// Recruitment Module
Router.use('/recruitments', workerApplicationRoute)
Router.use('/enterprise/jobs', recruitmentJobRoute)
Router.use('/admin/jobs', adminJobRoute)
Router.use('/jobs', publicJobRoute)
Router.use('/enterprise/applications', enterpriseApplicationRoute)
Router.use('/enterprise/interviews', interviewRoute)
Router.use('/my/interviews', workerInterviewRoute)
Router.use('/enterprise/offers', offerRoute)
Router.use('/my/offers', workerOfferRoute)

export const APIS_V1 = Router