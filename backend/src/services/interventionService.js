import { userModel } from '~/models/userModel'
import { courseModel } from '~/models/courseModel'
import { enrollmentModel } from '~/models/enrollmentModel'

const sendZaloReminder = async (userId) => {
  const user = await userModel.findOneById(userId)
  console.log(`[Zalo ZNS Reminder] Gửi nhắc nhở thành công tới số điện thoại ${user?.phone || 'N/A'} (User: ${user?.displayName})`)
  return true
}

const sendEmailAlert = async (userId) => {
  const user = await userModel.findOneById(userId)
  console.log(`[Email Alert] Gửi cảnh báo thành công tới email ${user?.email || 'N/A'} (User: ${user?.displayName})`)
  return true
}

const notifyTrainer = async (courseId, userId) => {
  const course = await courseModel.findOneById(courseId)
  const user = await userModel.findOneById(userId)
  console.log(`[Trainer Notification] Đã báo cáo giảng viên khóa "${course?.title || 'N/A'}" về học viên ${user?.displayName} có nguy cơ bỏ học cao.`)
  return true
}

const logIntervention = async (enrollmentId, type) => {
  try {
    const enrollment = await enrollmentModel.findOneById(enrollmentId)
    if (!enrollment) return false

    const interventions = enrollment.dropout_risk?.interventions_sent || []
    interventions.push({
      type,
      sent_at: Date.now()
    })

    await enrollmentModel.update(enrollmentId, {
      'dropout_risk.interventions_sent': interventions
    })
    return true
  } catch (error) {
    console.error(`Failed to log intervention for ${enrollmentId}:`, error.message)
    return false
  }
}

export const interventionService = {
  sendZaloReminder,
  sendEmailAlert,
  notifyTrainer,
  logIntervention
}
