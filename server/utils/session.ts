import { useSession } from 'h3'
import type { H3Event } from 'h3'

export type SpeakerSessionData = { email?: string; displayName?: string }

export function useSpeakerSession(event: H3Event) {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw createError({ statusCode: 500, statusMessage: 'SESSION_SECRET is not configured' })

  return useSession<SpeakerSessionData>(event, {
    password: secret,
    maxAge: 60 * 60 * 24 * 7, // 1 week
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      name: 'tne-speaker-session',
    },
  })
}
