import Joi from 'joi'
import { GET_DB } from '~/config/mongodb'
import { ObjectId } from 'mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validator'
import { PAYMENT_METHOD, PAYMENT_STATUS } from '~/utils/constants'

const PAYMENT_COLLECTION_NAME = 'payments'
const PAYMENT_COLLECTION_SCHEMA = Joi.object({
  enrollmentId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  userId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  courseId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  method: Joi.string()
    .valid(...Object.values(PAYMENT_METHOD))
    .required()
    .messages({
      'any.only': 'Phương thức thanh toán không hợp lệ',
      'any.required': 'Phương thức thanh toán là bắt buộc'
    }),
  amount: Joi.number().integer().min(0).required()
    .messages({
      'number.min': 'Số tiền không được nhỏ hơn 0',
      'any.required': 'Số tiền là bắt buộc'
    }),
  status: Joi.string()
    .valid(...Object.values(PAYMENT_STATUS))
    .default(PAYMENT_STATUS.PENDING),
  installments: Joi.array().items(
    Joi.object({
      installmentNumber: Joi.number().integer().required(),
      amount: Joi.number().integer().min(0).required(),
      dueDate: Joi.date().timestamp('javascript').allow(null),
      paidDate: Joi.date().timestamp('javascript').allow(null),
      status: Joi.string()
        .valid(...Object.values(PAYMENT_STATUS))
        .default(PAYMENT_STATUS.PENDING)
    })
  ).default([]),
  invoice: Joi.object({
    invoiceNumber: Joi.string().allow('', null),
    issuedDate: Joi.date().timestamp('javascript').allow(null),
    taxAmount: Joi.number().integer().min(0).default(0),
    totalAmount: Joi.number().integer().min(0).default(0)
  }).default(null),
  transactionId: Joi.string().allow('', null),
  qrUrl: Joi.string().allow('', null),
  notes: Joi.string().max(1000).allow('', null),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await PAYMENT_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false, stripUnknown: true })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const result = await GET_DB().collection(PAYMENT_COLLECTION_NAME).insertOne(validData)
    return result
  } catch (error) {
    throw error
  }
}

const findOneById = async (id) => {
  try {
    const result = await GET_DB().collection(PAYMENT_COLLECTION_NAME).findOne({
      _id: new ObjectId(String(id)),
      _destroy: { $ne: true }
    })
    return result
  } catch (error) {
    throw error
  }
}

const findByEnrollment = async (enrollmentId) => {
  try {
    const result = await GET_DB().collection(PAYMENT_COLLECTION_NAME)
      .find({ enrollmentId: String(enrollmentId), _destroy: { $ne: true } })
      .sort({ createdAt: -1 })
      .toArray()
    return result
  } catch (error) {
    throw error
  }
}

const findByPaginate = async (matchCondition, skip, limit) => {
  try {
    const db = await GET_DB()
    const [payments, total] = await Promise.all([
      db.collection(PAYMENT_COLLECTION_NAME)
        .find(matchCondition, { projection: { _destroy: 0 } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection(PAYMENT_COLLECTION_NAME).countDocuments(matchCondition)
    ])
    return { payments, total }
  } catch (error) {
    throw error
  }
}

const update = async (id, updateData) => {
  try {
    const result = await GET_DB().collection(PAYMENT_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(String(id)), _destroy: { $ne: true } },
      { $set: { ...updateData, updatedAt: Date.now() } },
      { returnDocument: 'after', projection: { _destroy: 0 } }
    )
    return result
  } catch (error) {
    throw error
  }
}

const updateStatus = async (id, status, transactionId) => {
  try {
    const updateData = { status }
    if (transactionId) updateData.transactionId = transactionId
    if (status === PAYMENT_STATUS.COMPLETED) updateData.completedAt = Date.now()

    const result = await GET_DB().collection(PAYMENT_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(String(id)), _destroy: { $ne: true } },
      { $set: { ...updateData, updatedAt: Date.now() } },
      { returnDocument: 'after', projection: { _destroy: 0 } }
    )
    return result
  } catch (error) {
    throw error
  }
}

const addInstallment = async (id, installment) => {
  try {
    const result = await GET_DB().collection(PAYMENT_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(String(id)), _destroy: { $ne: true } },
      {
        $push: { installments: installment },
        $set: { updatedAt: Date.now() }
      },
      { returnDocument: 'after', projection: { _destroy: 0 } }
    )
    return result
  } catch (error) {
    throw error
  }
}

const updateInvoice = async (id, invoiceData) => {
  try {
    const result = await GET_DB().collection(PAYMENT_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(String(id)), _destroy: { $ne: true } },
      {
        $set: {
          invoice: invoiceData,
          updatedAt: Date.now()
        }
      },
      { returnDocument: 'after', projection: { _destroy: 0 } }
    )
    return result
  } catch (error) {
    throw error
  }
}

const findByTransactionId = async (transactionId) => {
  try {
    const result = await GET_DB().collection(PAYMENT_COLLECTION_NAME).findOne({
      transactionId: String(transactionId),
      _destroy: { $ne: true }
    })
    return result
  } catch (error) {
    throw error
  }
}

const softDelete = async (id) => {
  try {
    const result = await GET_DB().collection(PAYMENT_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(String(id)), _destroy: { $ne: true } },
      { $set: { _destroy: true, updatedAt: Date.now() } },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) {
    throw error
  }
}

const getStatsByEnrollment = async (enrollmentId) => {
  try {
    const db = await GET_DB()
    const pipeline = [
      { $match: { enrollmentId: String(enrollmentId), _destroy: { $ne: true } } },
      {
        $group: {
          _id: '$status',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]
    const result = await db.collection(PAYMENT_COLLECTION_NAME).aggregate(pipeline).toArray()
    return result
  } catch (error) {
    throw error
  }
}

export const paymentModel = {
  PAYMENT_COLLECTION_NAME,
  PAYMENT_COLLECTION_SCHEMA,
  PAYMENT_STATUS,
  validateBeforeCreate,
  createNew,
  findOneById,
  findByEnrollment,
  findByPaginate,
  findByTransactionId,
  update,
  updateStatus,
  addInstallment,
  updateInvoice,
  softDelete,
  getStatsByEnrollment
}
