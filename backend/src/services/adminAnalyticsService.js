import { GET_DB } from '~/config/mongodb'
import { userModel } from '~/models/userModel'
import { courseModel } from '~/models/courseModel'
import { applicationModel } from '~/models/applicationModel'
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
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]).toArray()

    const data = monthlyGrowth.map(item => {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      return {
        name: `${monthNames[item._id.month - 1]} ${item._id.year}`,
        users: item.count
      }
    })

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

export const adminAnalyticsService = {
  getKPIs,
  getUserGrowth,
  getRolesDistribution,
  getLearningProgress,
  getApplicationFunnel,
  getApplicationStatus
}
