import { randomUUID } from 'node:crypto'
import { findSpeakerByEmail, updateSpeakerRow } from '~/server/utils/speakerStore'
import { sendPasswordResetEmail } from '~/server/utils/mailer'

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as { email?: string }
  const email = body?.email?.trim().toLowerCase()

  if (!email) {
    throw createError({ statusCode: 400, statusMessage: 'Email is required' })
  }

  // Always return success to prevent user enumeration
  const found = await findSpeakerByEmail(email)
  if (!found || found.speaker.status !== 'active') {
    return { ok: true }
  }

  const resetToken = randomUUID()
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour

  await updateSpeakerRow(found.rowIndex, {
    ...found.speaker,
    resetToken,
    resetTokenExpiry,
  })

  const siteUrl = process.env.SITE_URL?.replace(/\/$/, '')
    ?? (() => {
      const proto = getHeader(event, 'x-forwarded-proto') ?? getRequestURL(event).protocol.replace(':', '')
      const host = getHeader(event, 'host') ?? getRequestURL(event).host
      return `${proto}://${host}`
    })()

  await sendPasswordResetEmail(email, `${siteUrl}/speaker/reset-password?token=${resetToken}`)

  return { ok: true }
})
