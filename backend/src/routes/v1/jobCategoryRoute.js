import express from 'express'
import { jobCategoryController } from '~/controllers/jobCategoryController'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

Router.route('/')
  .get(jobCategoryController.getAll)
  .post(
    authMiddleware.isAuthorizedEnterpriseOrAdmin,
    jobCategoryController.createNew
  )

Router.route('/:id')
  .put(
    authMiddleware.isAuthorized,
    authMiddleware.isAuthorizedAdmin,
    jobCategoryController.update
  )
  .delete(
    authMiddleware.isAuthorized,
    authMiddleware.isAuthorizedAdmin,
    jobCategoryController.deleteItem
  )

export const jobCategoryRoute = Router
