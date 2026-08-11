import { useSpeakerSession } from '~/server/utils/session'
import { findSpeakerByEmail, updateSpeakerRow } from '~/server/utils/speakerStore'
import { validateHeroName } from '~/types/heroName'

export default defineEventHandler(async (event) => {
  const session = await useSpeakerSession(event)
  const { email } = session.data

  if (!email) throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })

  const body = await readBody(event)

  // Any name is allowed, not only one from types/heroes.ts — that list is now
  // just suggestions in the dashboard. Same validator the UI uses, so the
  // messages match; this call is the authoritative one.
  const check = validateHeroName(body?.heroName)
  if (!check.ok) {
    throw createError({ statusCode: 400, statusMessage: check.message })
  }
  const heroName = check.value

  const found = await findSpeakerByEmail(email)
  if (!found || found.speaker.status !== 'active') {
    await session.clear()
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }

  await updateSpeakerRow(found.rowIndex, { ...found.speaker, heroName })

  return { heroName }
})
