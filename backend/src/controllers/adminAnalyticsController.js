import { adminAnalyticsService } from '~/services/adminAnalyticsService'
import { adminAnalyticsExportService } from '~/services/adminAnalyticsExportService'

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

const getDashboardOverview = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query
    const data = await adminAnalyticsService.getDashboardOverview(startDate, endDate)
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

const getUsersAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query
    const data = await adminAnalyticsService.getUsersAnalytics(startDate, endDate)
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

const getTrainingAnalytics = async (req, res, next) => {
  try {
    const timeRange = req.query.timeRange || 'all'
    const data = await adminAnalyticsService.getTrainingAnalytics(timeRange)
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

const getRecruitmentAnalytics = async (req, res, next) => {
  try {
    const timeRange = req.query.timeRange || 'all'
    const data = await adminAnalyticsService.getRecruitmentAnalytics(timeRange)
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

const getFinancialAnalytics = async (req, res, next) => {
  try {
    const timeRange = req.query.timeRange || 'all'
    const data = await adminAnalyticsService.getFinancialAnalytics(timeRange)
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

const getCommunityAnalytics = async (req, res, next) => {
  try {
    const timeRange = req.query.timeRange || 'all'
    const data = await adminAnalyticsService.getCommunityAnalytics(timeRange)
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

const exportExcel = async (req, res, next) => {
  try {
    const { tab, startDate, endDate } = req.query
    const buffer = await adminAnalyticsExportService.exportExcel(tab, startDate, endDate)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.send(buffer)
  } catch (error) {
    next(error)
  }
}

const exportPdf = async (req, res, next) => {
  try {
    const { tab, startDate, endDate } = req.query
    const buffer = await adminAnalyticsExportService.exportPdf(tab, startDate, endDate)
    res.setHeader('Content-Type', 'application/pdf')
    res.send(buffer)
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
  getApplicationStatus,
  getDashboardOverview,
  getUsersAnalytics,
  getTrainingAnalytics,
  getRecruitmentAnalytics,
  getFinancialAnalytics,
  getCommunityAnalytics,
  exportExcel,
  exportPdf
}
