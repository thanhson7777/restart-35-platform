import { workerProfileModel } from '~/models/workerProfileModel'
import { userModel } from '~/models/userModel'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { WORKER_PROFILE_STEPS, DEFAULT_PAGE, DEFAULT_ITEM_PER_PAGE } from '~/utils/constants'

const createNew = async (userId) => {
  try {
    const existProfile = await workerProfileModel.findOneByUserId(userId)
    if (existProfile) {
      throw new ApiError(StatusCodes.CONFLICT, 'Hồ sơ đã tồn tại!')
    }

    const newProfile = {
      userId: userId,
      currentStep: WORKER_PROFILE_STEPS.BASIC_INFO,
      isCompleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    const createdProfile = await workerProfileModel.createNew(newProfile)
    return await workerProfileModel.findOneById(createdProfile.insertedId)
  } catch (error) { throw error }
}

const getMyProfile = async (userId) => {
  try {
    const profile = await workerProfileModel.findOneByUserId(userId)
    if (!profile) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Hồ sơ không tồn tại!')
    }
    return profile
  } catch (error) { throw error }
}

const getProfileById = async (profileId) => {
  try {
    const profile = await workerProfileModel.findOneById(profileId)
    if (!profile) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Hồ sơ không tồn tại!')
    }
    return profile
  } catch (error) { throw error }
}

const updateStep = async (userId, step, stepData) => {
  try {
    const stepFieldMap = {
      1: 'basicInfo',
      2: 'employmentHistory',
      3: 'barriers',
      4: 'aspirations'
    }

    if (!stepFieldMap[step]) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Số bước không hợp lệ!')
    }

    const data = {
      currentStep: step,
      [stepFieldMap[step]]: stepData
    }

    if (step === WORKER_PROFILE_STEPS.MAX_STEP) {
      data.isCompleted = true
    }

    const updatedProfile = await workerProfileModel.updateStep(userId, step, stepData)
    if (!updatedProfile) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không thể cập nhật hồ sơ!')
    }

    return updatedProfile
  } catch (error) { throw error }
}

const autosave = async (userId, step, data) => {
  try {
    const stepFieldMap = {
      1: 'basicInfo',
      2: 'employmentHistory',
      3: 'barriers',
      4: 'aspirations'
    }

    if (!stepFieldMap[step]) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Số bước không hợp lệ!')
    }

    const existingProfile = await workerProfileModel.findOneByUserId(userId)

    if (existingProfile) {
      const updateData = {
        currentStep: step,
        [stepFieldMap[step]]: data,
        updatedAt: Date.now()
      }

      const objectId = existingProfile._id
      return await workerProfileModel.update(objectId, updateData)
    } else {
      const newProfile = {
        userId: userId,
        currentStep: step,
        isCompleted: false,
        [stepFieldMap[step]]: data,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      // Skip validation when creating new profile (data may be incomplete)
      const created = await workerProfileModel.createNew(newProfile, true)
      return await workerProfileModel.findOneById(created.insertedId)
    }
  } catch (error) { throw error }
}

const completeProfile = async (userId) => {
  try {
    const profile = await workerProfileModel.findOneByUserId(userId)
    if (!profile) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Hồ sơ không tồn tại!')
    }

    // Cho phép cập nhật lại hồ sơ đã hoàn thành
    // Data đã được autosave trước đó

    const completedProfile = await workerProfileModel.completeProfile(userId)
    return completedProfile
  } catch (error) { throw error }
}

const reopenProfile = async (userId) => {
  try {
    const profile = await workerProfileModel.findOneByUserId(userId)
    if (!profile) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Hồ sơ không tồn tại!')
    }

    const result = await workerProfileModel.update(profile._id, {
      isCompleted: false,
      currentStep: 4,
      updatedAt: Date.now()
    })
    return result
  } catch (error) { throw error }
}

const getProfiles = async ({ page = DEFAULT_PAGE, limit = DEFAULT_ITEM_PER_PAGE, isCompleted }) => {
  try {
    const currentPage = parseInt(page, 10) || DEFAULT_PAGE
    const recordLimit = parseInt(limit, 10) || DEFAULT_ITEM_PER_PAGE
    const skip = (currentPage - 1) * recordLimit

    let matchCondition = {}

    if (isCompleted !== undefined && isCompleted !== 'ALL') {
      matchCondition.isCompleted = isCompleted === 'true'
    }

    const { profiles, totalProfiles } = await workerProfileModel.getProfiles(matchCondition, skip, recordLimit)

    return {
      profiles,
      pagination: {
        totalRecords: totalProfiles,
        totalPages: Math.ceil(totalProfiles / recordLimit),
        currentPage: currentPage,
        limit: recordLimit
      }
    }
  } catch (error) { throw error }
}

const updateAIData = async (profileId, aiData) => {
  try {
    const profile = await workerProfileModel.findOneById(profileId)
    if (!profile) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Hồ sơ không tồn tại!')
    }

    const updatedProfile = await workerProfileModel.updateAIData(profileId, aiData)
    return updatedProfile
  } catch (error) { throw error }
}

const getProfileWithUserInfo = async (profileId) => {
  try {
    const profile = await workerProfileModel.findOneById(profileId)
    if (!profile) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Hồ sơ không tồn tại!')
    }

    const user = await userModel.findOneById(profile.userId)
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Người dùng không tồn tại!')
    }

    return {
      ...profile,
      user: {
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
        phone: user.phone
      }
    }
  } catch (error) { throw error }
}

export const workerProfileService = {
  createNew,
  getMyProfile,
  getProfileById,
  updateStep,
  autosave,
  completeProfile,
  reopenProfile,
  getProfiles,
  updateAIData,
  getProfileWithUserInfo
}
