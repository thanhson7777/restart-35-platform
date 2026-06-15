import { StatusCodes } from 'http-status-codes'
import { jobCategoryService } from '~/services/jobCategoryService'

const createNew = async (req, res, next) => {
  try {
    const createdCategory = await jobCategoryService.createNew(req.body)
    res.status(StatusCodes.CREATED).json({ success: true, data: createdCategory })
  } catch (error) {
    next(error)
  }
}

const getAll = async (req, res, next) => {
  try {
    const includeInactive = req.query.includeInactive === 'true'
    // Public API will default to includeInactive = false
    const categories = await jobCategoryService.getAll(includeInactive)
    res.status(StatusCodes.OK).json({ success: true, data: categories })
  } catch (error) {
    next(error)
  }
}

const update = async (req, res, next) => {
  try {
    const categoryId = req.params.id
    const updatedCategory = await jobCategoryService.update(categoryId, req.body)
    res.status(StatusCodes.OK).json({ success: true, data: updatedCategory })
  } catch (error) {
    next(error)
  }
}

const deleteItem = async (req, res, next) => {
  try {
    const categoryId = req.params.id
    await jobCategoryService.deleteItem(categoryId)
    res.status(StatusCodes.OK).json({ success: true, message: 'Deleted successfully' })
  } catch (error) {
    next(error)
  }
}

export const jobCategoryController = {
  createNew,
  getAll,
  update,
  deleteItem
}
