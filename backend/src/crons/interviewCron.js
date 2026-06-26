import cron from 'node-cron'
import { interviewModel } from '~/models/interviewModel'
import { userModel } from '~/models/userModel'
import { notificationService } from '~/services/notificationService'
import { BrevoProvider } from '~/providers/BrevoProvider'
import { applicationModel } from '~/models/applicationModel'
import { RECRUITMENT_APPLICATION_STATUS } from '~/utils/constants'

const sendReminderEmailsAndNotifications = async (interviews, reminderType, timeLabel) => {
  for (const interview of interviews) {
    try {
      const [worker, enterprise] = await Promise.all([
        userModel.findOneById(interview.workerId),
        userModel.findOneById(interview.enterpriseId)
      ])

      const dateStr = new Date(interview.scheduledAt).toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })

      const title = 'Nhắc nhở phỏng vấn sắp tới'
      const message = `Bạn có một lịch phỏng vấn sẽ diễn ra vào ${dateStr} (trong vòng ${timeLabel} tới). Vui lòng chuẩn bị sẵn sàng.`

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #059669;">Nhắc nhở lịch phỏng vấn</h2>
          <p>Xin chào,</p>
          <p>${message}</p>
          <p><strong>Hình thức:</strong> ${interview.meetingType === 'google_meet' ? 'Google Meet' : interview.meetingType === 'office' ? 'Trực tiếp tại văn phòng' : 'Điện thoại'}</p>
          ${interview.meetingLink ? `<p><strong>Link tham gia:</strong> <a href="${interview.meetingLink}">${interview.meetingLink}</a></p>` : ''}
          ${interview.officeAddress ? `<p><strong>Địa chỉ:</strong> ${interview.officeAddress}</p>` : ''}
          <br>
          <p>Trân trọng,</p>
          <p>Đội ngũ Restart-35</p>
        </div>
      `

      // 1. Notify Worker
      if (worker) {
        await notificationService.createUserNotification(worker._id.toString(), {
          title,
          message,
          type: 'INTERVIEW_REMINDER',
          link: `/my/interviews/${interview._id.toString()}`
        })
        if (worker.email) {
          await BrevoProvider.sendEmail(worker.email, title, htmlContent).catch(e => console.error(e))
        }
      }

      // 2. Notify Enterprise
      if (enterprise) {
        await notificationService.createUserNotification(enterprise._id.toString(), {
          title,
          message,
          type: 'INTERVIEW_REMINDER',
          link: `/enterprise/interviews/${interview._id.toString()}`
        })
        if (enterprise.email) {
          await BrevoProvider.sendEmail(enterprise.email, title, htmlContent).catch(e => console.error(e))
        }
      }

      // 3. Mark reminder as sent
      await interviewModel.addReminder(interview._id.toString(), {
        type: reminderType,
        sentAt: Date.now()
      })
    } catch (err) {
      console.error(`[Cron] Lỗi khi gửi nhắc nhở cho phỏng vấn ${interview._id}:`, err)
    }
  }
}

const sendPostInterviewReminders = async (interviews) => {
  for (const interview of interviews) {
    try {
      const enterprise = await userModel.findOneById(interview.enterpriseId)

      const title = 'Cập nhật kết quả phỏng vấn'
      const message = 'Cuộc phỏng vấn đã kết thúc. Vui lòng cập nhật kết quả đánh giá cho ứng viên.'

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #059669;">Nhắc nhở cập nhật kết quả</h2>
          <p>Xin chào,</p>
          <p>${message}</p>
          <p>Vui lòng truy cập hệ thống để đánh giá <strong>Đỗ/Trượt</strong> hoặc xác nhận <strong>Vắng mặt</strong> nhằm hoàn tất quy trình.</p>
          <br>
          <p>Trân trọng,</p>
          <p>Đội ngũ Restart-35</p>
        </div>
      `

      if (enterprise) {
        await notificationService.createUserNotification(enterprise._id.toString(), {
          title,
          message,
          type: 'INTERVIEW_REMINDER',
          link: `/enterprise/interviews/${interview._id.toString()}`
        })
        if (enterprise.email) {
          await BrevoProvider.sendEmail(enterprise.email, title, htmlContent).catch(e => console.error(e))
        }
      }

      await interviewModel.addReminder(interview._id.toString(), {
        type: 'reminder_post_interview',
        sentAt: Date.now()
      })
    } catch (err) {
      console.error(`[Cron] Lỗi khi gửi nhắc nhở cập nhật kết quả phỏng vấn ${interview._id}:`, err)
    }
  }
}

