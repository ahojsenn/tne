import { messages } from '~/server/utils/messagesStore'

/**
 * Test-only: the most recent throws, so the e2e suite can assert that a throw
 * really was attributed to the active talk. Server-side attribution is not
 * observable from any page otherwise.
 *
 * Disabled in production, exactly like the speaker test-* endpoints.
 */
export default defineEventHandler((event) => {
  if (process.env.NODE_ENV === 'production') {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }
  const n = Number(getQuery(event).n ?? 5)
  return { throws: messages.slice(-Math.max(1, Math.min(n, 100))) }
})
