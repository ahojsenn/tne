import { getSentToken } from '~/server/utils/sentMail'

export default defineEventHandler(async (event) => {
  if (process.env.NODE_ENV === 'production') {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const email = (getQuery(event).email as string | undefined)?.trim().toLowerCase()
  if (!email) throw createError({ statusCode: 400, statusMessage: 'Missing email query parameter' })

  // The sheet only holds a digest now, so the plaintext comes from the link we
  // mailed — which also means this returns exactly what the user would click.
  const resetToken = getSentToken('reset', email)
  if (!resetToken) {
    throw createError({ statusCode: 404, statusMessage: 'No pending reset token for this email' })
  }

  return { resetToken }
})
