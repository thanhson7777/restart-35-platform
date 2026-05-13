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
      parentId: data.parentId || null,
      level: data.parentId ? 1 : 0,
      order: data.order || 0,
      isActive: data.isActive !== undefined ? data.isActive : true,
      isFeatured: data.isFeatured || false
    }

    if (data.parentId) {
      const parent = await categoryModel.findOneById(data.parentId)
      if (!parent) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Danh mục cha không tồn tại!')
      }
      if (parent.level >= 2) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Chỉ hỗ trợ tối đa 2 cấp danh mục!')
      }
      categoryData.level = parent.level + 1
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

// ============ GET CATEGORY TREE ============
const getCategoryTree = async () => {
  try {
    const categories = await categoryModel.findAll(true)
    const tree = categoryModel.buildTree(categories)
    return tree
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

// ============ GET SUBCATEGORIES ============
const getSubcategories = async (parentId) => {
  try {
    if (parentId) {
      const parent = await categoryModel.findOneById(parentId)
      if (!parent) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Danh mục cha không tồn tại!')
      }
    }

    const subcategories = await categoryModel.findByParent(parentId)
    return subcategories
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

    if (data.parentId !== undefined) {
      if (data.parentId === categoryId) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Danh mục không thể là cha của chính nó!')
      }

      if (data.parentId) {
        const newParent = await categoryModel.findOneById(data.parentId)
        if (!newParent) {
          throw new ApiError(StatusCodes.BAD_REQUEST, 'Danh mục cha không tồn tại!')
        }
        if (newParent.level >= 2) {
          throw new ApiError(StatusCodes.BAD_REQUEST, 'Chỉ hỗ trợ tối đa 2 cấp danh mục!')
        }
        data.level = newParent.level + 1
      } else {
        data.level = 0
        data.parentId = null
      }
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

    const children = await categoryModel.findByParent(categoryId)
    if (children.length > 0) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        `Danh mục này đang có ${children.length} danh mục con. Vui lòng xóa danh mục con trước!`
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

    if (category.parentId) {
      await categoryModel.updateCourseCount(category.parentId, delta)
    }

    return updatedCategory
  } catch (error) { throw error }
}

export const categoryService = {
  // Create
  createCategory,

  // Read
  getAllCategories,
  getCategoryTree,
  getCategoryById,
  getCategoryBySlug,
  getSubcategories,
  getFeaturedCategories,

  // Update
  updateCategory,
  reorderCategories,
  updateCourseCount,

  // Delete
  deleteCategory
}
