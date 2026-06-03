import Joi from 'joi'
import { GET_DB } from '~/config/mongodb'
import { ObjectId } from 'mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validator'
import { ISA_REPAYMENT_STATUS } from '~/utils/constants'

const ISA_REPAYMENT_COLLECTION_NAME = 'isa_repayments'
const ISA_REPAYMENT_COLLECTION_SCHEMA = Joi.object({
  enrollmentId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  userId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  courseId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  percentage: Joi.number().min(0).max(100).required()
    .messages({
      'number.min': 'Tỷ lệ phần trăm không được nhỏ hơn 0',
      'number.max': 'Tỷ lệ phần trăm không được lớn hơn 100',
      'any.required': 'Tỷ lệ phần trăm là bắt buộc'
    }),
  incomeThreshold: Joi.number().integer().min(0).default(0),
  maxCap: Joi.number().integer().min(0).default(0),
  totalPaidAmount: Joi.number().integer().min(0).default(0),
  repaymentPeriod: Joi.object({
    startMonth: Joi.date().timestamp('javascript').required(),
    endMonth: Joi.date().timestamp('javascript').required(),
    currentMonth: Joi.number().integer().min(0).default(0)
  }).required(),
  monthlyRecords: Joi.array().items(
    Joi.object({
      month: Joi.number().integer().required(),
      year: Joi.number().integer().required(),
      income: Joi.number().integer().min(0).default(0),
      paymentAmount: Joi.number().integer().min(0).default(0),
      status: Joi.string()
        .valid(...Object.values(ISA_REPAYMENT_STATUS))
        .default(ISA_REPAYMENT_STATUS.PENDING),
      paidDate: Joi.date().timestamp('javascript').allow(null),
      incomeProof: Joi.string().allow('', null)
    })
  ).default([]),
  status: Joi.string()
    .valid('pending', 'active', 'completed', 'capped', 'waived')
    .default('pending'),
  waiverReason: Joi.string().max(1000).allow('', null),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await ISA_REPAYMENT_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false, stripUnknown: true })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const result = await GET_DB().collection(ISA_REPAYMENT_COLLECTION_NAME).insertOne(validData)
    return result
  } catch (error) {
    throw error
  }
}

const findOneById = async (id) => {
  try {
    const result = await GET_DB().collection(ISA_REPAYMENT_COLLECTION_NAME).findOne({
      _id: new ObjectId(String(id)),
      _destroy: false
    })
    return result
  } catch (error) {
    throw error
  }
}

const findByEnrollment = async (enrollmentId) => {
  try {
    const result = await GET_DB().collection(ISA_REPAYMENT_COLLECTION_NAME).findOne({
      enrollmentId: String(enrollmentId),
      _destroy: false
    })
    return result
  } catch (error) {
    throw error
  }
}

const findByPaginate = async (matchCondition, skip, limit) => {
  try {
    const db = await GET_DB()
    const [records, total] = await Promise.all([
      db.collection(ISA_REPAYMENT_COLLECTION_NAME)
        .find(matchCondition, { projection: { _destroy: 0 } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection(ISA_REPAYMENT_COLLECTION_NAME).countDocuments(matchCondition)
    ])
    return { records, total }
  } catch (error) {
    throw error
  }
}

const update = async (id, updateData) => {
  try {
    const result = await GET_DB().collection(ISA_REPAYMENT_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(String(id)), _destroy: false },
      { $set: { ...updateData, updatedAt: Date.now() } },
      { returnDocument: 'after', projection: { _destroy: 0 } }
    )
    return result
  } catch (error) {
    throw error
  }
}

const addMonthlyRecord = async (id, record) => {
  try {
    const result = await GET_DB().collection(ISA_REPAYMENT_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(String(id)), _destroy: false },
      {
        $push: { monthlyRecords: record },
        $inc: { 'repaymentPeriod.currentMonth': 1 },
        $set: { updatedAt: Date.now() }
      },
      { returnDocument: 'after', projection: { _destroy: 0 } }
    )
    return result
  } catch (error) {
    throw error
  }
}

const updateMonthlyRecord = async (id, month, year, updateData) => {
  try {
    const result = await GET_DB().collection(ISA_REPAYMENT_COLLECTION_NAME).findOneAndUpdate(
      {
        _id: new ObjectId(String(id)),
        _destroy: false,
        'monthlyRecords.month': month,
        'monthlyRecords.year': year
      },
      {
        $set: {
          'monthlyRecords.$.income': updateData.income,
          'monthlyRecords.$.paymentAmount': updateData.paymentAmount,
          'monthlyRecords.$.status': updateData.status,
          'monthlyRecords.$.paidDate': updateData.paidDate || null,
          'monthlyRecords.$.incomeProof': updateData.incomeProof || null,
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

const addPayment = async (id, amount) => {
  try {
    const result = await GET_DB().collection(ISA_REPAYMENT_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(String(id)), _destroy: false },
      {
        $inc: { totalPaidAmount: amount },
        $set: { updatedAt: Date.now() }
      },
      { returnDocument: 'after', projection: { _destroy: 0 } }
    )
    return result
  } catch (error) {
    throw error
  }
}

const softDelete = async (id) => {
  try {
    const result = await GET_DB().collection(ISA_REPAYMENT_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(String(id)), _destroy: false },
      { $set: { _destroy: true, updatedAt: Date.now() } },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) {
    throw error
  }
}

export const isaRepaymentModel = {
  ISA_REPAYMENT_COLLECTION_NAME,
  ISA_REPAYMENT_COLLECTION_SCHEMA,
  ISA_REPAYMENT_STATUS,
  validateBeforeCreate,
  createNew,
  findOneById,
  findByEnrollment,
  findByPaginate,
  update,
  addMonthlyRecord,
  updateMonthlyRecord,
  addPayment,
  softDelete
}
