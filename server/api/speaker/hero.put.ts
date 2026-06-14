import { useSpeakerSession } from '~/server/utils/session'
import { findSpeakerByEmail, updateSpeakerRow } from '~/server/utils/speakerStore'
import superheroes from '~/types/heroes'

export default defineEventHandler(async (event) => {
  const session = await useSpeakerSession(event)
  const { email } = session.data

  if (!email) throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })

  const body = await readBody(event)
  const { heroName } = body ?? {}

  if (!heroName || typeof heroName !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'heroName is required' })
  }

  if (!superheroes.includes(heroName)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid hero name' })
  }

  const found = await findSpeakerByEmail(email)
  if (!found || found.speaker.status !== 'active') {
    await session.clear()
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }

  await updateSpeakerRow(found.rowIndex, { ...found.speaker, heroName })

  return { heroName }
})
