import Joi from 'joi'
import { GET_DB } from '~/config/mongodb'
import { ObjectId } from 'mongodb'

const DONATION_COLLECTION_NAME = 'campaign_donations'
const DONATION_COLLECTION_SCHEMA = Joi.object({
  campaignId: Joi.string().pattern(/^[a-f\d]{24}$/i).required(),
  donorId: Joi.string().pattern(/^[a-f\d]{24}$/i).required(),
  
  amount: Joi.number().required().min(10000),
  message: Joi.string().allow('', null).default(''),
  
  paymentStatus: Joi.string().valid('pending', 'success', 'failed').default('pending'),
  transactionId: Joi.string().allow('', null).default(null),
  isAnonymous: Joi.boolean().default(false),
  
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await DONATION_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false, stripUnknown: true })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    validData.campaignId = new ObjectId(String(validData.campaignId))
    validData.donorId = new ObjectId(String(validData.donorId))
    const createdDonation = await GET_DB().collection(DONATION_COLLECTION_NAME).insertOne(validData)
    return createdDonation
  } catch (error) { throw new Error(error.message) }
}

const findOneById = async (id) => {
  try {
    const result = await GET_DB().collection(DONATION_COLLECTION_NAME).findOne({ _id: new ObjectId(String(id)) })
    return result
  } catch (error) { throw new Error(error.message) }
}

const update = async (donationId, updateData) => {
  try {
    Object.keys(updateData).forEach(fieldName => {
      if (['_id', 'createdAt'].includes(fieldName)) {
        delete updateData[fieldName]
      }
    })

    if (updateData.campaignId) updateData.campaignId = new ObjectId(String(updateData.campaignId))
    if (updateData.donorId) updateData.donorId = new ObjectId(String(updateData.donorId))

    updateData.updatedAt = Date.now()

    const result = await GET_DB().collection(DONATION_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(String(donationId)) },
      { $set: updateData },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) { throw new Error(error.message) }
}

const getDonationsByCampaign = async (campaignId, skip = 0, limit = 10) => {
  try {
    const query = {
      campaignId: new ObjectId(String(campaignId)),
      paymentStatus: 'success',
      _destroy: { $ne: true }
    }

    const donations = await GET_DB().collection(DONATION_COLLECTION_NAME)
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const total = await GET_DB().collection(DONATION_COLLECTION_NAME).countDocuments(query)

    return { donations, total }
  } catch (error) { throw new Error(error.message) }
}

export const donationModel = {
  DONATION_COLLECTION_NAME,
  DONATION_COLLECTION_SCHEMA,
  createNew,
  findOneById,
  update,
  getDonationsByCampaign
}
