import express from 'express'
import { categoryValidation } from '~/validations/categoryValidation'
import { categoryController } from '~/controllers/categoryController'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

// ============ PUBLIC ROUTES ============

// Lấy tất cả danh mục
Router.get(
  '/',
  categoryController.getAllCategories
)

// Lấy cây danh mục (nested structure)
Router.get(
  '/tree',
  categoryController.getCategoryTree
)

// Lấy danh mục nổi bật
Router.get(
  '/featured',
  categoryController.getFeaturedCategories
)

// Lấy danh mục con
Router.get(
  '/subcategories',
  categoryValidation.queryCategories,
  categoryController.getSubcategories
)

// Lấy danh mục theo slug
Router.get(
  '/slug/:slug',
  categoryValidation.checkSlug,
  categoryController.getCategoryBySlug
)

// Lấy danh mục theo ID
Router.get(
  '/:id',
  categoryValidation.checkId,
  categoryController.getCategoryById
)

// ============ ADMIN ROUTES ============

// Tạo danh mục mới
Router.post(
  '/',
  authMiddleware.isAuthorizedAdmin,
  categoryValidation.createCategory,
  categoryController.createCategory
)

// Cập nhật danh mục
Router.put(
  '/:id',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedAdmin,
  categoryValidation.checkId,
  categoryValidation.updateCategory,
  categoryController.updateCategory
)

// Xóa danh mục
Router.delete(
  '/:id',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedAdmin,
  categoryValidation.checkId,
  categoryController.deleteCategory
)

// Sắp xếp thứ tự danh mục
Router.put(
  '/reorder',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedAdmin,
  categoryValidation.reorderCategories,
  categoryController.reorderCategories
)

export const categoryRoute = Router
