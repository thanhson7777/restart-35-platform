import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'

const CATEGORY_COLLECTION_NAME = 'categories'

const CATEGORY_COLLECTION_SCHEMA = Joi.object({
  name: Joi.string().required().trim().max(100),
  slug: Joi.string().required().trim().lowercase().max(100),
  description: Joi.string().allow(null, '').max(500),
  icon: Joi.string().allow(null, '').max(255),

  parentId: Joi.string().allow(null),
  level: Joi.number().integer().min(0).max(2).default(0),
  order: Joi.number().integer().min(0).default(0),

  courseCount: Joi.number().integer().min(0).default(0),

  isActive: Joi.boolean().default(true),
  isFeatured: Joi.boolean().default(false),

  createdAt: Joi.date().timestamp('javascript').default(Date.now()),
  updatedAt: Joi.date().timestamp('javascript').default(Date.now()),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await CATEGORY_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
    stripUnknown: true
  })
}

// ============ HELPER: Generate slug from name ============
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

// ============ CREATE ============
const createNew = async (data, skipValidation = false) => {
  try {
    const validData = skipValidation
      ? data
      : await validateBeforeCreate(data)

    if (!validData.slug) {
      validData.slug = generateSlug(validData.name)
    }

    const slugExists = await GET_DB().collection(CATEGORY_COLLECTION_NAME).findOne({
      slug: validData.slug,
      _destroy: false
    })

    if (slugExists) {
      validData.slug = `${validData.slug}-${Date.now()}`
    }

    return await GET_DB().collection(CATEGORY_COLLECTION_NAME).insertOne(validData)
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ READ ============
const findOneById = async (categoryId) => {
  try {
    const objectId = new ObjectId(categoryId)
    return await GET_DB().collection(CATEGORY_COLLECTION_NAME).findOne({
      _id: objectId,
      _destroy: false
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const findBySlug = async (slug) => {
  try {
    return await GET_DB().collection(CATEGORY_COLLECTION_NAME).findOne({
      slug: slug,
      _destroy: false
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const findAll = async (includeInactive = false) => {
  try {
    const query = { _destroy: false }
    if (!includeInactive) {
      query.isActive = true
    }

    return await GET_DB().collection(CATEGORY_COLLECTION_NAME)
      .find(query)
      .sort({ level: 1, order: 1 })
      .toArray()
  } catch (error) {
    throw new Error(error.message)
  }
}

const findRootCategories = async () => {
  try {
    return await GET_DB().collection(CATEGORY_COLLECTION_NAME)
      .find({
        parentId: null,
        isActive: true,
        _destroy: false
      })
      .sort({ order: 1 })
      .toArray()
  } catch (error) {
    throw new Error(error.message)
  }
}

const findByParent = async (parentId) => {
  try {
    return await GET_DB().collection(CATEGORY_COLLECTION_NAME)
      .find({
        parentId: parentId,
        isActive: true,
        _destroy: false
      })
      .sort({ order: 1 })
      .toArray()
  } catch (error) {
    throw new Error(error.message)
  }
}

const findFeatured = async () => {
  try {
    return await GET_DB().collection(CATEGORY_COLLECTION_NAME)
      .find({
        isFeatured: true,
        isActive: true,
        _destroy: false
      })
      .sort({ order: 1 })
      .toArray()
  } catch (error) {
    throw new Error(error.message)
  }
}

const findAllForAdmin = async () => {
  try {
    return await GET_DB().collection(CATEGORY_COLLECTION_NAME)
      .find({ _destroy: false })
      .sort({ level: 1, order: 1 })
      .toArray()
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ BUILD TREE ============
const buildTree = (categories, parentId = null) => {
  const tree = []
  categories.forEach(category => {
    if (category.parentId === parentId ||
        (parentId === null && category.parentId === null) ||
        (parentId === null && !category.parentId)) {
      const children = buildTree(categories, category._id.toString())
      const node = {
        _id: category._id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        icon: category.icon,
        level: category.level,
        order: category.order,
        courseCount: category.courseCount,
        isActive: category.isActive,
        isFeatured: category.isFeatured,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt
      }
      if (children.length > 0) {
        node.children = children
      }
      tree.push(node)
    }
  })
  return tree.sort((a, b) => a.order - b.order)
}

// ============ UPDATE ============
const update = async (categoryId, data) => {
  try {
    const objectId = new ObjectId(categoryId)

    if (data.name && !data.slug) {
      data.slug = generateSlug(data.name)
    }

    const slugExists = await GET_DB().collection(CATEGORY_COLLECTION_NAME).findOne({
      slug: data.slug,
      _id: { $ne: objectId },
      _destroy: false
    })

    if (slugExists) {
      data.slug = `${data.slug}-${Date.now()}`
    }

    const result = await GET_DB().collection(CATEGORY_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      { $set: { ...data, updatedAt: Date.now() } },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const updateCourseCount = async (categoryId, delta = 1) => {
  try {
    const objectId = new ObjectId(categoryId)
    return await GET_DB().collection(CATEGORY_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $inc: { courseCount: delta },
        $set: { updatedAt: Date.now() }
      },
      { returnDocument: 'after' }
    )
  } catch (error) {
    throw new Error(error.message)
  }
}

const reorder = async (categoryOrders) => {
  try {
    const bulkOps = categoryOrders.map((item, index) => ({
      updateOne: {
        filter: { _id: new ObjectId(item.id) },
        update: {
          $set: {
            order: index,
            updatedAt: Date.now()
          }
        }
      }
    }))

    return await GET_DB().collection(CATEGORY_COLLECTION_NAME).bulkWrite(bulkOps)
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ DELETE ============
const deleteCategory = async (categoryId) => {
  try {
    const objectId = new ObjectId(categoryId)

    const hasChildren = await GET_DB().collection(CATEGORY_COLLECTION_NAME).findOne({
      parentId: categoryId,
      _destroy: false
    })

    if (hasChildren) {
      throw new Error('Không thể xóa danh mục có danh mục con!')
    }

    return await GET_DB().collection(CATEGORY_COLLECTION_NAME).updateOne(
      { _id: objectId },
      {
        $set: {
          _destroy: true,
          updatedAt: Date.now()
        }
      }
    )
  } catch (error) {
    throw new Error(error.message)
  }
}

export const categoryModel = {
  CATEGORY_COLLECTION_NAME,
  CATEGORY_COLLECTION_SCHEMA,

  // Helper
  generateSlug,

  // Create
  createNew,

  // Read
  findOneById,
  findBySlug,
  findAll,
  findRootCategories,
  findByParent,
  findFeatured,
  findAllForAdmin,

  // Tree
  buildTree,

  // Update
  update,
  updateCourseCount,
  reorder,

  // Delete
  deleteCategory
}
