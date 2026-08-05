import nodemailer from 'nodemailer'
import { recordSentLink, recordDelivery } from './sentMail'

/**
 * Outside production nothing is handed to SMTP. The e2e suite registers, resets
 * and deletes a fresh throwaway account on every run, and each of those would be
 * a real delivery attempt to an address that will never exist (@test.example) —
 * i.e. a bounce charged to the sending account. The tests never read a mailbox
 * anyway: links are logged and recorded (see sentMail) before this gate.
 *
 * Set MAIL_DEV_SEND=1 when you deliberately want a dev server to deliver, e.g.
 * to eyeball the rendered mail in a real client.
 */
function mailSuppressed(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.MAIL_DEV_SEND !== '1'
}

function skipReason(): string {
  return mailSuppressed()
    ? 'delivery disabled outside production (set MAIL_DEV_SEND=1 to send)'
    : 'SMTP not configured'
}

function createTransporter() {
  if (mailSuppressed()) return null

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
  recordSentLink('reset', to, resetUrl)

  const transporter = createTransporter()
  if (!transporter) {
    console.warn(`[mailer] ${skipReason()} — email not sent (link logged above)`)
    return
  }

  await transporter.sendMail({ from, to, subject, text, html })
  recordDelivery()
}

export async function sendConfirmationEmail(to: string, confirmUrl: string): Promise<void> {
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'noreply@tomatoes-and-eggs.app'
  const subject = 'Confirm your Tomatoes & Eggs speaker account'
  const text = `Welcome! Please confirm your email by visiting:\n\n${confirmUrl}\n\nThis link expires in 24 hours.`
  const html = `<p>Welcome!</p><p>Please confirm your speaker account by clicking the link below:</p><p><a href="${confirmUrl}">${confirmUrl}</a></p><p>This link expires in 24 hours.</p>`

  // Always log to console — allows E2E tests to intercept without a real mailbox
  console.log(`[mailer] confirmation link for ${to}: ${confirmUrl}`)
  recordSentLink('confirm', to, confirmUrl)

  const transporter = createTransporter()
  if (!transporter) {
    console.warn(`[mailer] ${skipReason()} — email not sent (link logged above)`)
    return
  }

  await transporter.sendMail({ from, to, subject, text, html })
  recordDelivery()
}
