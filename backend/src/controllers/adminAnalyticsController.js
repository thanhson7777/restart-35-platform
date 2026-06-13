import { adminAnalyticsService } from '~/services/adminAnalyticsService'

const getKPIs = async (req, res, next) => {
  try {
    const data = await adminAnalyticsService.getKPIs()
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

const getUserGrowth = async (req, res, next) => {
  try {
    const data = await adminAnalyticsService.getUserGrowth()
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

const getRolesDistribution = async (req, res, next) => {
  try {
    const data = await adminAnalyticsService.getRolesDistribution()
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

const getLearningProgress = async (req, res, next) => {
  try {
    const data = await adminAnalyticsService.getLearningProgress()
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

const getApplicationFunnel = async (req, res, next) => {
  try {
    const data = await adminAnalyticsService.getApplicationFunnel()
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

const getApplicationStatus = async (req, res, next) => {
  try {
    const data = await adminAnalyticsService.getApplicationStatus()
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

export const adminAnalyticsController = {
  getKPIs,
  getUserGrowth,
  getRolesDistribution,
  getLearningProgress,
  getApplicationFunnel,
  getApplicationStatus
}
