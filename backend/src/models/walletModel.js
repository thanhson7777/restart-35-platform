import Joi from 'joi'
import { GET_DB } from '~/config/mongodb'
import { ObjectId } from 'mongodb'

const WALLET_COLLECTION_NAME = 'wallets'

const WALLET_COLLECTION_SCHEMA = Joi.object({
  userId: Joi.string().required().pattern(/^[a-f\d]{24}$/i), // ObjectId string
  availableBalance: Joi.number().min(0).default(0),
  lockedBalance: Joi.number().min(0).default(0),
  totalDisbursed: Joi.number().min(0).default(0),
  currency: Joi.string().default('VND'),
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null)
})

const validateBeforeCreate = async (data) => {
  return await WALLET_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false, stripUnknown: true })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const result = await GET_DB().collection(WALLET_COLLECTION_NAME).insertOne(validData)
    return await findOneById(result.insertedId)
  } catch (error) { throw error }
}

const findOneById = async (id) => {
  try {
    const result = await GET_DB().collection(WALLET_COLLECTION_NAME).findOne({ _id: new ObjectId(String(id)) })
    return result
  } catch (error) { throw error }
}

const findOneByUserId = async (userId) => {
  try {
    const result = await GET_DB().collection(WALLET_COLLECTION_NAME).findOne({ userId: String(userId) })
    return result
  } catch (error) { throw error }
}

const update = async (userId, updateData) => {
  try {
    updateData.updatedAt = Date.now()
    const result = await GET_DB().collection(WALLET_COLLECTION_NAME).findOneAndUpdate(
      { userId: String(userId) },
      { $set: updateData },
      { returnDocument: 'after' }
    )
    return result.value || result
  } catch (error) { throw error }
}

// Lấy ví hoặc tạo mới nếu chưa có
const findOrCreateByUserId = async (userId) => {
  try {
    let wallet = await findOneByUserId(userId)
    if (!wallet) {
      wallet = await createNew({ userId: String(userId) })
    }
    return wallet
  } catch (error) { throw error }
}

export const walletModel = {
  WALLET_COLLECTION_NAME,
  WALLET_COLLECTION_SCHEMA,
  createNew,
  findOneById,
  findOneByUserId,
  update,
  findOrCreateByUserId
}
