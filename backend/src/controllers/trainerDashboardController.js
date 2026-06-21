import { partnershipService } from '~/services/partnershipService'
import { GET_DB } from '~/config/mongodb'
import { StatusCodes } from 'http-status-codes'

const getPartnerships = async (req, res, next) => {
  try {
    const actorId = req.user._id.toString()
    const role = req.user.role
    const result = await partnershipService.getPartnerships(actorId, role, req.query)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách partnership thành công!',
      data: result.partnerships,
      pagination: result.pagination
    })
  } catch (error) { next(error) }
}

const getPartnershipDetail = async (req, res, next) => {
  try {
    const partnership = await partnershipService.getPartnershipById(
      req.params.id,
      req.user._id.toString(),
      req.user.role
    )

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy chi tiết partnership trainer thành công!',
      data: partnership
    })
  } catch (error) { next(error) }
}

const getPartnershipStats = async (req, res, next) => {
  try {
    const stats = await partnershipService.getPartnershipStats(
      req.params.id,
      req.user._id.toString(),
      req.user.role
    )

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thống kê partnership trainer thành công!',
      data: stats
    })
  } catch (error) { next(error) }
}

const getEnterpriseStudents = async (req, res, next) => {
  try {
    const trainerId = req.user._id.toString()
    const db = await GET_DB()

    const partnerships = await partnershipService.getTrainerActivePartnerships(trainerId)
    const partnershipIds = partnerships.map(p => p._id.toString())

    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - 12)

    const learnersPipeline = [
      {
        $match: {
          enterpriseId: { $exists: true, $ne: null },
          partnershipId: { $in: partnershipIds },
          _destroy: { $ne: true }
        }
      },
      {
        $facet: {
          total: [{ $count: 'count' }],
          recent: [
            { $sort: { enrolledAt: -1 } },
            { $limit: 50 }
          ],
          trend: [
            { $match: { enrolledAt: { $gte: startDate } } },
            {
              $group: {
                _id: {
                  year: { $year: '$enrolledAt' },
                  month: { $month: '$enrolledAt' }
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
          ]
        }
      }
    ]

    const [result] = await db.collection('enrollments').aggregate(learnersPipeline).toArray()

    const trendData = (result.trend || []).map(item => {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const label = `${monthNames[item._id.month - 1]} ${item._id.year}`
      return {
        month: label,
        count: item.count
      }
    })

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách learner từ enterprise thành công!',
      data: {
        total: result.total[0]?.count || 0,
        recentLearners: result.recent,
        trend: trendData
      }
    })
  } catch (error) { next(error) }
}

export const trainerDashboardController = {
  getPartnerships,
  getPartnershipDetail,
  getPartnershipStats,
  getEnterpriseStudents
}
