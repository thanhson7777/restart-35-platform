import Joi from 'joi'
import { GET_DB } from '~/config/mongodb'
import { ObjectId } from 'mongodb'

const MILESTONE_COLLECTION_NAME = 'campaign_milestones'
const MILESTONE_COLLECTION_SCHEMA = Joi.object({
  campaignId: Joi.string().pattern(/^[a-f\d]{24}$/i).required(),
  ngoId: Joi.string().pattern(/^[a-f\d]{24}$/i).required(),
  
  title: Joi.string().required().min(5).max(100).trim().strict(),
  description: Joi.string().required(),
  
  disbursedAmount: Joi.number().default(0),
  proofImages: Joi.array().items(Joi.string()).default([]),
  
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await MILESTONE_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false, stripUnknown: true })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    validData.campaignId = new ObjectId(String(validData.campaignId))
    validData.ngoId = new ObjectId(String(validData.ngoId))
    const createdMilestone = await GET_DB().collection(MILESTONE_COLLECTION_NAME).insertOne(validData)
    return createdMilestone
  } catch (error) { throw new Error(error.message) }
}

const getMilestonesByCampaign = async (campaignId) => {
  try {
    const query = {
      campaignId: new ObjectId(String(campaignId)),
      _destroy: { $ne: true }
    }

    const milestones = await GET_DB().collection(MILESTONE_COLLECTION_NAME)
      .find(query)
      .sort({ createdAt: 1 })
      .toArray()

    return milestones
  } catch (error) { throw new Error(error.message) }
}

export const milestoneModel = {
  MILESTONE_COLLECTION_NAME,
  MILESTONE_COLLECTION_SCHEMA,
  createNew,
  getMilestonesByCampaign
}
