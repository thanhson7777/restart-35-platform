import Joi from 'joi'
import { GET_DB } from '~/config/mongodb'
import { ObjectId } from 'mongodb'

const TRANSACTION_COLLECTION_NAME = 'transactions'

const TRANSACTION_COLLECTION_SCHEMA = Joi.object({
  walletId: Joi.string().required().pattern(/^[a-f\d]{24}$/i),
  userId: Joi.string().required().pattern(/^[a-f\d]{24}$/i),
  type: Joi.string().valid('DEPOSIT', 'WITHDRAW', 'RESERVE', 'DISBURSE', 'REFUND').required(),
  amount: Joi.number().min(0).required(),
  description: Joi.string().allow(null, ''),
  referenceId: Joi.string().allow(null, ''), // VD: vnpay_txn_id hoặc courseSponsorship_id
  referenceModel: Joi.string().allow(null, ''), // 'Sponsorship', 'VNPay'
  status: Joi.string().valid('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED').default('PENDING'),
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null)
})

const validateBeforeCreate = async (data) => {
  return await TRANSACTION_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false, stripUnknown: true })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const result = await GET_DB().collection(TRANSACTION_COLLECTION_NAME).insertOne(validData)
    return await findOneById(result.insertedId)
  } catch (error) { throw error }
}

const findOneById = async (id) => {
  try {
    const result = await GET_DB().collection(TRANSACTION_COLLECTION_NAME).findOne({ _id: new ObjectId(String(id)) })
    return result
  } catch (error) { throw error }
}

const findByWalletId = async (walletId, limit = 50) => {
  try {
    const result = await GET_DB().collection(TRANSACTION_COLLECTION_NAME)
      .find({ walletId: String(walletId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()
    return result
  } catch (error) { throw error }
}

const findByReference = async (referenceId, type) => {
  try {
    return await GET_DB().collection(TRANSACTION_COLLECTION_NAME).findOne({
      referenceId: String(referenceId),
      type: type
    })
  } catch (error) { throw error }
}

const updateStatus = async (transactionId, newStatus) => {
  try {
    const result = await GET_DB().collection(TRANSACTION_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(String(transactionId)) },
      { 
        $set: { 
          status: newStatus,
          updatedAt: Date.now() 
        } 
      },
      { returnDocument: 'after' }
    )
    return result.value || result
  } catch (error) { throw error }
}

export const transactionModel = {
  TRANSACTION_COLLECTION_NAME,
  TRANSACTION_COLLECTION_SCHEMA,
  createNew,
  findOneById,
  findByWalletId,
  findByReference,
  updateStatus
}
