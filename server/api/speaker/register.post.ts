import { randomUUID } from 'node:crypto'
import bcrypt from 'bcrypt'
import { findSpeakerByEmail, appendSpeaker, updateSpeakerRow } from '~/server/utils/speakerStore'
import { sendConfirmationEmail } from '~/server/utils/mailer'

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as { email?: string; displayName?: string; password?: string; confirmPassword?: string }

  const email = body?.email?.trim().toLowerCase()
  const displayName = body?.displayName?.trim()
  const password = body?.password
  const confirmPassword = body?.confirmPassword

  if (!email || !displayName || !password || !confirmPassword) {
    throw createError({ statusCode: 400, statusMessage: 'All fields are required' })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid email address' })
  }
  if (password.length < 8) {
    throw createError({ statusCode: 400, statusMessage: 'Password must be at least 8 characters' })
  }
  if (password !== confirmPassword) {
    throw createError({ statusCode: 400, statusMessage: 'Passwords do not match' })
  }

  const existing = await findSpeakerByEmail(email)
  if (existing?.speaker.status === 'active') {
    throw createError({ statusCode: 409, statusMessage: 'An account with this email already exists' })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const confirmToken = randomUUID()
  const confirmTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  if (existing?.speaker.status === 'pending') {
    // Resend: update the token in-place
    await updateSpeakerRow(existing.rowIndex, {
      ...existing.speaker,
      passwordHash,
      confirmToken,
      confirmTokenExpiry,
    })
  } else {
    await appendSpeaker({ email, displayName, passwordHash, status: 'pending', confirmToken, confirmTokenExpiry })
  }

  const host = getRequestURL(event).origin
  const confirmUrl = `${host}/speaker/confirm?token=${confirmToken}`
  await sendConfirmationEmail(email, confirmUrl)

  return { ok: true }
})
