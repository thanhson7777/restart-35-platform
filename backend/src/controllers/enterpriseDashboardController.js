import { partnershipService } from '~/services/partnershipService'
import { courseSponsorshipService } from '~/services/courseSponsorshipService'
import { GET_DB } from '~/config/mongodb'
import { StatusCodes } from 'http-status-codes'

const getOverview = async (req, res, next) => {
  try {
    const enterpriseId = req.user._id.toString()

    const [partnerships, sponsorships] = await Promise.all([
      partnershipService.getEnterpriseActivePartnerships(enterpriseId),
      courseSponsorshipService.getEnterpriseSponsorshipOverview(enterpriseId)
    ])

    const db = await GET_DB()
    const [totalLearners, totalGraduates] = await Promise.all([
      db.collection('enrollments').countDocuments({ enterpriseId }),
      db.collection('enrollments').countDocuments({ enterpriseId, status: 'completed' })
    ])

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy tổng quan enterprise thành công!',
      data: {
        totalPartnerships: partnerships.length,
        totalSponsorships: sponsorships.length,
        totalLearners,
        totalGraduates,
        activePartnerships: partnerships,
        activeSponsorships: sponsorships
      }
    })
  } catch (error) { next(error) }
}

const getRecruitment = async (req, res, next) => {
  try {
    const enterpriseId = req.user._id.toString()

    const partnerships = await partnershipService.getEnterpriseActivePartnerships(enterpriseId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thông tin tuyển dụng thành công!',
      data: partnerships.map(p => ({
        partnershipId: p._id,
        trainerId: p.trainerId,
        linkedCourseIds: p.linkedCourseIds,
        recruitmentNeeds: p.recruitmentNeeds,
        stats: p.stats,
        status: p.status
      }))
    })
  } catch (error) { next(error) }
}

const getSponsorship = async (req, res, next) => {
  try {
    const enterpriseId = req.user._id.toString()
    const sponsorships = await courseSponsorshipService.getEnterpriseSponsorshipOverview(enterpriseId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thông tin tài trợ thành công!',
      data: sponsorships
    })
  } catch (error) { next(error) }
}

const getPartnerships = async (req, res, next) => {
  try {
    const enterpriseId = req.user._id.toString()
    const partnerships = await partnershipService.getEnterpriseActivePartnerships(enterpriseId)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách partnership thành công!',
      data: partnerships
    })
  } catch (error) { next(error) }
}

export const enterpriseDashboardController = {
  getOverview,
  getRecruitment,
  getSponsorship,
  getPartnerships
}
