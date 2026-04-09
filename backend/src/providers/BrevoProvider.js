const SibApiV3Sdk = require('@getbrevo/brevo')
import { env } from '~/config/enviroment'

let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi()
let apiKey = apiInstance.authentications['apiKey']
apiKey.apiKey = env.BREVO_API_KEY

const sendEmail = async (toEmail, customSubject, htmlContent) => {
  let sendSmtpMail = new SibApiV3Sdk.SendSmtpEmail()
  sendSmtpMail.sender = { email: env.ADMIN_EMAIL_ADDRESS, name: env.ADMIN_EMAIL_NAME }

  sendSmtpMail.to = [{ email: toEmail }]

  sendSmtpMail.subject = customSubject

  sendSmtpMail.htmlContent = htmlContent

  return apiInstance.sendTransacEmail(sendSmtpMail)
}

export const BrevoProvider = {
  sendEmail
}
