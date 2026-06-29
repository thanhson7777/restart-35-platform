import express from 'express'
import { courseSponsorshipController } from '~/controllers/courseSponsorshipController'
import { courseSponsorshipValidation } from '~/validations/courseSponsorshipValidation'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

Router.post(
  '/',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedEnterpriseOrNGOOrAdmin,
  courseSponsorshipValidation.createCourseSponsorship,
  courseSponsorshipController.createCourseSponsorship
)

Router.get(
  '/',
  authMiddleware.isAuthorizedOptional,
  courseSponsorshipValidation.queryCourseSponsorships,
  courseSponsorshipController.getCourseSponsorships
)

Router.get(
  '/:id',
  authMiddleware.isAuthorized,
  courseSponsorshipValidation.checkId,
  courseSponsorshipController.getCourseSponsorshipById
)

Router.put(
  '/:id',
  authMiddleware.isAuthorized,
  courseSponsorshipValidation.checkId,
  courseSponsorshipValidation.updateCourseSponsorship,
  courseSponsorshipController.updateCourseSponsorship
)

Router.put(
  '/:id/approve',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedAdmin,
  courseSponsorshipValidation.checkId,
  courseSponsorshipValidation.approveCourseSponsorship,
  courseSponsorshipController.approveCourseSponsorship
)

Router.put(
  '/:id/pause',
  authMiddleware.isAuthorized,
  courseSponsorshipValidation.checkId,
  courseSponsorshipValidation.pauseCourseSponsorship,
  courseSponsorshipController.pauseCourseSponsorship
)

Router.put(
  '/:id/resume',
  authMiddleware.isAuthorized,
  courseSponsorshipValidation.checkId,
  courseSponsorshipValidation.resumeCourseSponsorship,
  courseSponsorshipController.resumeCourseSponsorship
)

Router.put(
  '/:id/link-course',
  authMiddleware.isAuthorized,
  courseSponsorshipValidation.checkId,
  courseSponsorshipValidation.linkCourse,
  courseSponsorshipController.linkCourse
)

Router.put(
  '/:id/unlink-course',
  authMiddleware.isAuthorized,
  courseSponsorshipValidation.checkId,
  courseSponsorshipValidation.unlinkCourse,
  courseSponsorshipController.unlinkCourse
)

Router.get(
  '/:id/learners',
  authMiddleware.isAuthorized,
  courseSponsorshipValidation.checkId,
  courseSponsorshipController.getCourseSponsorshipLearners
)

Router.put(
  '/:id/learners/:enrollmentId/decision',
  authMiddleware.isAuthorized,
  courseSponsorshipController.decideSponsorshipLearner
)

Router.get(
  '/:id/stats',
  authMiddleware.isAuthorized,
  courseSponsorshipValidation.checkId,
  courseSponsorshipController.getCourseSponsorshipStats
)

export const courseSponsorshipRoute = Router
