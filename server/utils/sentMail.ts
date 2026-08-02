/**
 * Records the links we mail out, so e2e tests can follow a flow without a real
 * mailbox. Reset tokens are hashed at rest (see speakerStore), so the sheet can
 * no longer hand the plaintext back — this is where it comes from instead.
 *
 * Never populated in production: recordSentLink() is a no-op there, which keeps
 * the test-* endpoints unable to leak anything even if their guard were lifted.
 */
type Kind = 'reset' | 'confirm'

const links = new Map<string, string>()

const isProd = () => process.env.NODE_ENV === 'production'
const key = (kind: Kind, email: string) => `${kind}:${email.trim().toLowerCase()}`

export function recordSentLink(kind: Kind, email: string, url: string): void {
  if (isProd()) return
  links.set(key(kind, email), url)
}

export function getSentLink(kind: Kind, email: string): string | undefined {
  if (isProd()) return undefined
  return links.get(key(kind, email))
}

/**
 * Counts mails actually handed to SMTP, so an e2e test can assert that a full
 * register → reset → delete run left the outbox untouched. A silent regression
 * here (a stray transporter, MAIL_DEV_SEND leaking into .env) would otherwise
 * only show up as bounces days later.
 */
let deliveries = 0

export function recordDelivery(): void {
  deliveries++
}

export function getDeliveryCount(): number {
  return deliveries
}

/** Pull the `token` query parameter out of a recorded link. */
export function getSentToken(kind: Kind, email: string): string | undefined {
  const url = getSentLink(kind, email)
  if (!url) return undefined
  return new URL(url).searchParams.get('token') ?? undefined
}
