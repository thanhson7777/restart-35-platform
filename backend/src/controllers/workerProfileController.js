import { workerProfileService } from '~/services/workerProfileService'
import { StatusCodes } from 'http-status-codes'
import { USER_ROLES } from '~/utils/constants'

const createNew = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const createdProfile = await workerProfileService.createNew(userId)

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Tạo hồ sơ thành công!',
      data: createdProfile
    })
  } catch (error) { next(error) }
}

const getMyProfile = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const profile = await workerProfileService.getMyProfile(userId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy hồ sơ thành công!',
      data: profile
    })
  } catch (error) { next(error) }
}

const getProfileById = async (req, res, next) => {
  try {
    const profileId = req.params.id
    const profile = await workerProfileService.getProfileWithUserInfo(profileId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy hồ sơ thành công!',
      data: profile
    })
  } catch (error) { next(error) }
}

const updateStep = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const step = parseInt(req.params.step, 10)
    const stepData = req.body

    const updatedProfile = await workerProfileService.updateStep(userId, step, stepData)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cập nhật hồ sơ thành công!',
      data: updatedProfile
    })
  } catch (error) { next(error) }
}

const autosave = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const { step, data } = req.body

    const updatedProfile = await workerProfileService.autosave(userId, step, data)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lưu tạm thành công!',
      data: {
        profileId: updatedProfile._id,
        currentStep: updatedProfile.currentStep,
        savedAt: updatedProfile.updatedAt,
        stepData: data
      }
    })
  } catch (error) { next(error) }
}

const completeProfile = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const completedProfile = await workerProfileService.completeProfile(userId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Hoàn thành hồ sơ thành công!',
      data: completedProfile
    })
  } catch (error) { next(error) }
}

const reopenProfile = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const result = await workerProfileService.reopenProfile(userId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Mở lại hồ sơ để chỉnh sửa!',
      data: result
    })
  } catch (error) { next(error) }
}

const getProfiles = async (req, res, next) => {
  try {
    const { page, limit, isCompleted } = req.query
    const result = await workerProfileService.getProfiles({ page, limit, isCompleted })

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách hồ sơ thành công!',
      data: result.profiles,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

const getProfileCompleteness = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const profile = await workerProfileService.getMyProfile(userId)

    const employmentHistory = profile.employmentHistory
    let hasExperience = true

    if (employmentHistory) {
      if (typeof employmentHistory === 'object' && !Array.isArray(employmentHistory)) {
        hasExperience = employmentHistory.status !== 'không có'
      } else if (Array.isArray(employmentHistory)) {
        hasExperience = employmentHistory.length > 0 &&
          employmentHistory.some(j => j?.companyName || j?.position)
      }
    } else {
      hasExperience = false
    }

    const missingFields = []
    if (!hasExperience) missingFields.push('employmentHistory')

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        is_complete: hasExperience,
        has_experience: hasExperience,
        missing_fields: missingFields,
        completeness_score: hasExperience ? 100 : 0
      }
    })
  } catch (error) { next(error) }
}

export const workerProfileController = {
  createNew,
  getMyProfile,
  getProfileById,
  updateStep,
  autosave,
  completeProfile,
  reopenProfile,
  getProfiles,
  getProfileCompleteness
}
