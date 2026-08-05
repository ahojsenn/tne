import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { findSpeakerByEmail, appendSpeaker, updateSpeakerRow } from '~/server/utils/speakerStore'
import { sendConfirmationEmail } from '~/server/utils/mailer'
import { getSiteUrl } from '~/server/utils/siteUrl'

/**
 * Registration talks to Google Sheets three times and to SMTP once, and any of
 * those can fail transiently. The Nitro error handler already logs the message
 * and stack, but a Sheets outage arrives as a generic transport error thrown
 * from inside googleapis — the stack does not say which of the calls made it,
 * and the client only ever sees "Something went wrong". This names the step
 * (and the account) first, then rethrows untouched so the response is unchanged.
 */
async function step<T>(name: string, email: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err: any) {
    console.error(`[register] ${name} failed for ${email}:`, err?.message ?? err)
    throw err
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as { email?: string; displayName?: string; password?: string; confirmPassword?: string }

  const email = body?.email?.trim().toLowerCase()
  const displayName = body?.displayName?.trim()
  const password = body?.password
  const confirmPassword = body?.confirmPassword

  if (!email || !displayName || !password || !confirmPassword) {
    throw createError({ statusCode: 400, statusMessage: 'All fields are required' })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid email address' })
  }
  if (password.length < 8) {
    throw createError({ statusCode: 400, statusMessage: 'Password must be at least 8 characters' })
  }
  if (password !== confirmPassword) {
    throw createError({ statusCode: 400, statusMessage: 'Passwords do not match' })
  }

  const existing = await step('lookup', email, () => findSpeakerByEmail(email))
  if (existing?.speaker.status === 'active') {
    throw createError({ statusCode: 409, statusMessage: 'An account with this email already exists' })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const confirmToken = randomUUID()
  const confirmTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  if (existing?.speaker.status === 'pending') {
    // Resend: update the token in-place
    await step(`update row ${existing.rowIndex}`, email, () => updateSpeakerRow(existing.rowIndex, {
      ...existing.speaker,
      passwordHash,
      confirmToken,
      confirmTokenExpiry,
    }))
  } else {
    await step('append', email, () => appendSpeaker({ email, displayName, passwordHash, status: 'pending', confirmToken, confirmTokenExpiry }))
  }

  // The speaker row is already written by now, so a failure here leaves a
  // pending account with a valid token — registering again resends it.
  const confirmUrl = `${getSiteUrl(event)}/speaker/confirm?token=${confirmToken}`
  await step('send confirmation mail', email, () => sendConfirmationEmail(email, confirmUrl))

  return { ok: true }
})
