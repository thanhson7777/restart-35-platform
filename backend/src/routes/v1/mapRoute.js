import express from 'express'
import { mapController } from '~/controllers/mapController'

const Router = express.Router()

Router.get('/opportunities', mapController.getMapOpportunities)

export const mapRoute = Router
