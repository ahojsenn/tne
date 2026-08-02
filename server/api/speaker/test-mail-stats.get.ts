import { getDeliveryCount } from '~/server/utils/sentMail'

export default defineEventHandler(async (event) => {
  if (process.env.NODE_ENV === 'production') {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  // Number of mails this server process handed to SMTP since boot. Outside
  // production that must stay 0 unless MAIL_DEV_SEND=1 — see mailer.ts.
  return { delivered: getDeliveryCount(), devSendEnabled: process.env.MAIL_DEV_SEND === '1' }
})
