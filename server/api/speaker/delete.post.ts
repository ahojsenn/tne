import { useSpeakerSession } from '~/server/utils/session'
import { findSpeakerByEmail, deleteSpeakerRow } from '~/server/utils/speakerStore'

export default defineEventHandler(async (event) => {
  const session = await useSpeakerSession(event)
  const { email } = session.data

  if (!email) throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })

  const found = await findSpeakerByEmail(email)
  if (!found || found.speaker.status !== 'active') {
    await session.clear()
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }

  await deleteSpeakerRow(found.rowIndex)
  await session.clear()

  return { ok: true }
})
