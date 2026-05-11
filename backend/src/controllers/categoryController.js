import { categoryService } from '~/services/categoryService'
import { StatusCodes } from 'http-status-codes'

// ============ CREATE CATEGORY (Admin) ============
const createCategory = async (req, res, next) => {
  try {
    const category = await categoryService.createCategory(req.body)

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Tạo danh mục thành công!',
      data: category
    })
  } catch (error) { next(error) }
}

// ============ GET ALL CATEGORIES ============
const getAllCategories = async (req, res, next) => {
  try {
    const includeInactive = req.query.includeInactive === 'true'
    const categories = await categoryService.getAllCategories(includeInactive)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách danh mục thành công!',
      data: categories
    })
  } catch (error) { next(error) }
}

// ============ GET CATEGORY TREE ============
const getCategoryTree = async (req, res, next) => {
  try {
    const tree = await categoryService.getCategoryTree()

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy cây danh mục thành công!',
      data: tree
    })
  } catch (error) { next(error) }
}

// ============ GET CATEGORY BY ID ============
const getCategoryById = async (req, res, next) => {
  try {
    const category = await categoryService.getCategoryById(req.params.id)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh mục thành công!',
      data: category
    })
  } catch (error) { next(error) }
}

// ============ GET CATEGORY BY SLUG ============
const getCategoryBySlug = async (req, res, next) => {
  try {
    const category = await categoryService.getCategoryBySlug(req.params.slug)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh mục thành công!',
      data: category
    })
  } catch (error) { next(error) }
}

// ============ GET SUBCATEGORIES ============
const getSubcategories = async (req, res, next) => {
  try {
    const { parentId } = req.query
    const subcategories = await categoryService.getSubcategories(parentId || null)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách danh mục con thành công!',
      data: subcategories
    })
  } catch (error) { next(error) }
}

// ============ GET FEATURED CATEGORIES ============
const getFeaturedCategories = async (req, res, next) => {
  try {
    const categories = await categoryService.getFeaturedCategories()

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh mục nổi bật thành công!',
      data: categories
    })
  } catch (error) { next(error) }
}

// ============ UPDATE CATEGORY (Admin) ============
const updateCategory = async (req, res, next) => {
  try {
    const category = await categoryService.updateCategory(req.params.id, req.body)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cập nhật danh mục thành công!',
      data: category
    })
  } catch (error) { next(error) }
}

// ============ DELETE CATEGORY (Admin) ============
const deleteCategory = async (req, res, next) => {
  try {
    await categoryService.deleteCategory(req.params.id)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Xóa danh mục thành công!'
    })
  } catch (error) { next(error) }
}

// ============ REORDER CATEGORIES (Admin) ============
const reorderCategories = async (req, res, next) => {
  try {
    const { categories } = req.body
    await categoryService.reorderCategories(categories)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Sắp xếp thứ tự danh mục thành công!'
    })
  } catch (error) { next(error) }
}

export const categoryController = {
  // Public
  getAllCategories,
  getCategoryTree,
  getCategoryById,
  getCategoryBySlug,
  getSubcategories,
  getFeaturedCategories,

  // Admin
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories
}
