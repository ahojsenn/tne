import { findSpeakerByToken, updateSpeakerRow } from '~/server/utils/speakerStore'

export default defineEventHandler(async (event) => {
  const token = getQuery(event).token as string | undefined

  if (!token) {
    throw createError({ statusCode: 400, statusMessage: 'Missing confirmation token' })
  }

  const found = await findSpeakerByToken(token)
  if (!found) {
    throw createError({ statusCode: 404, statusMessage: 'Invalid or already used confirmation token' })
  }

  const { speaker, rowIndex } = found
  if (new Date(speaker.confirmTokenExpiry!) < new Date()) {
    throw createError({ statusCode: 410, statusMessage: 'Confirmation link has expired — please register again' })
  }

  await updateSpeakerRow(rowIndex, {
    ...speaker,
    status: 'active',
    confirmToken: undefined,
    confirmTokenExpiry: undefined,
  })

  return { ok: true }
})
