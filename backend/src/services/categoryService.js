import { categoryModel } from '~/models/categoryModel'
import { courseModel } from '~/models/courseModel'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'

// ============ CREATE CATEGORY ============
const createCategory = async (data) => {
  try {
    const categoryData = {
      name: data.name,
      description: data.description || null,
      icon: data.icon || null,
      order: data.order || 0,
      status: data.status || 'approved',
      isActive: data.isActive !== undefined ? data.isActive : true,
      isFeatured: data.isFeatured || false
    }

    const result = await categoryModel.createNew(categoryData)
    const category = await categoryModel.findOneById(result.insertedId)

    return category
  } catch (error) { throw error }
}

// ============ GET ALL CATEGORIES ============
const getAllCategories = async (includeInactive = false) => {
  try {
    const categories = await categoryModel.findAll(includeInactive)
    return categories
  } catch (error) { throw error }
}


// ============ GET CATEGORY BY ID ============
const getCategoryById = async (categoryId) => {
  try {
    const category = await categoryModel.findOneById(categoryId)
    if (!category) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Danh mục không tồn tại!')
    }
    return category
  } catch (error) { throw error }
}

// ============ GET CATEGORY BY SLUG ============
const getCategoryBySlug = async (slug) => {
  try {
    const category = await categoryModel.findBySlug(slug)
    if (!category) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Danh mục không tồn tại!')
    }
    return category
  } catch (error) { throw error }
}


// ============ GET FEATURED CATEGORIES ============
const getFeaturedCategories = async () => {
  try {
    const categories = await categoryModel.findFeatured()
    return categories
  } catch (error) { throw error }
}

// ============ UPDATE CATEGORY ============
const updateCategory = async (categoryId, data) => {
  try {
    const category = await categoryModel.findOneById(categoryId)
    if (!category) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Danh mục không tồn tại!')
    }


    const updateData = { ...data }
    delete updateData.courseCount

    const updatedCategory = await categoryModel.update(categoryId, updateData)

    console.log(`Category ${categoryId} updated`)

    return updatedCategory
  } catch (error) { throw error }
}

// ============ DELETE CATEGORY ============
const deleteCategory = async (categoryId) => {
  try {
    const category = await categoryModel.findOneById(categoryId)
    if (!category) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Danh mục không tồn tại!')
    }

    const coursesInCategory = await courseModel.findByCategory(categoryId, 0, 1)
    if (coursesInCategory.totalCourses > 0) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        `Danh mục này đang có ${coursesInCategory.totalCourses} khóa học. Vui lòng chuyển khóa học sang danh mục khác trước!`
      )
    }


    await categoryModel.deleteCategory(categoryId)

    console.log(`Category ${categoryId} deleted`)

    return true
  } catch (error) { throw error }
}

// ============ REORDER CATEGORIES ============
const reorderCategories = async (categoryOrders) => {
  try {
    for (const item of categoryOrders) {
      const category = await categoryModel.findOneById(item.id)
      if (!category) {
        throw new ApiError(StatusCodes.BAD_REQUEST, `Danh mục ${item.id} không tồn tại!`)
      }
    }

    await categoryModel.reorder(categoryOrders)

    return true
  } catch (error) { throw error }
}

// ============ UPDATE COURSE COUNT ============
const updateCourseCount = async (categoryId, delta = 1) => {
  try {
    const category = await categoryModel.findOneById(categoryId)
    if (!category) {
      throw new Error('Category not found')
    }

    const updatedCategory = await categoryModel.updateCourseCount(categoryId, delta)

    return updatedCategory
  } catch (error) { throw error }
}

export const categoryService = {
  // Create
  createCategory,

  // Read
  getAllCategories,
  getCategoryById,
  getCategoryBySlug,
  getFeaturedCategories,

  // Update
  updateCategory,
  reorderCategories,
  updateCourseCount,

  // Delete
  deleteCategory
}
