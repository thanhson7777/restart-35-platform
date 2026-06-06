import { courseSponsorshipService } from '~/services/courseSponsorshipService'
import { scholarshipModel } from '~/models/scholarshipModel'
import { GET_DB } from '~/config/mongodb'
import { StatusCodes } from 'http-status-codes'

const getOverview = async (req, res, next) => {
  try {
    const ngoId = req.user._id.toString()

    const [sponsorships, scholarshipStats] = await Promise.all([
      courseSponsorshipService.getNgoSponsorshipOverview(ngoId),
      scholarshipModel.getStatsByNgo(ngoId)
    ])

    const db = await GET_DB()
    const [totalLearners, totalGraduates] = await Promise.all([
      db.collection('enrollments').countDocuments({ 'sponsorships.sponsorType': 'ngo', 'sponsorships.sponsorId': ngoId }),
      db.collection('enrollments').countDocuments({ 'sponsorships.sponsorType': 'ngo', 'sponsorships.sponsorId': ngoId, status: 'completed' })
    ])

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy tổng quan NGO thành công!',
      data: {
        totalSponsorships: sponsorships.length,
        totalLearners,
        totalGraduates,
        activeSponsorships: sponsorships,
        scholarshipStats
      }
    })
  } catch (error) { next(error) }
}

const getSponsorship = async (req, res, next) => {
  try {
    const ngoId = req.user._id.toString()
    const sponsorships = await courseSponsorshipService.getNgoSponsorshipOverview(ngoId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thông tin tài trợ thành công!',
      data: sponsorships
    })
  } catch (error) { next(error) }
}

const getImpact = async (req, res, next) => {
  try {
    const ngoId = req.user._id.toString()
    const db = await GET_DB()

    const sponsorships = await courseSponsorshipService.getNgoSponsorshipOverview(ngoId)

    const learnersPipeline = [
      { $match: { 'sponsorships.sponsorType': 'ngo', 'sponsorships.sponsorId': ngoId } },
      { $count: 'total' }
    ]
    const graduatesPipeline = [
      { $match: { 'sponsorships.sponsorType': 'ngo', 'sponsorships.sponsorId': ngoId, status: 'completed' } },
      { $count: 'total' }
    ]
    const [learnersResult, graduatesResult] = await Promise.all([
      db.collection('enrollments').aggregate(learnersPipeline).toArray(),
      db.collection('enrollments').aggregate(graduatesPipeline).toArray()
    ])

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy báo cáo impact thành công!',
      data: {
        totalLearners: learnersResult[0]?.total || 0,
        totalGraduates: graduatesResult[0]?.total || 0,
        sponsorships
      }
    })
  } catch (error) { next(error) }
}

export const ngoDashboardController = {
  getOverview,
  getSponsorship,
  getImpact
}