const handleAutoExpireInterviews = async (interviews) => {
  for (const interview of interviews) {
    try {
      // 1. Mark interview as EXPIRED
      await interviewModel.markAsExpired(interview._id.toString())

      // 2. Rollback application to SHORTLISTED
      await applicationModel.updateStatus(
        interview.applicationId,
        RECRUITMENT_APPLICATION_STATUS.SHORTLISTED,
        interview.enterpriseId,
        'Hệ thống tự động: Quá hạn cập nhật kết quả phỏng vấn.'
      )

      console.log(`[Cron] Đã tự động đóng phỏng vấn quá hạn: ${interview._id}`)
    } catch (err) {
      console.error(`[Cron] Lỗi khi xử lý quá hạn phỏng vấn ${interview._id}:`, err)
    }
  }
}

export const startInterviewCron = () => {
  // Chạy mỗi 30 phút (0, 30)
  cron.schedule('*/30 * * * *', async () => {
    console.log('[Cron] Chạy tiến trình kiểm tra nhắc nhở phỏng vấn...')
    try {
      const now = Date.now()

      // 1. Quét mốc 24h tới: (hiện tại + 1h) đến (hiện tại + 24h)
      // Điều này đảm bảo: Nếu DN đặt lịch bất thình lình 13 tiếng tới, cron vẫn bắt được vì nó nằm trong khoảng < 24h.
      // Chặn dưới 1h để không trùng với luồng nhắc nhở 1h (tránh gửi 2 email cùng lúc nếu DN đặt lịch gấp < 1h).
      const start24h = now + 1 * 60 * 60 * 1000
      const end24h = now + 24 * 60 * 60 * 1000
      const interviews24h = await interviewModel.findInterviewsForReminder(start24h, end24h, 'reminder_24h')

      if (interviews24h.length > 0) {
        console.log(`[Cron] Tìm thấy ${interviews24h.length} lịch phỏng vấn sắp diễn ra trong 24h tới.`)
        await sendReminderEmailsAndNotifications(interviews24h, 'reminder_24h', '24 giờ')
      }

      // 2. Quét mốc 1h tới: (hiện tại) đến (hiện tại + 1h)
      const start1h = now
      const end1h = now + 1 * 60 * 60 * 1000
      const interviews1h = await interviewModel.findInterviewsForReminder(start1h, end1h, 'reminder_1h')

      if (interviews1h.length > 0) {
        console.log(`[Cron] Tìm thấy ${interviews1h.length} lịch phỏng vấn sắp diễn ra trong 1h tới.`)
        await sendReminderEmailsAndNotifications(interviews1h, 'reminder_1h', '1 giờ')
      }

      // 3. Quét mốc quá giờ phỏng vấn (Sau 2 tiếng)
      // Tìm các lịch đã kết thúc (nghĩa là now > scheduledAt + duration)
      // Vì duration chưa được lấy ra cụ thể ở db query, ta lấy mốc an toàn là `scheduledAt < (now - 2 tiếng)`.
      const past2h = now - 2 * 60 * 60 * 1000
      const interviewsPast2h = await interviewModel.findPastInterviewsForReminder(past2h, 'reminder_post_interview')

      if (interviewsPast2h.length > 0) {
        console.log(`[Cron] Tìm thấy ${interviewsPast2h.length} lịch phỏng vấn đã kết thúc, gửi nhắc nhở cập nhật kết quả.`)
        await sendPostInterviewReminders(interviewsPast2h)
      }

      // 4. Quét mốc quá hạn (Sau 3 ngày)
      const past3d = now - 3 * 24 * 60 * 60 * 1000
      const expiredInterviews = await interviewModel.findExpiredInterviews(past3d)

      if (expiredInterviews.length > 0) {
        console.log(`[Cron] Tìm thấy ${expiredInterviews.length} lịch phỏng vấn quá hạn (hơn 3 ngày). Tiến hành auto-expire.`)
        await handleAutoExpireInterviews(expiredInterviews)
      }

    } catch (error) {
      console.error('[Cron] Lỗi khi chạy tiến trình nhắc nhở phỏng vấn:', error)
    }
  })
}
