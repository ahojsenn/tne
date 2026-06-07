import bcrypt from 'bcryptjs'
import { findSpeakerByResetToken, updateSpeakerRow } from '~/server/utils/speakerStore'

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as { token?: string; password?: string; confirmPassword?: string }

  const token = body?.token?.trim()
  const password = body?.password
  const confirmPassword = body?.confirmPassword

  if (!token || !password || !confirmPassword) {
    throw createError({ statusCode: 400, statusMessage: 'All fields are required' })
  }
  if (password.length < 8) {
    throw createError({ statusCode: 400, statusMessage: 'Password must be at least 8 characters' })
  }
  if (password !== confirmPassword) {
    throw createError({ statusCode: 400, statusMessage: 'Passwords do not match' })
  }

  const found = await findSpeakerByResetToken(token)
  if (!found) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid or expired reset token' })
  }
  if (new Date(found.speaker.resetTokenExpiry!) < new Date()) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid or expired reset token' })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await updateSpeakerRow(found.rowIndex, {
    ...found.speaker,
    passwordHash,
    resetToken: undefined,
    resetTokenExpiry: undefined,
  })

  return { ok: true }
})
