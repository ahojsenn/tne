import bcrypt from 'bcryptjs'
import { findSpeakerByEmail } from '~/server/utils/speakerStore'
import { useSpeakerSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as { email?: string; password?: string }
  const email = body?.email?.trim().toLowerCase()
  const password = body?.password

  if (!email || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Email and password are required' })
  }

  const invalidCreds = () => createError({ statusCode: 401, statusMessage: 'Invalid credentials' })

  const found = await findSpeakerByEmail(email)
  if (!found || found.speaker.status !== 'active') throw invalidCreds()

  const match = await bcrypt.compare(password, found.speaker.passwordHash)
  if (!match) throw invalidCreds()

  const session = await useSpeakerSession(event)
  await session.update({ email: found.speaker.email, displayName: found.speaker.displayName })

  return { ok: true }
})
