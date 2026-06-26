import Joi from 'joi'
import { GET_DB } from '~/config/mongodb'
import { ObjectId } from 'mongodb'

const CAMPAIGN_COLLECTION_NAME = 'campaigns'
const CAMPAIGN_COLLECTION_SCHEMA = Joi.object({
  workerId: Joi.string().pattern(/^[a-f\d]{24}$/i).required(),
  ngoId: Joi.string().pattern(/^[a-f\d]{24}$/i).required(),
  
  title: Joi.string().required().min(10).max(200).trim().strict(),
  description: Joi.string().required(),
  
  targetAmount: Joi.number().required().min(100000),
  raisedAmount: Joi.number().default(0),
  
  status: Joi.string().valid('pending_ngo', 'rejected_ngo', 'funding', 'funded', 'disbursing', 'completed', 'cancelled').default('pending_ngo'),
  
  images: Joi.array().items(Joi.string()).default([]),
  
  deadline: Joi.date().timestamp('javascript').required(),
  
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await CAMPAIGN_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false, stripUnknown: true })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    validData.workerId = new ObjectId(String(validData.workerId))
    validData.ngoId = new ObjectId(String(validData.ngoId))
    const createdCampaign = await GET_DB().collection(CAMPAIGN_COLLECTION_NAME).insertOne(validData)
    return createdCampaign
  } catch (error) { throw new Error(error.message) }
}

const findOneById = async (id) => {
  try {
    const result = await GET_DB().collection(CAMPAIGN_COLLECTION_NAME).findOne({ _id: new ObjectId(String(id)) })
    return result
  } catch (error) { throw new Error(error.message) }
}

const update = async (campaignId, updateData) => {
  try {
    Object.keys(updateData).forEach(fieldName => {
      if (['_id', 'createdAt'].includes(fieldName)) {
        delete updateData[fieldName]
      }
    })

    if (updateData.workerId) updateData.workerId = new ObjectId(String(updateData.workerId))
    if (updateData.ngoId) updateData.ngoId = new ObjectId(String(updateData.ngoId))

    updateData.updatedAt = Date.now()

    const result = await GET_DB().collection(CAMPAIGN_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(String(campaignId)) },
      { $set: updateData },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) { throw new Error(error.message) }
}

const getCampaigns = async (skip = 0, limit = 10, filters = {}) => {
  try {
    const query = {
      _destroy: { $ne: true },
      ...filters
    }

    const campaigns = await GET_DB().collection(CAMPAIGN_COLLECTION_NAME)
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const total = await GET_DB().collection(CAMPAIGN_COLLECTION_NAME).countDocuments(query)

    return { campaigns, total }
  } catch (error) { throw new Error(error.message) }
}

export const campaignModel = {
  CAMPAIGN_COLLECTION_NAME,
  CAMPAIGN_COLLECTION_SCHEMA,
  createNew,
  findOneById,
  update,
  getCampaigns
}
