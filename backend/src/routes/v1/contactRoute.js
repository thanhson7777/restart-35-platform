// backend/src/routes/v1/contactRoute.js

import express from 'express'
import { contactController } from '~/controllers/contactController'

const Router = express.Router()

Router.post('/', contactController.createContact)

export { Router as contactRoute }
