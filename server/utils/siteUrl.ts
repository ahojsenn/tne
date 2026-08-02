import type { H3Event } from 'h3'

/**
 * Absolute origin for links we put into emails (confirm / password reset).
 *
 * SITE_URL holds the *production* origin and is shipped to the server verbatim
 * by deploy.sh, so it must not be repointed for local work. Outside production
 * we therefore ignore it and prefer SITE_URL_DEV — mirroring the
 * GOOGLE_SHEETS_SPREADSHEET_ID_DEV convention — falling back to the origin the
 * request came in on. That keeps a locally requested reset link pointing at the
 * local server, where the matching token actually lives.
 */
export function getSiteUrl(event: H3Event): string {
  const isProd = process.env.NODE_ENV === 'production'
  const configured = isProd ? process.env.SITE_URL : process.env.SITE_URL_DEV

  if (configured) return configured.replace(/\/$/, '')

  const proto = getHeader(event, 'x-forwarded-proto') ?? getRequestURL(event).protocol.replace(':', '')
  const host = getHeader(event, 'host') ?? getRequestURL(event).host
  return `${proto}://${host}`
}
