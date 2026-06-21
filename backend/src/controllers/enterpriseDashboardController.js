import { partnershipService } from '~/services/partnershipService'
import { courseSponsorshipService } from '~/services/courseSponsorshipService'
import { GET_DB } from '~/config/mongodb'
import { ObjectId } from 'mongodb'
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

    const appStatusMap = {
      'pending': 'Chờ duyệt',
      'reviewing': 'Đang xem xét',
      'shortlisted': 'Lọt vào sơ tuyển',
      'interview_scheduled': 'Lịch phỏng vấn',
      'interviewed': 'Đã phỏng vấn',
      'offered': 'Đề nghị nhận việc',
      'hired': 'Đã tuyển',
      'rejected': 'Từ chối'
    };

    const applicationStatusData = rawFunnel.map(item => ({
      name: appStatusMap[item._id] || item._id,
      value: item.count
    }));

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

    // Partnership Status
    const rawPartnershipStatus = await db.collection('partnerships').aggregate([
      { $match: { enterpriseId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray()

    const pStatusMap = {
      'pending': 'Chờ duyệt',
      'negotiating': 'Thương lượng',
      'active': 'Hoạt động',
      'rejected': 'Từ chối',
      'cancelled': 'Đã hủy',
      'expired': 'Hết hạn'
    };

    const partnershipStatusData = rawPartnershipStatus.map(item => ({
      name: pStatusMap[item._id] || item._id,
      value: item.count,
      id: item._id
    }));

    // Active Sponsorships
    const rawSponsorships = await db.collection('course_sponsorships')
      .find({ sponsorId: enterpriseId, _destroy: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    const activeSponsorshipsList = await Promise.all(rawSponsorships.map(async (s) => {
      let courseTitle = null;
      if (s.linkedCourses && s.linkedCourses.length > 0 && s.linkedCourses[0].courseId) {
        const course = await db.collection('courses').findOne({ _id: new ObjectId(s.linkedCourses[0].courseId) });
        if (course) courseTitle = course.title;
      }
      return { ...s, courseTitle };
    }));

    // Sponsorship Status
    const rawSponsorshipStatus = await db.collection('course_sponsorships').aggregate([
      { $match: { sponsorId: enterpriseId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray()

    const sStatusMap = {
      'pending': 'Chờ duyệt',
      'active': 'Đang hoạt động',
      'completed': 'Đã hoàn thành',
      'cancelled': 'Đã hủy',
      'paused': 'Tạm dừng'
    };

    const sponsorshipStatusData = rawSponsorshipStatus.map(item => ({
      name: sStatusMap[item._id] || item._id,
      value: item.count,
      id: item._id
    }));

    // Sponsored Learners
    const sponsorshipIds = sponsorships.map(s => String(s._id));
    const rawSponsoredLearners = await db.collection('enrollments').find({
      'sponsorships.sponsorshipId': { $in: sponsorshipIds },
      _destroy: { $ne: true }
    }).sort({ enrolledAt: -1 }).limit(50).toArray();

    const sponsoredLearners = await Promise.all(rawSponsoredLearners.map(async (enrollment) => {
      const user = await db.collection('users').findOne({ _id: new ObjectId(enrollment.userId) });
      const course = await db.collection('courses').findOne({ _id: new ObjectId(enrollment.courseId) });
      const sp = enrollment.sponsorships?.find(s => sponsorshipIds.includes(s.sponsorshipId));
      const sponsorship = sponsorships.find(s => String(s._id) === sp?.sponsorshipId);

      return {
        _id: enrollment._id,
        user: { 
          name: user?.displayName || 'N/A', 
          email: user?.email || 'N/A' 
        },
        course: { 
          title: course?.title || 'N/A' 
        },
        sponsorship: { 
          title: sponsorship?.title || 'N/A', 
          status: sp?.status || 'N/A' 
        },
        status: enrollment.status,
        enrolledAt: enrollment.enrolledAt
      };
    }));

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy tổng quan enterprise thành công!',
      data: {
        totalPartnerships: partnerships.length,
        totalSponsorships: sponsorships.length,
        totalLearners,
        totalGraduates,
        activePartnerships: partnerships,
        activeSponsorships: activeSponsorshipsList,
        totalJobs,
        totalApplications,
        totalInterviews,
        totalHired,
        applicationFunnel,
        applicationStatusData,
        applicationTrend,
        applicationSource,
        jobStatusData,
        partnershipStatusData,
        sponsorshipStatusData,
        sponsoredLearners
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
