import { findSpeakerByEmail } from '~/server/utils/speakerStore'

export default defineEventHandler(async (event) => {
  if (process.env.NODE_ENV === 'production') {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const email = (getQuery(event).email as string | undefined)?.trim().toLowerCase()
  if (!email) throw createError({ statusCode: 400, statusMessage: 'Missing email query parameter' })

  const found = await findSpeakerByEmail(email)
  if (!found?.speaker.resetToken) {
    throw createError({ statusCode: 404, statusMessage: 'No pending reset token for this email' })
  }

  return { resetToken: found.speaker.resetToken }
})
