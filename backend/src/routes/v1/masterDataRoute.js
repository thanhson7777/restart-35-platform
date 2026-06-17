import express from 'express'
import { masterDataController } from '~/controllers/masterDataController'
import { authMiddleware } from '~/middlewares/authMiddleware'

const router = express.Router()

// Public route to get master data by type for dropdowns
router.get('/', masterDataController.getByType)

// Admin routes
router.use(authMiddleware.isAuthorizedAdmin)

router.get('/admin/all', masterDataController.getAllForAdmin)
router.post('/', masterDataController.createNew)
router.put('/:id', masterDataController.update)
router.delete('/:id', masterDataController.deleteItem)

export const masterDataRoute = router
