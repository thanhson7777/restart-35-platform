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

    const { courseModel } = await import('~/models/courseModel')
    const { userModel } = await import('~/models/userModel')

    // Find all courses owned by this trainer
    const courses = await db.collection(courseModel.COURSE_COLLECTION_NAME).find({ providerId: trainerId, _destroy: { $ne: true } }).toArray()
    const courseIds = courses.map(c => c._id.toString())

    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - 12)

    const matchQuery = {
      courseId: { $in: courseIds },
      _destroy: { $ne: true },
      $or: [
        { enterpriseId: { $exists: true, $ne: null } },
        { 'sponsorships.sponsorType': 'enterprise' }
      ]
    }

    const learnersPipeline = [
      { $match: matchQuery },
      {
        $facet: {
          total: [{ $count: 'count' }],
          listRaw: [
            { $sort: { enrolledAt: -1 } }
          ],
          trend: [
            { 
              $match: { 
                $expr: { $gte: [ { $toDate: '$enrolledAt' }, startDate ] }
              } 
            },
            {
              $group: {
                _id: {
                  year: { $year: { $toDate: '$enrolledAt' } },
                  month: { $month: { $toDate: '$enrolledAt' } }
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

    // Generate last 12 months with 0 count
    const trendData = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth() + 1; // 1-12
      
      const found = (result.trend || []).find(t => t._id.year === year && t._id.month === month);
      
      trendData.push({
        month: `${monthNames[month - 1]} ${year}`,
        count: found ? found.count : 0
      });
    }

    const { courseSponsorshipModel } = await import('~/models/courseSponsorshipModel')
    const { organizationModel } = await import('~/models/organizationModel')

    // Populate user and enterprise data for the list
    const populatedList = await Promise.all((result.listRaw || []).map(async s => {
      const user = await userModel.findOneById(s.userId);
      const course = courses.find(c => c._id.toString() === s.courseId);
      
      let enterpriseName = 'Doanh nghiệp';
      let entUser = null;

      if (s.enterpriseId) {
        entUser = await userModel.findOneById(s.enterpriseId);
      } else if (s.sponsorships && s.sponsorships.length > 0) {
        const sp = s.sponsorships.find(x => x.sponsorType === 'enterprise');
        if (sp && sp.sponsorshipId) {
           const sponsorshipInfo = await courseSponsorshipModel.findOneById(sp.sponsorshipId);
           if (sponsorshipInfo && sponsorshipInfo.sponsorId) {
             entUser = await userModel.findOneById(sponsorshipInfo.sponsorId);
           }
        }
      }

      if (entUser) {
        enterpriseName = entUser.displayName; // fallback to representative name
        if (entUser.organizationId) {
          const org = await organizationModel.findOneById(entUser.organizationId);
          if (org && org.name) {
            enterpriseName = org.name; // real enterprise name
          }
        }
      }

      return {
        _id: s._id,
        user: { name: user?.displayName || 'N/A', avatar: user?.avatar },
        course: { title: course?.title || 'N/A' },
        sponsorship: { enterprise: { name: enterpriseName } },
        status: s.status,
        enrolledAt: s.enrolledAt,
        displayName: user?.displayName, // for widget
        avatar: user?.avatar, // for widget
        enterprise: enterpriseName // for widget
      }
    }));

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách learner từ enterprise thành công!',
      data: {
        total: result.total[0]?.count || 0,
        list: populatedList,
        recentLearners: populatedList.slice(0, 50),
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
