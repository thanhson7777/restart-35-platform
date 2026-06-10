import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { EMAIL_RULE, EMAIL_RULE_MESSAGE } from '~/utils/validator'

const CONTACT_COLLECTION_NAME = 'contacts'

const SUBJECTS = {
  TU_VAN: 'Tư vấn tuyển sinh',
  HOP_TAC: 'Hợp tác doanh nghiệp',
  HO_TRO: 'Hỗ trợ kỹ thuật',
  GOP_Y: 'Góp ý'
}

const CONTACT_COLLECTION_SCHEMA = Joi.object({
  name: Joi.string().required().min(2).max(100).trim(),
  email: Joi.string().required().pattern(EMAIL_RULE).message(EMAIL_RULE_MESSAGE),
  subject: Joi.string()
    .valid(...Object.values(SUBJECTS))
    .required(),
  message: Joi.string().required().min(10).max(2000).trim(),
  isReplied: Joi.boolean().default(false),
  createdAt: Joi.date().timestamp('javascript').default(Date.now)
})

const validateBeforeCreate = async (data) => {
  return await CONTACT_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false, stripUnknown: true })
}

const createNew = async (data) => {
  const validData = await validateBeforeCreate(data)
  const result = await GET_DB().collection(CONTACT_COLLECTION_NAME).insertOne(validData)
  return result
}

const findAll = async ({ filter = {}, page = 1, limit = 20 } = {}) => {
  const skip = (page - 1) * limit
  const query = { ...filter }

  const [contacts, total] = await Promise.all([
    GET_DB()
      .collection(CONTACT_COLLECTION_NAME)
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    GET_DB().collection(CONTACT_COLLECTION_NAME).countDocuments(query)
  ])

  return { contacts, total, page, limit, totalPages: Math.ceil(total / limit) }
}

const findOneById = async (id) => {
  return await GET_DB()
    .collection(CONTACT_COLLECTION_NAME)
    .findOne({ _id: new ObjectId(String(id)) })
}

const markReplied = async (id) => {
  return await GET_DB()
    .collection(CONTACT_COLLECTION_NAME)
    .updateOne(
      { _id: new ObjectId(String(id)) },
      { $set: { isReplied: true, repliedAt: Date.now() } }
    )
}

export const contactModel = {
  CONTACT_COLLECTION_NAME,
  SUBJECTS,
  createNew,
  findAll,
  findOneById,
  markReplied
}
