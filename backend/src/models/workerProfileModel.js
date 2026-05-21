import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { JOB_TYPES, EDUCATION_LEVELS, BARRIER_TYPES, WORKER_PROFILE_STEPS, MAX_EMPLOYMENT_HISTORY, INDUSTRY_TYPES } from '~/utils/constants'

const WORKER_PROFILE_COLLECTION_NAME = 'worker_profiles'
const WORKER_PROFILE_COLLECTION_SCHEMA = Joi.object({
  userId: Joi.string().required(),
  currentStep: Joi.number().integer().min(1).max(WORKER_PROFILE_STEPS.MAX_STEP).default(1),
  isCompleted: Joi.boolean().default(false),

  basicInfo: Joi.object({
    age: Joi.number().integer().min(35).max(65).required(),
    gender: Joi.string().valid('male', 'female', 'other').required(),
    province: Joi.string().required(),
    district: Joi.string().allow(''),
    education: Joi.string().valid(...Object.values(EDUCATION_LEVELS)).required(),
    maritalStatus: Joi.string().valid('single', 'married', 'divorced', 'widowed').required(),
    phone: Joi.string().allow('')
  }),

  employmentHistory: Joi.array().items(
    Joi.object({
      companyName: Joi.string().allow(''),
      position: Joi.string().allow(''),
      duration: Joi.number().integer().min(0),
      jobType: Joi.string().valid(...Object.values(JOB_TYPES)),
      industry: Joi.string().valid(...Object.values(INDUSTRY_TYPES)).allow(''),
      skills: Joi.array().items(Joi.string())
    })
  ).max(MAX_EMPLOYMENT_HISTORY),

  barriers: Joi.object({
    health: Joi.boolean().default(false),
    family: Joi.boolean().default(false),
    techGap: Joi.boolean().default(false),
    location: Joi.boolean().default(false),
    other: Joi.boolean().default(false),
    otherDescription: Joi.string().allow('')
  }),

  aspirations: Joi.object({
    targetJob: Joi.string().allow(''),
    targetJobNoPreference: Joi.boolean().default(false),
    targetSalary: Joi.number().integer().min(0),
    targetProvince: Joi.string().allow(''),
    preferredJobType: Joi.string().valid(...Object.values(JOB_TYPES)),
    skills: Joi.array().items(Joi.string()),
    wantsToStartBusiness: Joi.boolean().default(false)
  }),

  riskLevel: Joi.string().valid('high', 'medium', 'low'),
  riskScore: Joi.number().min(0).max(1),
  recommendedJobs: Joi.array().items(Joi.string()),

  createdAt: Joi.date().timestamp('javascript').default(Date.now()),
  updatedAt: Joi.date().timestamp('javascript').default(Date.now()),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await WORKER_PROFILE_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
    stripUnknown: true
  })
}

const createNew = async (data, skipValidation = false) => {
  try {
    const validData = skipValidation
      ? data
      : await validateBeforeCreate(data)
    return await GET_DB().collection(WORKER_PROFILE_COLLECTION_NAME).insertOne(validData)
  } catch (error) {
    throw new Error(error.message)
  }
}

const findOneByUserId = async (userId) => {
  try {
    return await GET_DB().collection(WORKER_PROFILE_COLLECTION_NAME).findOne({
      userId: userId,
      _destroy: false
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const findOneById = async (profileId) => {
  try {
    const objectId = new ObjectId(profileId)
    return await GET_DB().collection(WORKER_PROFILE_COLLECTION_NAME).findOne({
      _id: objectId,
      _destroy: false
    })
  } catch (error) {
    throw new Error(error.message)
  }
}

const update = async (profileId, data) => {
  try {
    const objectId = new ObjectId(profileId)
    const updateData = {
      ...data,
      updatedAt: Date.now()
    }

    const result = await GET_DB().collection(WORKER_PROFILE_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const upsertByUserId = async (userId, data) => {
  try {
    const existingProfile = await findOneByUserId(userId)

    if (existingProfile) {
      return await update(existingProfile._id.toString(), data)
    } else {
      const newProfile = {
        ...data,
        userId: userId,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      const result = await GET_DB().collection(WORKER_PROFILE_COLLECTION_NAME).insertOne(newProfile)
      return { ...newProfile, _id: result.insertedId }
    }
  } catch (error) {
    throw new Error(error.message)
  }
}

const updateStep = async (userId, step, stepData) => {
  try {
    const existingProfile = await findOneByUserId(userId)

    if (existingProfile) {
      const stepFieldMap = {
        1: 'basicInfo',
        2: 'employmentHistory',
        3: 'barriers',
        4: 'aspirations'
      }

      const fieldName = stepFieldMap[step]
      if (!fieldName) throw new Error('Invalid step number')

      const updateObj = {
        currentStep: step,
        [fieldName]: stepData,
        updatedAt: Date.now()
      }

      if (step === WORKER_PROFILE_STEPS.MAX_STEP) {
        updateObj.isCompleted = true
      }

      const objectId = new ObjectId(existingProfile._id)
      const result = await GET_DB().collection(WORKER_PROFILE_COLLECTION_NAME).findOneAndUpdate(
        { _id: objectId },
        { $set: updateObj },
        { returnDocument: 'after' }
      )

      return result
    } else {
      const stepFieldMap = {
        1: 'basicInfo',
        2: 'employmentHistory',
        3: 'barriers',
        4: 'aspirations'
      }

      const fieldName = stepFieldMap[step]
      if (!fieldName) throw new Error('Invalid step number')

      const newProfile = {
        userId: userId,
        currentStep: step,
        isCompleted: step === WORKER_PROFILE_STEPS.MAX_STEP,
        [fieldName]: stepData,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      const result = await GET_DB().collection(WORKER_PROFILE_COLLECTION_NAME).insertOne(newProfile)
      return { ...newProfile, _id: result.insertedId }
    }
  } catch (error) {
    throw new Error(error.message)
  }
}

const completeProfile = async (userId) => {
  try {
    const result = await GET_DB().collection(WORKER_PROFILE_COLLECTION_NAME).findOneAndUpdate(
      { userId: userId },
      {
        $set: {
          isCompleted: true,
          currentStep: WORKER_PROFILE_STEPS.MAX_STEP,
          updatedAt: Date.now()
        }
      },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

const getProfiles = async (matchCondition, skip, limit) => {
  try {
    const query = { ...matchCondition, _destroy: false }

    const profiles = await GET_DB().collection(WORKER_PROFILE_COLLECTION_NAME)
      .find(query)
      .skip(skip)
      .limit(limit)
      .toArray()

    const totalProfiles = await GET_DB().collection(WORKER_PROFILE_COLLECTION_NAME).countDocuments(query)

    return { profiles, totalProfiles }
  } catch (error) {
    throw new Error(error.message)
  }
}

const updateAIData = async (profileId, aiData) => {
  try {
    const objectId = new ObjectId(profileId)
    const result = await GET_DB().collection(WORKER_PROFILE_COLLECTION_NAME).findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          ...aiData,
          updatedAt: Date.now()
        }
      },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

export const workerProfileModel = {
  WORKER_PROFILE_COLLECTION_NAME,
  createNew,
  findOneByUserId,
  findOneById,
  update,
  upsertByUserId,
  updateStep,
  completeProfile,
  getProfiles,
  updateAIData
}
