import { findSpeakerByResetToken } from '~/server/utils/speakerStore'

export default defineEventHandler(async (event) => {
  const token = getQuery(event).token as string | undefined

  if (!token) {
    throw createError({ statusCode: 400, statusMessage: 'Missing reset token' })
  }

  const found = await findSpeakerByResetToken(token)
  if (!found) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid or expired reset token' })
  }
  if (new Date(found.speaker.resetTokenExpiry!) < new Date()) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid or expired reset token' })
  }

  return { ok: true }
})
