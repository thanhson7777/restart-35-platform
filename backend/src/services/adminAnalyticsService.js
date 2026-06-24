import { GET_DB } from '~/config/mongodb'
import { userModel } from '~/models/userModel'
import { courseModel } from '~/models/courseModel'
import { applicationModel } from '~/models/applicationModel'
import { paymentModel } from '~/models/paymentModel'
import { organizationModel } from '~/models/organizationModel'
import { recruitmentJobModel } from '~/models/recruitmentJobModel'
import { enrollmentModel } from '~/models/enrollmentModel'
import { certificateModel } from '~/models/certificateModel'
import { transactionModel } from '~/models/transactionModel'
import { forumPostModel } from '~/models/forumPostModel'
import { commentModel } from '~/models/commentModel'
import { communityCategoryModel } from '~/models/communityCategoryModel'
import { RECRUITMENT_APPLICATION_STATUS } from '~/utils/constants'

// ============ KPI Stats ============
const getKPIs = async () => {
  try {
    const db = GET_DB()

    // 1. Total Users (exclude admin if you want, but usually total means total)
    const totalUsers = await db.collection(userModel.USER_COLLECTION_NAME).countDocuments({ _destroy: { $ne: true } })

    // 2. Total Active Courses (status = 'approved')
    const activeCourses = await db.collection(courseModel.COURSE_COLLECTION_NAME).countDocuments({
      status: courseModel.COURSE_STATUS.APPROVED,
      _destroy: { $ne: true }
    })

    // 3. Pending Applications (status = 'new' or 'shortlisted')
    const pendingApplications = await db.collection(applicationModel.APPLICATION_COLLECTION_NAME).countDocuments({
      status: { $in: [RECRUITMENT_APPLICATION_STATUS.NEW, RECRUITMENT_APPLICATION_STATUS.SHORTLISTED] },
      _destroy: { $ne: true }
    })

    // 4. Acceptance Rate (Hired / Total Resolved)
    const applicationStats = await db.collection(applicationModel.APPLICATION_COLLECTION_NAME).aggregate([
      { $match: { _destroy: { $ne: true } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray()

    let totalResolved = 0
    let hiredCount = 0

    applicationStats.forEach(stat => {
      if ([RECRUITMENT_APPLICATION_STATUS.HIRED, RECRUITMENT_APPLICATION_STATUS.REJECTED].includes(stat._id)) {
        totalResolved += stat.count
      }
      if (stat._id === RECRUITMENT_APPLICATION_STATUS.HIRED) {
        hiredCount = stat.count
      }
    })

    const acceptanceRate = totalResolved > 0 ? ((hiredCount / totalResolved) * 100).toFixed(1) : 0

    return {
      totalUsers,
      activeCourses,
      pendingApplications,
      acceptanceRate
    }
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ User Growth Chart (Line Chart) ============
const getUserGrowth = async () => {
  try {
    const db = GET_DB()
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const monthlyGrowth = await db.collection(userModel.USER_COLLECTION_NAME).aggregate([
      {
        $match: {
          _destroy: { $ne: true },
          createdAt: { $gte: sixMonthsAgo.getTime() }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: { $toDate: '$createdAt' } },
            month: { $month: { $toDate: '$createdAt' } }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]).toArray()

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const data = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const year = d.getFullYear()
      const month = d.getMonth() + 1
      const found = monthlyGrowth.find(x => x._id.year === year && x._id.month === month)
      data.push({
        name: `${monthNames[month - 1]} ${year}`,
        users: found ? found.count : 0
      })
    }

    return data
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ Roles Distribution Chart (Pie Chart) ============
const getRolesDistribution = async () => {
  try {
    const db = GET_DB()
    const stats = await db.collection(userModel.USER_COLLECTION_NAME).aggregate([
      { $match: { _destroy: { $ne: true } } },
      { $group: { _id: '$role', value: { $sum: 1 } } }
    ]).toArray()

    return stats.map(item => ({
      name: item._id.charAt(0).toUpperCase() + item._id.slice(1),
      value: item.value
    }))
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ Learning Progress (Bar Chart) ============
const getLearningProgress = async () => {
  try {
    const db = GET_DB()
    // Giả lập dữ liệu hoặc query từ enrollment collection
    const stats = await db.collection('enrollments').aggregate([
      { $match: { _destroy: { $ne: true } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray()

    let completed = 0
    let inProgress = 0
    let dropped = 0

    stats.forEach(s => {
      if (s._id === 'completed') completed += s.count
      else if (s._id === 'dropped') dropped += s.count
      else inProgress += s.count
    })

    return [
      { name: 'Đang học', count: inProgress, fill: '#8884d8' },
      { name: 'Đã hoàn thành', count: completed, fill: '#82ca9d' },
      { name: 'Bỏ cuộc', count: dropped, fill: '#ffc658' }
    ]
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ Application Funnel ============
const getApplicationFunnel = async () => {
  try {
    const db = GET_DB()
    const stats = await db.collection(applicationModel.APPLICATION_COLLECTION_NAME).aggregate([
      { $match: { _destroy: { $ne: true } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray()

    let newCount = 0
    let interviewedCount = 0
    let offeredCount = 0
    let hiredCount = 0

    stats.forEach(s => {
      if ([RECRUITMENT_APPLICATION_STATUS.NEW, RECRUITMENT_APPLICATION_STATUS.SHORTLISTED].includes(s._id)) newCount += s.count
      else if ([RECRUITMENT_APPLICATION_STATUS.INTERVIEW_SCHEDULED, RECRUITMENT_APPLICATION_STATUS.INTERVIEW_COMPLETED].includes(s._id)) interviewedCount += s.count
      else if ([RECRUITMENT_APPLICATION_STATUS.OFFERED].includes(s._id)) offeredCount += s.count
      else if ([RECRUITMENT_APPLICATION_STATUS.HIRED].includes(s._id)) hiredCount += s.count
    })

    // Dữ liệu phễu thường xếp từ cao đến thấp
    return [
      { name: 'Nộp hồ sơ', value: newCount + interviewedCount + offeredCount + hiredCount, fill: '#8884d8' },
      { name: 'Phỏng vấn', value: interviewedCount + offeredCount + hiredCount, fill: '#83a6ed' },
      { name: 'Gửi Offer', value: offeredCount + hiredCount, fill: '#8dd1e1' },
      { name: 'Nhận việc', value: hiredCount, fill: '#82ca9d' }
    ]
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ Application Status (Pie Chart) ============
const getApplicationStatus = async () => {
  try {
    const db = GET_DB()
    const stats = await db.collection(applicationModel.APPLICATION_COLLECTION_NAME).aggregate([
      { $match: { _destroy: { $ne: true } } },
      { $group: { _id: '$status', value: { $sum: 1 } } }
    ]).toArray()

    let pending = 0
    let accepted = 0
    let rejected = 0

    stats.forEach(s => {
      if ([RECRUITMENT_APPLICATION_STATUS.NEW, RECRUITMENT_APPLICATION_STATUS.SHORTLISTED, RECRUITMENT_APPLICATION_STATUS.INTERVIEW_SCHEDULED].includes(s._id)) pending += s.value
      else if ([RECRUITMENT_APPLICATION_STATUS.HIRED].includes(s._id)) accepted += s.value
      else if ([RECRUITMENT_APPLICATION_STATUS.REJECTED].includes(s._id)) rejected += s.value
    })

    return [
      { name: 'Đang chờ duyệt', value: pending },
      { name: 'Trúng tuyển', value: accepted },
      { name: 'Bị từ chối', value: rejected }
    ]
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ Dashboard Overview ============
const getDashboardOverview = async (startDate, endDate) => {
  try {
    const db = GET_DB()
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Setup date match condition if provided
    let dateMatch = {}
    if (startDate || endDate) {
      dateMatch.createdAt = {}
      if (startDate) dateMatch.createdAt.$gte = parseInt(startDate)
      if (endDate) dateMatch.createdAt.$lte = parseInt(endDate)
    }

    // 1. Total Users
    const totalUsers = await db.collection(userModel.USER_COLLECTION_NAME).countDocuments({ _destroy: { $ne: true }, ...dateMatch })

    // 2. Active Courses
    const activeCourses = await db.collection(courseModel.COURSE_COLLECTION_NAME).countDocuments({
      status: courseModel.COURSE_STATUS.APPROVED,
      _destroy: { $ne: true },
      ...dateMatch
    })

    // 3. Active Jobs
    const activeJobs = await db.collection(recruitmentJobModel.RECRUITMENT_JOB_COLLECTION_NAME || 'recruitment_jobs').countDocuments({
      status: 'published', // The DB uses lowercase for job status
      _destroy: { $ne: true },
      ...dateMatch
    })

    // 4. Monthly Revenue
    const monthlyRevenueData = await db.collection(paymentModel.PAYMENT_COLLECTION_NAME || 'payments').aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: firstDayOfMonth.getTime() },
          _destroy: { $ne: true }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).toArray()
    const monthlyRevenue = monthlyRevenueData[0] ? monthlyRevenueData[0].total : 0

    // 5. Pending Actions
    const pendingCourses = await db.collection(courseModel.COURSE_COLLECTION_NAME).countDocuments({ status: courseModel.COURSE_STATUS.PENDING, _destroy: { $ne: true } })
    const pendingJobs = await db.collection(recruitmentJobModel.RECRUITMENT_JOB_COLLECTION_NAME || 'recruitment_jobs').countDocuments({ status: 'pending_approval', _destroy: { $ne: true } })
    const pendingOrganizations = await db.collection(organizationModel.ORGANIZATION_COLLECTION_NAME || 'organizations').countDocuments({ status: 'pending', _destroy: { $ne: true } })

    // 6. User Growth (reuse)
    const userGrowth = await getUserGrowth()

    // 7. Revenue Growth (Last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const revenueGrowthData = await db.collection(paymentModel.PAYMENT_COLLECTION_NAME || 'payments').aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: sixMonthsAgo.getTime() },
          _destroy: { $ne: true }
        }
      },
      {
        $group: {
          _id: { year: { $year: { $toDate: '$createdAt' } }, month: { $month: { $toDate: '$createdAt' } } },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]).toArray()

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const revenueGrowth = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const year = d.getFullYear()
      const month = d.getMonth() + 1
      const found = revenueGrowthData.find(x => x._id.year === year && x._id.month === month)
      revenueGrowth.push({
        name: `${monthNames[month - 1]} ${year}`,
        revenue: found ? found.total : 0
      })
    }

    // 8. Recent Enrollments
    const recentEnrollments = await db.collection(enrollmentModel.ENROLLMENT_COLLECTION_NAME || 'enrollments').aggregate([
      { $match: { _destroy: { $ne: true } } },
      { $sort: { createdAt: -1 } },
      { $limit: 10 },
      {
        $addFields: {
          userObjectId: { $toObjectId: '$userId' },
          courseObjectId: { $toObjectId: '$courseId' }
        }
      },
      {
        $lookup: {
          from: userModel.USER_COLLECTION_NAME,
          localField: 'userObjectId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: courseModel.COURSE_COLLECTION_NAME,
          localField: 'courseObjectId',
          foreignField: '_id',
          as: 'course'
        }
      },
      { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          status: 1,
          createdAt: 1,
          progress: 1,
          'user._id': 1,
          'user.fullName': 1,
          'user.email': 1,
          'user.avatar': 1,
          'course._id': 1,
          'course.title': 1,
          'course.courseId': 1
        }
      }
    ]).toArray()

    const formattedRecentEnrollments = recentEnrollments.map(enrol => ({
      _id: enrol._id,
      status: enrol.status,
      enrolledAt: enrol.createdAt,
      userName: enrol.user?.fullName || enrol.user?.email || 'Người dùng ẩn',
      userAvatar: enrol.user?.avatar || '',
      courseTitle: enrol.course?.title || 'Khóa học không xác định',
      progress: enrol.progress?.percentage || 0
    }))

    return {
      totalUsers,
      monthlyRevenue,
      activeCourses,
      activeJobs,
      pendingActions: {
        pendingCourses,
        pendingJobs,
        pendingOrganizations
      },
      userGrowth,
      revenueGrowth,
      recentEnrollments: formattedRecentEnrollments
    }
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ Users Analytics (Tab 2) ============
const getUsersAnalytics = async (startDate, endDate) => {
  try {
    const db = GET_DB()
    const now = Date.now()
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

    // Setup date match condition if provided
    let dateMatch = {}
    let loginMatch = {}
    if (startDate || endDate) {
      dateMatch.createdAt = {}
      loginMatch.lastLoginAt = {}
      if (startDate) {
        dateMatch.createdAt.$gte = parseInt(startDate)
        loginMatch.lastLoginAt.$gte = parseInt(startDate)
      }
      if (endDate) {
        dateMatch.createdAt.$lte = parseInt(endDate)
        loginMatch.lastLoginAt.$lte = parseInt(endDate)
      }
    }

    // 1. Overview Stats
    const totalUsers = await db.collection(userModel.USER_COLLECTION_NAME).countDocuments({ _destroy: { $ne: true }, ...dateMatch })
    const pendingUsers = await db.collection(userModel.USER_COLLECTION_NAME).countDocuments({ adminApprovalStatus: 'pending', _destroy: { $ne: true }, ...dateMatch })
    const active7d = await db.collection(userModel.USER_COLLECTION_NAME).countDocuments({
      lastLoginAt: startDate ? loginMatch.lastLoginAt : { $gte: sevenDaysAgo },
      _destroy: { $ne: true }
    })
    const active30d = await db.collection(userModel.USER_COLLECTION_NAME).countDocuments({
      lastLoginAt: startDate ? loginMatch.lastLoginAt : { $gte: thirtyDaysAgo },
      _destroy: { $ne: true }
    })

    const totalWorkers = await db.collection(userModel.USER_COLLECTION_NAME).countDocuments({ role: 'worker', _destroy: { $ne: true }, ...dateMatch })
    const totalEnterprises = await db.collection(userModel.USER_COLLECTION_NAME).countDocuments({ role: 'enterprise', _destroy: { $ne: true }, ...dateMatch })
    const totalTrainers = await db.collection(userModel.USER_COLLECTION_NAME).countDocuments({ role: 'trainer', _destroy: { $ne: true }, ...dateMatch })
    const totalNGOs = await db.collection(userModel.USER_COLLECTION_NAME).countDocuments({ role: 'ngo', _destroy: { $ne: true }, ...dateMatch })
    const totalAdmins = await db.collection(userModel.USER_COLLECTION_NAME).countDocuments({ role: 'admin', _destroy: { $ne: true }, ...dateMatch })

    // 2. User Growth (last 6 months by role)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
    sixMonthsAgo.setDate(1)
    sixMonthsAgo.setHours(0, 0, 0, 0)

    const userGrowthRaw = await db.collection(userModel.USER_COLLECTION_NAME).aggregate([
      {
        $match: {
          _destroy: { $ne: true },
          createdAt: { $gte: sixMonthsAgo.getTime() }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: { $toDate: '$createdAt' } },
            month: { $month: { $toDate: '$createdAt' } },
            role: '$role'
          },
          count: { $sum: 1 }
        }
      }
    ]).toArray()

    // Format growth data into array of 6 months
    const userGrowth = []
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    // Backfill last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const year = d.getFullYear()
      const month = d.getMonth() + 1

      const monthData = {
        name: `${monthNames[month - 1]} ${year}`,
        worker: 0,
        enterprise: 0,
        trainer: 0,
        ngo: 0
      }

      userGrowthRaw.forEach(item => {
        if (item._id.year === year && item._id.month === month) {
          if (item._id.role === 'worker') monthData.worker = item.count
          if (item._id.role === 'enterprise') monthData.enterprise = item.count
          if (item._id.role === 'trainer') monthData.trainer = item.count
          if (item._id.role === 'ngo') monthData.ngo = item.count
        }
      })

      userGrowth.push(monthData)
    }

    // 3. Account Conversion Status by Role
    const conversionRaw = await db.collection(userModel.USER_COLLECTION_NAME).aggregate([
      { $match: { _destroy: { $ne: true }, ...dateMatch } },
      {
        $group: {
          _id: { role: '$role', status: '$adminApprovalStatus' },
          count: { $sum: 1 }
        }
      }
    ]).toArray()

    const conversionStatus = {
      worker: { approved: 0, pending: 0, rejected: 0 },
      enterprise: { approved: 0, pending: 0, rejected: 0 },
      trainer: { approved: 0, pending: 0, rejected: 0 },
      ngo: { approved: 0, pending: 0, rejected: 0 }
    }

    conversionRaw.forEach(item => {
      const role = item._id.role
      const status = item._id.status || 'approved'
      if (conversionStatus[role] && conversionStatus[role][status] !== undefined) {
        conversionStatus[role][status] = item.count
      }
    })

    // 4. All Users (Changed from Recent Users)
    const recentUsers = await db.collection(userModel.USER_COLLECTION_NAME).aggregate([
      { $match: { _destroy: { $ne: true }, ...dateMatch } },
      { $sort: { createdAt: -1 } },
      {
        $addFields: {
          orgObjectId: {
            $cond: {
              if: {
                $and: [
                  { $ne: [{ $type: '$organizationId' }, 'missing'] },
                  { $ne: ['$organizationId', null] },
                  { $ne: ['$organizationId', ''] },
                  { $regexMatch: { input: { $toString: '$organizationId' }, regex: /^[a-fA-F0-9]{24}$/ } }
                ]
              },
              then: { $toObjectId: '$organizationId' },
              else: null
            }
          }
        }
      },
      {
        $lookup: {
          from: 'organizations',
          localField: 'orgObjectId',
          foreignField: '_id',
          as: 'organization'
        }
      },
      {
        $unwind: { path: '$organization', preserveNullAndEmptyArrays: true }
      },
      { $project: { password: 0, orgObjectId: 0 } }
    ]).toArray()

    const formattedRecentUsers = recentUsers.map(user => {
      let displayName = user.displayName || user.username
      let avatar = user.avatar || ''

      if ((user.role === 'enterprise' || user.role === 'ngo') && user.organization) {
        if (user.organization.name) displayName = user.organization.name
        if (user.organization.logo) avatar = user.organization.logo
      }

      return {
        _id: user._id,
        email: user.email,
        displayName,
        avatar,
        role: user.role,
        status: user.adminApprovalStatus || 'approved',
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt || null,
        phone: user.phone || null
      }
    })

    return {
      overview: {
        totalUsers,
        pendingUsers,
        active7d,
        active30d,
        totalWorkers,
        totalEnterprises,
        totalTrainers,
        totalNGOs,
        totalAdmins
      },
      userGrowth,
      conversionStatus,
      recentUsers: formattedRecentUsers
    }
  } catch (error) {
    throw new Error(error.message)
  }
}

const getTrainingAnalytics = async (timeRange = '6M') => {
  try {
    const db = await GET_DB()
    const now = new Date()
    let startDate = new Date(0)

    if (timeRange === '7D') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (timeRange === '30D') {
      startDate = new Date(now.setMonth(now.getMonth() - 1))
    } else if (timeRange === '6M') {
      startDate = new Date(now.setMonth(now.getMonth() - 6))
    } else if (timeRange === '1Y') {
      startDate = new Date(now.setFullYear(now.getFullYear() - 1))
    }
    const dateMatch = timeRange !== 'ALL' ? { createdAt: { $gte: startDate.getTime() } } : {}

    // 1. OVERVIEW
    const totalCourses = await db.collection(courseModel.COURSE_COLLECTION_NAME).countDocuments({ _destroy: { $ne: true } })
    const pendingCourses = await db.collection(courseModel.COURSE_COLLECTION_NAME).countDocuments({ _destroy: { $ne: true }, status: courseModel.COURSE_STATUS.PENDING })
    const totalEnrollments = await db.collection(enrollmentModel.ENROLLMENT_COLLECTION_NAME).countDocuments({ _destroy: { $ne: true } })
    const totalCertificates = await db.collection(certificateModel.CERTIFICATE_COLLECTION_NAME).countDocuments({ _destroy: { $ne: true } })

    // Revenue (Admin Share = 20% of completed payments with courseId)
    const payments = await db.collection(paymentModel.PAYMENT_COLLECTION_NAME).find({
      _destroy: { $ne: true },
      status: paymentModel.PAYMENT_STATUS.COMPLETED,
      courseId: { $ne: null }
    }).toArray()
    const adminRevenue = payments.reduce((sum, p) => sum + (p.amount * 0.2), 0)

    // 2. CHARTS
    // Course Status Data
    const courseStatusStats = await db.collection(courseModel.COURSE_COLLECTION_NAME).aggregate([
      { $match: { _destroy: { $ne: true } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray()
    const courseStatusData = courseStatusStats.map(stat => ({
      name: stat._id,
      value: stat.count
    }))

    // Enrollment Growth (Last 6 months)
    const enrollmentGrowth = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1).getTime()
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).getTime()

      const count = await db.collection(enrollmentModel.ENROLLMENT_COLLECTION_NAME).countDocuments({
        _destroy: { $ne: true },
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
      })

      enrollmentGrowth.push({
        name: `T${d.getMonth() + 1}`,
        enrollments: count
      })
    }

    // Revenue Growth (Last 6 months)
    const revenueGrowth = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1).getTime()
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).getTime()

      const paymentsInMonth = await db.collection(paymentModel.PAYMENT_COLLECTION_NAME).find({
        _destroy: { $ne: true },
        status: paymentModel.PAYMENT_STATUS.COMPLETED,
        courseId: { $ne: null },
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
      }).toArray()

      const rev = paymentsInMonth.reduce((sum, p) => sum + (p.amount * 0.2), 0)

      revenueGrowth.push({
        name: `T${d.getMonth() + 1}`,
        revenue: rev
      })
    }

    // Top 5 Courses by Enrollment
    const topCourses = await db.collection(courseModel.COURSE_COLLECTION_NAME)
      .find({ _destroy: { $ne: true } })
      .sort({ enrollmentCount: -1 })
      .limit(5)
      .project({ title: 1, enrollmentCount: 1 })
      .toArray()

    // 3. TABLES (limit 100 for admin view to avoid huge payloads)
    // All Courses
    const coursesTable = await db.collection(courseModel.COURSE_COLLECTION_NAME).aggregate([
      { $match: { _destroy: { $ne: true }, ...dateMatch } },
      { $sort: { createdAt: -1 } },
      { $limit: 100 },
      {
        $addFields: {
          orgObjectId: {
            $cond: {
              if: {
                $and: [
                  { $ne: [{ $type: '$providerId' }, 'missing'] },
                  { $ne: ['$providerId', null] },
                  { $regexMatch: { input: { $toString: '$providerId' }, regex: /^[a-fA-F0-9]{24}$/ } }
                ]
              },
              then: { $toObjectId: '$providerId' },
              else: null
            }
          }
        }
      },
      {
        $lookup: {
          from: 'organizations',
          localField: 'orgObjectId',
          foreignField: '_id',
          as: 'providerOrg'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'orgObjectId',
          foreignField: '_id',
          as: 'providerUser'
        }
      },
      {
        $addFields: {
          providerName: {
            $cond: {
              if: { $gt: [{ $size: '$providerOrg' }, 0] },
              then: { $arrayElemAt: ['$providerOrg.name', 0] },
              else: {
                $cond: {
                  if: { $gt: [{ $size: '$providerUser' }, 0] },
                  then: { $arrayElemAt: ['$providerUser.displayName', 0] },
                  else: 'Unknown'
                }
              }
            }
          }
        }
      },
      {
        $project: { title: 1, providerName: 1, status: 1, fee: 1, enrollmentCount: 1, 'rating.average': 1, createdAt: 1 }
      }
    ]).toArray()

    // Enrollments Table
    const enrollmentsTable = await db.collection(enrollmentModel.ENROLLMENT_COLLECTION_NAME).aggregate([
      { $match: { _destroy: { $ne: true }, ...dateMatch } },
      { $sort: { createdAt: -1 } },
      { $limit: 100 },
      {
        $addFields: {
          userObjId: { $toObjectId: '$userId' },
          courseObjId: { $toObjectId: '$courseId' }
        }
      },
      {
        $lookup: { from: 'users', localField: 'userObjId', foreignField: '_id', as: 'user' }
      },
      {
        $lookup: { from: 'courses', localField: 'courseObjId', foreignField: '_id', as: 'course' }
      },
      {
        $project: {
          userName: { $arrayElemAt: ['$user.displayName', 0] },
          userEmail: { $arrayElemAt: ['$user.email', 0] },
          courseTitle: { $arrayElemAt: ['$course.title', 0] },
          progress: 1,
          status: 1,
          createdAt: 1
        }
      }
    ]).toArray()

    // Transactions Table
    const transactionsTable = await db.collection(paymentModel.PAYMENT_COLLECTION_NAME).aggregate([
      { $match: { _destroy: { $ne: true }, status: paymentModel.PAYMENT_STATUS.COMPLETED, courseId: { $ne: null }, ...dateMatch } },
      { $sort: { createdAt: -1 } },
      { $limit: 100 },
      {
        $addFields: {
          userObjId: { $toObjectId: '$userId' },
          courseObjId: { $toObjectId: '$courseId' }
        }
      },
      {
        $lookup: { from: 'users', localField: 'userObjId', foreignField: '_id', as: 'user' }
      },
      {
        $lookup: { from: 'courses', localField: 'courseObjId', foreignField: '_id', as: 'course' }
      },
      {
        $project: {
          transactionId: 1,
          userName: { $arrayElemAt: ['$user.displayName', 0] },
          courseTitle: { $arrayElemAt: ['$course.title', 0] },
          amount: 1,
          adminShare: { $multiply: ['$amount', 0.2] },
          status: 1,
          createdAt: 1
        }
      }
    ]).toArray()

    // Certificates Table
    const dateMatchForCert = timeRange !== 'ALL' ? { issuedDate: { $gte: startDate.getTime() } } : {}
    const certificatesTable = await db.collection(certificateModel.CERTIFICATE_COLLECTION_NAME).aggregate([
      { $match: { _destroy: { $ne: true }, ...dateMatchForCert } },
      { $sort: { issuedDate: -1 } },
      { $limit: 100 },
      {
        $addFields: {
          userObjId: { $toObjectId: '$userId' },
          courseObjId: { $toObjectId: '$courseId' }
        }
      },
      {
        $lookup: { from: 'users', localField: 'userObjId', foreignField: '_id', as: 'user' }
      },
      {
        $lookup: { from: 'courses', localField: 'courseObjId', foreignField: '_id', as: 'course' }
      },
      {
        $project: {
          certificateId: 1,
          userName: { $arrayElemAt: ['$user.displayName', 0] },
          courseTitle: { $arrayElemAt: ['$course.title', 0] },
          issuedDate: 1
        }
      }
    ]).toArray()

    return {
      overview: {
        totalCourses,
        pendingCourses,
        totalEnrollments,
        totalCertificates,
        adminRevenue
      },
      courseStatusData,
      enrollmentGrowth,
      revenueGrowth,
      topCourses,
      tables: {
        courses: coursesTable,
        enrollments: enrollmentsTable,
        transactions: transactionsTable,
        certificates: certificatesTable
      }
    }
  } catch (error) {
    throw new Error(error.message)
  }
}

const getRecruitmentAnalytics = async (timeRange = 'all') => {
  try {
    const db = GET_DB()
    const now = Date.now()
    let startDate = 0
    if (timeRange === '7d') startDate = now - 7 * 24 * 60 * 60 * 1000
    if (timeRange === '30d') startDate = now - 30 * 24 * 60 * 60 * 1000
    if (timeRange === '90d') startDate = now - 90 * 24 * 60 * 60 * 1000

    const dateMatch = startDate > 0 ? { createdAt: { $gte: startDate } } : {}
    const appDateMatch = startDate > 0 ? { appliedAt: { $gte: startDate } } : {}

    // 1. Overview
    const totalJobs = await db.collection(recruitmentJobModel.RECRUITMENT_JOB_COLLECTION_NAME).countDocuments({ _destroy: { $ne: true }, ...dateMatch })
    const activeJobs = await db.collection(recruitmentJobModel.RECRUITMENT_JOB_COLLECTION_NAME).countDocuments({ status: recruitmentJobModel.RECRUITMENT_JOB_STATUS.PUBLISHED, _destroy: { $ne: true }, ...dateMatch })
    const pendingJobs = await db.collection(recruitmentJobModel.RECRUITMENT_JOB_COLLECTION_NAME).countDocuments({ status: recruitmentJobModel.RECRUITMENT_JOB_STATUS.PENDING_APPROVAL, _destroy: { $ne: true }, ...dateMatch })

    const totalApplications = await db.collection(applicationModel.APPLICATION_COLLECTION_NAME).countDocuments({ _destroy: { $ne: true }, ...appDateMatch })
    const avgApplicationsPerJob = totalJobs > 0 ? parseFloat((totalApplications / totalJobs).toFixed(1)) : 0

    // 2. Charts
    const jobStatusStats = await db.collection(recruitmentJobModel.RECRUITMENT_JOB_COLLECTION_NAME).aggregate([
      { $match: { _destroy: { $ne: true }, ...dateMatch } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray()
    const jobStatusData = jobStatusStats.map(stat => ({
      name: stat._id,
      value: stat.count
    }))

    const growthData = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1).getTime()
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).getTime()

      const jobsCount = await db.collection(recruitmentJobModel.RECRUITMENT_JOB_COLLECTION_NAME).countDocuments({
        _destroy: { $ne: true },
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
      })

      const appsCount = await db.collection(applicationModel.APPLICATION_COLLECTION_NAME).countDocuments({
        _destroy: { $ne: true },
        appliedAt: { $gte: startOfMonth, $lte: endOfMonth }
      })

      growthData.push({
        name: `T${d.getMonth() + 1}`,
        jobs: jobsCount,
        applications: appsCount
      })
    }

    const topJobs = await db.collection(recruitmentJobModel.RECRUITMENT_JOB_COLLECTION_NAME)
      .find({ _destroy: { $ne: true }, ...dateMatch })
      .sort({ 'stats.applications': -1 })
      .limit(5)
      .project({
        title: { $ifNull: ['$job.title', '$title'] },
        applications: { $ifNull: ['$stats.applications', 0] }
      })
      .toArray()

    // 3. Tables
    const jobsTable = await db.collection(recruitmentJobModel.RECRUITMENT_JOB_COLLECTION_NAME).aggregate([
      { $match: { _destroy: { $ne: true }, ...dateMatch } },
      { $sort: { createdAt: -1 } },
      { $limit: 100 },
      {
        $project: {
          title: { $ifNull: ['$job.title', '$title'] },
          enterpriseName: { $ifNull: ['$enterpriseInfo.name', 'Chưa cập nhật'] },
          salaryMin: { $ifNull: ['$job.salary.min', '$salary.min'] },
          salaryMax: { $ifNull: ['$job.salary.max', '$salary.max'] },
          applications: { $ifNull: ['$stats.applications', 0] },
          status: 1,
          createdAt: 1
        }
      }
    ]).toArray()

    const applicationsTable = await db.collection(applicationModel.APPLICATION_COLLECTION_NAME).aggregate([
      { $match: { _destroy: { $ne: true }, ...appDateMatch } },
      { $sort: { appliedAt: -1 } },
      { $limit: 100 },
      {
        $addFields: {
          userObjId: { $toObjectId: '$workerId' },
          jobObjId: { $toObjectId: '$jobId' }
        }
      },
      {
        $lookup: { from: 'users', localField: 'userObjId', foreignField: '_id', as: 'user' }
      },
      {
        $lookup: { from: 'recruitment_jobs', localField: 'jobObjId', foreignField: '_id', as: 'job' }
      },
      {
        $project: {
          userName: { $arrayElemAt: ['$user.displayName', 0] },
          jobTitle: {
            $ifNull: [
              { $arrayElemAt: ['$job.job.title', 0] },
              { $arrayElemAt: ['$job.title', 0] }
            ]
          },
          status: 1,
          enterpriseName: {
            $ifNull: [
              { $arrayElemAt: ['$job.enterpriseInfo.name', 0] },
              'Chưa cập nhật'
            ]
          },
          createdAt: '$appliedAt'
        }
      }
    ]).toArray()

    return {
      overview: {
        totalJobs,
        activeJobs,
        pendingJobs,
        totalApplications,
        avgApplicationsPerJob
      },
      jobStatusData,
      growthData,
      topJobs,
      tables: {
        jobs: jobsTable,
        applications: applicationsTable
      }
    }
  } catch (error) {
    throw new Error(error.message)
  }
}

const getFinancialAnalytics = async (timeRange = 'all') => {
  try {
    const db = GET_DB()
    const now = Date.now()
    let startDate = 0
    if (timeRange === '7d') startDate = now - 7 * 24 * 60 * 60 * 1000
    if (timeRange === '30d') startDate = now - 30 * 24 * 60 * 60 * 1000
    if (timeRange === '90d') startDate = now - 90 * 24 * 60 * 60 * 1000

    const dateMatch = startDate > 0 ? { createdAt: { $gte: startDate } } : {}

    // 1. Overview Cards
    const serviceRevenueResult = await db.collection(transactionModel.TRANSACTION_COLLECTION_NAME).aggregate([
      { $match: { type: 'PAYMENT', referenceModel: 'ServicePackage', status: 'COMPLETED', ...dateMatch } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).toArray()
    const serviceRevenue = serviceRevenueResult[0] ? serviceRevenueResult[0].total : 0

    const commissionResult = await db.collection(transactionModel.TRANSACTION_COLLECTION_NAME).aggregate([
      { $match: { type: 'SYSTEM_FEE', status: 'COMPLETED', ...dateMatch } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).toArray()
    const courseCommission = commissionResult[0] ? commissionResult[0].total : 0

    const depositResult = await db.collection(transactionModel.TRANSACTION_COLLECTION_NAME).aggregate([
      { $match: { type: 'DEPOSIT', status: 'COMPLETED', ...dateMatch } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).toArray()
    const totalDeposits = depositResult[0] ? depositResult[0].total : 0

    const totalRevenue = serviceRevenue + courseCommission

    // 2. Charts
    // Revenue Breakdown PieChart
    const revenueBreakdown = [
      { name: 'Gói Dịch Vụ', value: serviceRevenue },
      { name: 'Hoa Hồng Khóa Học', value: courseCommission }
    ]

    // Growth Chart (6 months)
    const growthData = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1).getTime()
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).getTime()

      const monthlyService = await db.collection(transactionModel.TRANSACTION_COLLECTION_NAME).aggregate([
        { $match: { type: 'PAYMENT', referenceModel: 'ServicePackage', status: 'COMPLETED', createdAt: { $gte: startOfMonth, $lte: endOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).toArray()

      const monthlyCommission = await db.collection(transactionModel.TRANSACTION_COLLECTION_NAME).aggregate([
        { $match: { type: 'SYSTEM_FEE', status: 'COMPLETED', createdAt: { $gte: startOfMonth, $lte: endOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).toArray()

      const monthlyDepositCount = await db.collection(transactionModel.TRANSACTION_COLLECTION_NAME).countDocuments({
        type: 'DEPOSIT', status: 'COMPLETED', createdAt: { $gte: startOfMonth, $lte: endOfMonth }
      })

      const monthlyDepositSum = await db.collection(transactionModel.TRANSACTION_COLLECTION_NAME).aggregate([
        { $match: { type: 'DEPOSIT', status: 'COMPLETED', createdAt: { $gte: startOfMonth, $lte: endOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).toArray()

      const mService = monthlyService[0] ? monthlyService[0].total : 0
      const mCommission = monthlyCommission[0] ? monthlyCommission[0].total : 0

      growthData.push({
        name: `T${d.getMonth() + 1}`,
        revenue: mService + mCommission,
        service: mService,
        commission: mCommission,
        deposits: monthlyDepositSum[0] ? monthlyDepositSum[0].total : 0,
        transactions: monthlyDepositCount
      })
    }

    // 3. Tables
    const courseDateMatch = startDate > 0 ? { createdAt: { $gte: startDate } } : {}

    // a. Course Transactions
    const courseTransactions = await db.collection(paymentModel.PAYMENT_COLLECTION_NAME).aggregate([
      { $match: { _destroy: { $ne: true }, courseId: { $exists: true, $ne: null, $ne: '' }, ...courseDateMatch } },
      { $sort: { createdAt: -1 } },
      { $limit: 100 },
      {
        $addFields: {
          userObjId: { $toObjectId: '$userId' },
          courseObjId: { $toObjectId: '$courseId' }
        }
      },
      { $lookup: { from: 'users', localField: 'userObjId', foreignField: '_id', as: 'user' } },
      { $lookup: { from: 'courses', localField: 'courseObjId', foreignField: '_id', as: 'course' } },
      {
        $project: {
          userName: { $arrayElemAt: ['$user.displayName', 0] },
          courseTitle: { $arrayElemAt: ['$course.title', 0] },
          amount: 1,
          status: 1,
          createdAt: 1,
          method: 1
        }
      }
    ]).toArray()

    // b. Service Packages
    const serviceTransactions = await db.collection(transactionModel.TRANSACTION_COLLECTION_NAME).aggregate([
      { $match: { type: 'PAYMENT', referenceModel: 'ServicePackage', ...dateMatch } },
      { $sort: { createdAt: -1 } },
      { $limit: 100 },
      {
        $addFields: {
          userObjId: { $toObjectId: '$userId' },
          packageObjId: { $toObjectId: '$referenceId' }
        }
      },
      { $lookup: { from: 'users', localField: 'userObjId', foreignField: '_id', as: 'user' } },
      { $lookup: { from: 'service_packages', localField: 'packageObjId', foreignField: '_id', as: 'package' } },
      {
        $project: {
          userName: { $arrayElemAt: ['$user.displayName', 0] },
          packageName: { $arrayElemAt: ['$package.name', 0] },
          amount: 1,
          status: 1,
          createdAt: 1
        }
      }
    ]).toArray()

    // c. Deposits/Withdrawals
    const walletTransactions = await db.collection(transactionModel.TRANSACTION_COLLECTION_NAME).aggregate([
      { $match: { type: { $in: ['DEPOSIT', 'WITHDRAW', 'DISBURSE'] }, ...dateMatch } },
      { $sort: { createdAt: -1 } },
      { $limit: 100 },
      {
        $addFields: {
          userObjId: { $toObjectId: '$userId' }
        }
      },
      { $lookup: { from: 'users', localField: 'userObjId', foreignField: '_id', as: 'user' } },
      {
        $project: {
          userName: { $arrayElemAt: ['$user.displayName', 0] },
          type: 1,
          amount: 1,
          status: 1,
          createdAt: 1,
          description: 1
        }
      }
    ]).toArray()

    // 4. Payment Methods Breakdown
    const vnpayPayments = await db.collection(paymentModel.PAYMENT_COLLECTION_NAME).aggregate([
      { $match: { method: 'vnpay', status: paymentModel.PAYMENT_STATUS.COMPLETED, _destroy: { $ne: true }, ...dateMatch } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).toArray()

    const walletPayments = await db.collection(transactionModel.TRANSACTION_COLLECTION_NAME).aggregate([
      { $match: { type: 'PAYMENT', status: 'COMPLETED', ...dateMatch } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).toArray()

    const paymentMethods = [
      { name: 'VNPAY', value: vnpayPayments[0] ? vnpayPayments[0].total : 0 },
      { name: 'Ví nội bộ', value: walletPayments[0] ? walletPayments[0].total : 0 }
    ]

    return {
      overview: {
        totalRevenue,
        serviceRevenue,
        courseCommission,
        totalDeposits
      },
      paymentMethods,
      revenueBreakdown,
      growthData,
      tables: {
        courseTransactions,
        serviceTransactions,
        walletTransactions
      }
    }
  } catch (error) {
    throw new Error(error.message)
  }
}

// ============ Community Analytics ============
const getCommunityAnalytics = async (timeRange = 'all') => {
  try {
    const db = GET_DB()
    let dateMatch = {}
    
    if (timeRange !== 'all') {
      const now = new Date()
      let startDate = new Date()
      if (timeRange === '7D') {
        startDate.setDate(now.getDate() - 7)
      } else if (timeRange === '30D') {
        startDate.setDate(now.getDate() - 30)
      } else if (timeRange === '6M') {
        startDate.setMonth(now.getMonth() - 6)
      } else if (timeRange === '1Y') {
        startDate.setFullYear(now.getFullYear() - 1)
      }
      dateMatch = { createdAt: { $gte: startDate.getTime() } }
    }

    const postFilter = { _destroy: { $ne: true }, ...dateMatch }

    // 1. Overview KPIs
    const [overviewData] = await db.collection(forumPostModel.POST_COLLECTION_NAME).aggregate([
      { $match: postFilter },
      { 
        $group: { 
          _id: null, 
          totalPosts: { $sum: 1 }, 
          totalComments: { $sum: '$commentCount' },
          totalLikes: { $sum: '$reactions.thumbsUp' }
        } 
      }
    ]).toArray()

    const totalPosts = overviewData ? overviewData.totalPosts : 0
    const totalComments = overviewData ? overviewData.totalComments : 0
    const totalLikes = overviewData ? overviewData.totalLikes : 0

    const activePostersAgg = await db.collection(forumPostModel.POST_COLLECTION_NAME).aggregate([
      { $match: postFilter },
      { $group: { _id: '$authorId' } }
    ]).toArray()
    const activePosters = activePostersAgg.map(p => p._id)

    const activeCommentersAgg = await db.collection(commentModel.COMMENT_COLLECTION_NAME).aggregate([
      { $match: { _destroy: { $ne: true }, ...dateMatch } },
      { $group: { _id: '$authorId' } }
    ]).toArray()
    const activeCommenters = activeCommentersAgg.map(c => c._id)
    
    const activeMembersSet = new Set([...activePosters.map(id => id?.toString()), ...activeCommenters.map(id => id?.toString())])
    // Remove undefined/null if any
    activeMembersSet.delete('undefined')
    activeMembersSet.delete('null')
    const activeMembers = activeMembersSet.size

    // 2. Category Breakdown
    const categoryData = await db.collection(forumPostModel.POST_COLLECTION_NAME).aggregate([
      { $match: postFilter },
      { $group: { _id: '$categoryId', count: { $sum: 1 } } },
      {
        $lookup: {
          from: communityCategoryModel.CATEGORY_COLLECTION_NAME,
          localField: '_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: { $ifNull: ['$category.name', 'Khác'] },
          value: '$count'
        }
      }
    ]).toArray()

    // 3. Growth Data
    const groupByFormat = timeRange === '7D' || timeRange === '30D' ? '%Y-%m-%d' : '%Y-%m'
    
    const postsGrowth = await db.collection(forumPostModel.POST_COLLECTION_NAME).aggregate([
      { $match: postFilter },
      {
        $group: {
          _id: { $dateToString: { format: groupByFormat, date: { $toDate: '$createdAt' }, timezone: '+07:00' } },
          posts: { $sum: 1 },
          comments: { $sum: '$commentCount' }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray()
    
    const growthData = postsGrowth.map(item => ({
      name: item._id,
      posts: item.posts,
      comments: item.comments
    }))

    // 4. Trending Posts
    const trendingPosts = await db.collection(forumPostModel.POST_COLLECTION_NAME).aggregate([
      { $match: postFilter },
      { 
        $addFields: {
           score: { $add: [{ $ifNull: ['$commentCount', 0] }, { $ifNull: ['$reactions.thumbsUp', 0] }] }
        }
      },
      { $sort: { score: -1, createdAt: -1 } },
      { $limit: 10 },
      { $lookup: { from: userModel.USER_COLLECTION_NAME, localField: 'authorId', foreignField: '_id', as: 'author' } },
      { $unwind: { path: '$author', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: communityCategoryModel.CATEGORY_COLLECTION_NAME, localField: 'categoryId', foreignField: '_id', as: 'category' } },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          title: 1,
          content: 1,
          authorName: '$author.displayName',
          authorAvatar: '$author.avatar',
          categoryName: '$category.name',
          likes: { $ifNull: ['$reactions.thumbsUp', 0] },
          comments: { $ifNull: ['$commentCount', 0] },
          createdAt: 1,
          score: 1
        }
      }
    ]).toArray()

    // 5. Top Members
    const topMembers = await db.collection(forumPostModel.POST_COLLECTION_NAME).aggregate([
      { $match: postFilter },
      { $group: { _id: '$authorId', postsCount: { $sum: 1 }, totalLikesReceived: { $sum: '$reactions.thumbsUp' } } },
      { $sort: { postsCount: -1 } },
      { $limit: 10 },
      { $lookup: { from: userModel.USER_COLLECTION_NAME, localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          userName: '$user.displayName',
          userAvatar: '$user.avatar',
          email: '$user.email',
          postsCount: 1,
          totalLikesReceived: 1
        }
      }
    ]).toArray()

    return {
      overview: {
        totalPosts,
        totalComments,
        totalLikes,
        activeMembers
      },
      categoryData,
      growthData,
      tables: {
        trendingPosts,
        topMembers
      }
    }
  } catch (error) {
    throw new Error(error.message)
  }
}

export const adminAnalyticsService = {
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
  getCommunityAnalytics
}
