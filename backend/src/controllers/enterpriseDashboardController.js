import { partnershipService } from '~/services/partnershipService'
import { courseSponsorshipService } from '~/services/courseSponsorshipService'
import { GET_DB } from '~/config/mongodb'
import { StatusCodes } from 'http-status-codes'

const getOverview = async (req, res, next) => {
  try {
    const enterpriseId = req.user._id.toString()
    const db = await GET_DB()

    const [
      partnerships, 
      sponsorships, 
      totalLearners, 
      totalGraduates,
      totalJobs,
      totalApplications,
      totalInterviews,
      totalHired
    ] = await Promise.all([
      partnershipService.getEnterpriseActivePartnerships(enterpriseId),
      courseSponsorshipService.getEnterpriseSponsorshipOverview(enterpriseId),
      db.collection('enrollments').countDocuments({ enterpriseId }),
      db.collection('enrollments').countDocuments({ enterpriseId, status: 'completed' }),
      db.collection('recruitment_jobs').countDocuments({ enterpriseId, _destroy: { $ne: true } }),
      db.collection('recruitment_applications').countDocuments({ enterpriseId }),
      db.collection('recruitment_interviews').countDocuments({ enterpriseId, status: 'confirmed' }),
      db.collection('recruitment_applications').countDocuments({ enterpriseId, status: 'hired' })
    ])

    // Funnel stats
    const rawFunnel = await db.collection('recruitment_applications').aggregate([
      { $match: { enterpriseId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray()
    
    const funnelObj = rawFunnel.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});
    
    const applicationFunnel = [
      { name: 'Nộp đơn', value: totalApplications },
      { name: 'Đã duyệt', value: (funnelObj['shortlisted'] || 0) + (funnelObj['reviewing'] || 0) + (funnelObj['interview_scheduled'] || 0) + (funnelObj['interviewed'] || 0) + (funnelObj['offered'] || 0) + (funnelObj['hired'] || 0) },
      { name: 'Phỏng vấn', value: (funnelObj['interview_scheduled'] || 0) + (funnelObj['interviewed'] || 0) + (funnelObj['offered'] || 0) + (funnelObj['hired'] || 0) },
      { name: 'Trúng tuyển', value: funnelObj['hired'] || 0 }
    ]

    // Application Source
    const rawSource = await db.collection('recruitment_applications').aggregate([
      { $match: { enterpriseId } },
      { $group: { _id: { $ifNull: ['$source', 'direct'] }, count: { $sum: 1 } } }
    ]).toArray()
    
    const sourceMap = {
      'direct': 'Trực tiếp',
      'course_linked': 'Từ khóa học',
      'recommendation': 'Giới thiệu',
      'ai_suggested': 'AI gợi ý'
    }
    
    // Gom nhóm các source không hợp lệ (như 'new') vào 'direct'
    const applicationSourceMap = {}
    rawSource.forEach(item => {
      const validKey = sourceMap[item._id] ? item._id : 'direct'
      applicationSourceMap[validKey] = (applicationSourceMap[validKey] || 0) + item.count
    })

    const applicationSource = Object.keys(applicationSourceMap).map(key => ({
      name: sourceMap[key],
      value: applicationSourceMap[key]
    }))

    // 7-day trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0,0,0,0);

    const rawTrend = await db.collection('recruitment_applications').aggregate([
      { $match: { enterpriseId, appliedAt: { $gte: sevenDaysAgo.getTime() } } },
      { $addFields: { dateObj: { $toDate: "$appliedAt" } } },
      { $group: { 
          _id: { $dateToString: { format: "%d/%m", date: "$dateObj", timezone: "+07:00" } }, 
          count: { $sum: 1 } 
        }
      }
    ]).toArray()

    const trendObj = rawTrend.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {})

    const applicationTrend = []
    for(let i=6; i>=0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      applicationTrend.push({
        date: dayStr,
        count: trendObj[dayStr] || 0
      })
    }

    // Job Status
    const rawJobStatus = await db.collection('recruitment_jobs').aggregate([
      { $match: { enterpriseId, _destroy: { $ne: true } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray()

    const jobStatusMap = {
      'draft': 'Bản nháp',
      'pending_approval': 'Chờ duyệt',
      'published': 'Đang hiển thị',
      'closed': 'Đã đóng',
      'expired': 'Hết hạn'
    }

    const jobStatusDataMap = {
      'draft': 0,
      'pending_approval': 0,
      'published': 0,
      'closed': 0,
      'expired': 0
    }

    rawJobStatus.forEach(item => {
      if (jobStatusDataMap[item._id] !== undefined) {
        jobStatusDataMap[item._id] = item.count;
      } else {
        jobStatusDataMap[item._id] = item.count;
        jobStatusMap[item._id] = item._id; // fallback cho status ko biết
      }
    })

    const jobStatusData = Object.keys(jobStatusDataMap).map(key => ({
      name: jobStatusMap[key],
      value: jobStatusDataMap[key]
    }))

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy tổng quan enterprise thành công!',
      data: {
        totalPartnerships: partnerships.length,
        totalSponsorships: sponsorships.length,
        totalLearners,
        totalGraduates,
        activePartnerships: partnerships,
        activeSponsorships: sponsorships,
        totalJobs,
        totalApplications,
        totalInterviews,
        totalHired,
        applicationFunnel,
        applicationTrend,
        applicationSource,
        jobStatusData
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
