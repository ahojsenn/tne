import { randomUUID } from 'node:crypto'
import { findSpeakerByEmail, updateSpeakerRow, hashResetToken } from '~/server/utils/speakerStore'
import { sendPasswordResetEmail } from '~/server/utils/mailer'
import { getSiteUrl } from '~/server/utils/siteUrl'
import { rateLimit } from '~/server/utils/rateLimit'

const WINDOW_MS = 15 * 60 * 1000

// Outside production the per-email cap is loosened just enough for the e2e
// suite to walk the flow several times while still being reachable in a test,
// and the per-IP cap is effectively off — the whole suite shares one IP.
const isProd = process.env.NODE_ENV === 'production'
const PER_EMAIL = Number(process.env.RESET_LIMIT_PER_EMAIL ?? (isProd ? 3 : 8))
const PER_IP = Number(process.env.RESET_LIMIT_PER_IP ?? (isProd ? 15 : 1000))

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as { email?: string }
  const email = body?.email?.trim().toLowerCase()

  if (!email) {
    throw createError({ statusCode: 400, statusMessage: 'Email is required' })
  }

  // Per-email caps inbox flooding of a single victim, per-IP caps bulk probing.
  // Both are checked before the lookup, so a difference in response timing or
  // status cannot be used to tell registered addresses from unregistered ones.
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  if (!rateLimit(`reset:email:${email}`, PER_EMAIL, WINDOW_MS) || !rateLimit(`reset:ip:${ip}`, PER_IP, WINDOW_MS)) {
    throw createError({ statusCode: 429, statusMessage: 'Too many reset requests. Please try again later.' })
  }

  // Always return success to prevent user enumeration
  const found = await findSpeakerByEmail(email)
  if (!found || found.speaker.status !== 'active') {
    return { ok: true }
  }

  const resetToken = randomUUID()
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour

  await updateSpeakerRow(found.rowIndex, {
    ...found.speaker,
    resetToken: hashResetToken(resetToken),
    resetTokenExpiry,
  })

  await sendPasswordResetEmail(email, `${getSiteUrl(event)}/speaker/reset-password?token=${resetToken}`)

  return { ok: true }
})
