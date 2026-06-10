import { contactModel } from '~/models/contactModel'
import { BrevoProvider } from '~/providers/BrevoProvider'
import { env } from '~/config/enviroment'

const buildAdminEmailHtml = (data) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 12px;">
      <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Restart 35+ — Liên hệ mới</h1>
      </div>
      <div style="background: white; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;">Họ tên</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111827; font-size: 14px;">${data.name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email</td>
            <td style="padding: 8px 0; color: #2563eb; font-size: 14px;"><a href="mailto:${data.email}">${data.email}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Chủ đề</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px;">
              <span style="background: #dbeafe; color: #1d4ed8; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">${data.subject}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; vertical-align: top;">Tin nhắn</td>
            <td style="padding: 8px 0; color: #374151; font-size: 14px; line-height: 1.6;">${data.message.replace(/\n/g, '<br/>')}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Thời gian</td>
            <td style="padding: 8px 0; color: #9ca3af; font-size: 13px;">${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</td>
          </tr>
        </table>
        <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">Vui lòng phản hồi trong vòng 24 giờ làm việc.</p>
        </div>
      </div>
    </div>
  `
}

const createContact = async (reqBody) => {
  const created = await contactModel.createNew(reqBody)

  try {
    const emailHtml = buildAdminEmailHtml(reqBody)
    await BrevoProvider.sendEmail(
      env.ADMIN_EMAIL_ADDRESS,
      `[Restart 35+] Liên hệ mới — ${reqBody.subject}`,
      emailHtml
    )
  } catch (err) {
    console.error('[contactService] Gửi email thông báo thất bại:', err.message)
  }

  return created
}

const getContacts = async (query) => {
  const { page = 1, limit = 20 } = query
  return await contactModel.findAll({ page: Number(page), limit: Number(limit) })
}

const markReplied = async (id) => {
  return await contactModel.markReplied(id)
}

export const contactService = {
  createContact,
  getContacts,
  markReplied
}
