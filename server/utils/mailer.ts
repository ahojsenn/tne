import nodemailer from 'nodemailer'

function createTransporter() {
  const host = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT ?? '587')
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    return null
  }
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } })
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'noreply@tomatoes-and-eggs.app'
  const subject = 'Reset your Tomatoes & Eggs password'
  const text = `You requested a password reset.\n\nClick the link below to set a new password:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, you can safely ignore this email.`
  const html = `<p>You requested a password reset.</p><p>Click the link below to set a new password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour. If you did not request this, you can safely ignore this email.</p>`

  console.log(`[mailer] password reset link for ${to}: ${resetUrl}`)

  const transporter = createTransporter()
  if (!transporter) {
    console.warn('[mailer] SMTP not configured — email not sent (link logged above)')
    return
  }

  await transporter.sendMail({ from, to, subject, text, html })
}

export async function sendConfirmationEmail(to: string, confirmUrl: string): Promise<void> {
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'noreply@tomatoes-and-eggs.app'
  const subject = 'Confirm your Tomatoes & Eggs speaker account'
  const text = `Welcome! Please confirm your email by visiting:\n\n${confirmUrl}\n\nThis link expires in 24 hours.`
  const html = `<p>Welcome!</p><p>Please confirm your speaker account by clicking the link below:</p><p><a href="${confirmUrl}">${confirmUrl}</a></p><p>This link expires in 24 hours.</p>`

  // Always log to console — allows E2E tests to intercept without a real mailbox
  console.log(`[mailer] confirmation link for ${to}: ${confirmUrl}`)

  const transporter = createTransporter()
  if (!transporter) {
    console.warn('[mailer] SMTP not configured — email not sent (link logged above)')
    return
  }

  await transporter.sendMail({ from, to, subject, text, html })
}
