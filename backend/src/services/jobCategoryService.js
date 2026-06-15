import { jobCategoryModel } from '~/models/jobCategoryModel'

const createNew = async (reqBody) => {
  try {
    const createdResult = await jobCategoryModel.createNew(reqBody)
    const getNewCategory = await jobCategoryModel.findOneById(createdResult.insertedId)
    return getNewCategory
  } catch (error) {
    throw error
  }
}

const getAll = async (includeInactive = false) => {
  try {
    const categories = await jobCategoryModel.findAll(includeInactive)
    return categories
  } catch (error) {
    throw error
  }
}

const update = async (id, reqBody) => {
  try {
    const updatedCategory = await jobCategoryModel.update(id, reqBody)
    return updatedCategory
  } catch (error) {
    throw error
  }
}

const deleteItem = async (id) => {
  try {
    const result = await jobCategoryModel.deleteItem(id)
    return result
  } catch (error) {
    throw error
  }
}

export const jobCategoryService = {
  createNew,
  getAll,
  update,
  deleteItem
}
