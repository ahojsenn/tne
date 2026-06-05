import { useSpeakerSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const session = await useSpeakerSession(event)
  await session.clear()
  return { ok: true }
})
