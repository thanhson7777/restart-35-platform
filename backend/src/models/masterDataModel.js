import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'

const MASTER_DATA_COLLECTION_NAME = 'master_data'

const MASTER_DATA_COLLECTION_SCHEMA = Joi.object({
  type: Joi.string().valid('industry', 'training_category', 'ngo_focus').required(),
  value: Joi.string().required().trim().max(100),
  label: Joi.string().required().trim().max(100),
  description: Joi.string().allow(null, '').max(500),
  order: Joi.number().integer().min(0).default(0),

  isActive: Joi.boolean().default(true),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(Date.now),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await MASTER_DATA_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
    stripUnknown: true
  })
}

// ============ HELPER: Generate slug/value from label ============
const generateValue = (label) => {
  return label
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
const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)

    if (!validData.value) {
      validData.value = generateValue(validData.label)
    }

    // Check duplicate value within the same type
    const exists = await GET_DB().collection(MASTER_DATA_COLLECTION_NAME).findOne({
      type: validData.type,
      value: validData.value,
      _destroy: { $ne: true }
    })

    if (exists) {
      throw new Error(`Giá trị '${validData.value}' đã tồn tại trong danh mục ${validData.type}`)
    }

    const createdResult = await GET_DB().collection(MASTER_DATA_COLLECTION_NAME).insertOne(validData)
    return await findOneById(createdResult.insertedId.toString())
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ READ ============
const findOneById = async (id) => {
  try {
    return await GET_DB().collection(MASTER_DATA_COLLECTION_NAME).findOne({
      _id: new ObjectId(id),
      _destroy: { $ne: true }
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const findByType = async (type, includeInactive = false) => {
  try {
    const query = { 
      type: type,
      _destroy: { $ne: true } 
    }
    if (!includeInactive) {
      query.isActive = true
    }

    return await GET_DB().collection(MASTER_DATA_COLLECTION_NAME)
      .find(query)
      .sort({ order: 1 })
      .toArray()
  } catch (error) {
    throw new Error(error.message)
  }
}

const findAllForAdmin = async () => {
  try {
    return await GET_DB().collection(MASTER_DATA_COLLECTION_NAME)
      .find({ _destroy: { $ne: true } })
      .sort({ type: 1, order: 1 })
      .toArray()
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ UPDATE ============
const update = async (id, data) => {
  try {
    const objectId = new ObjectId(id)

    if (data.label && !data.value) {
      data.value = generateValue(data.label)
    }

    if (data.value && data.type) {
      const exists = await GET_DB().collection(MASTER_DATA_COLLECTION_NAME).findOne({
        type: data.type,
        value: data.value,
        _id: { $ne: objectId },
        _destroy: { $ne: true }
      })

      if (exists) {
        throw new Error(`Giá trị '${data.value}' đã tồn tại trong danh mục ${data.type}`)
      }
    }

    // eslint-disable-next-line no-unused-vars
    const { _id, ...updateData } = data

    const result = await GET_DB().collection(MASTER_DATA_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId, _destroy: { $ne: true } },
      { $set: { ...updateData, updatedAt: Date.now() } },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ DELETE ============
const deleteItem = async (id) => {
  try {
    const objectId = new ObjectId(id)

    return await GET_DB().collection(MASTER_DATA_COLLECTION_NAME).updateOne(
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

export const masterDataModel = {
  MASTER_DATA_COLLECTION_NAME,
  MASTER_DATA_COLLECTION_SCHEMA,
  createNew,
  findOneById,
  findByType,
  findAllForAdmin,
  update,
  deleteItem
}
