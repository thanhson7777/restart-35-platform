// backend/src/routes/v1/contactRoute.js

import express from 'express'
import { contactController } from '~/controllers/contactController'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

// User
Router.post('/', contactController.createContact)

// Admin
Router.get('/', authMiddleware.isAuthorizedAdmin, contactController.getContacts)
Router.patch('/:id/reply', authMiddleware.isAuthorizedAdmin, contactController.markReplied)

export { Router as contactRoute }
