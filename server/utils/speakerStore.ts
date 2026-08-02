import { createHash } from 'node:crypto'
import { readRange, updateRange, deleteRow, ensureSheet } from './sheetsClient'
import type { Speaker } from '~/types/speaker'

const SHEET = 'speakers'
// columns: email(A) | display_name(B) | password_hash(C) | status(D) | confirm_token(E) | token_expiry(F) | reset_token(G) | reset_expiry(H) | hero_name(I)
// reset_token(G) holds a SHA-256 digest, never the token itself — see hashResetToken().
const RANGE = `${SHEET}!A:I`

/**
 * Reset tokens are stored hashed, so read access to the spreadsheet does not
 * hand out the ability to take over accounts. Plain SHA-256 is enough here (no
 * bcrypt): the token is a 122-bit random UUID, so there is nothing to brute
 * force. Anyone who has the plaintext can still look the row up.
 */
export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

type SpeakerRow = { speaker: Speaker; rowIndex: number }

function rowToSpeaker(row: string[]): Speaker {
  const [email = '', displayName = '', passwordHash = '', status = '', confirmToken = '', confirmTokenExpiry = '', resetToken = '', resetTokenExpiry = '', heroName = ''] = row
  return {
    email,
    displayName,
    passwordHash,
    status: status as Speaker['status'],
    confirmToken: confirmToken || undefined,
    confirmTokenExpiry: confirmTokenExpiry || undefined,
    resetToken: resetToken || undefined,
    resetTokenExpiry: resetTokenExpiry || undefined,
    heroName: heroName || undefined,
  }
}

function speakerToRow(s: Speaker): string[] {
  return [
    s.email,
    s.displayName,
    s.passwordHash,
    s.status,
    s.confirmToken ?? '',
    s.confirmTokenExpiry ?? '',
    s.resetToken ?? '',
    s.resetTokenExpiry ?? '',
    s.heroName ?? '',
  ]
}

async function getAllRows(): Promise<{ rows: string[][]; dataRows: string[][] }> {
  const rows = await readRange(RANGE)
  // row 0 is the header
  const dataRows = rows.slice(1)
  return { rows, dataRows }
}

export async function findSpeakerByEmail(email: string): Promise<SpeakerRow | null> {
  const { dataRows } = await getAllRows()
  const normalized = email.trim().toLowerCase()
  const idx = dataRows.findIndex(r => (r[0] ?? '').trim().toLowerCase() === normalized)
  if (idx === -1) return null
  return { speaker: rowToSpeaker(dataRows[idx]), rowIndex: idx + 2 } // +2: 1-based + header row
}

export async function findSpeakerByToken(token: string): Promise<SpeakerRow | null> {
  const { dataRows } = await getAllRows()
  const idx = dataRows.findIndex(r => r[4] === token)
  if (idx === -1) return null
  return { speaker: rowToSpeaker(dataRows[idx]), rowIndex: idx + 2 }
}

/** Takes the plaintext token from the reset link; matches it against the stored digest. */
export async function findSpeakerByResetToken(token: string): Promise<SpeakerRow | null> {
  const { dataRows } = await getAllRows()
  const digest = hashResetToken(token)
  const idx = dataRows.findIndex(r => r[6] === digest)
  if (idx === -1) return null
  return { speaker: rowToSpeaker(dataRows[idx]), rowIndex: idx + 2 }
}

const HEADER = ['email', 'display_name', 'password_hash', 'status', 'confirm_token', 'token_expiry', 'reset_token', 'reset_expiry', 'hero_name']

/**
 * Read-then-write is only safe if no second append reads the same row count in
 * between — two parallel registrations would otherwise both target the last row
 * and one would overwrite the other. Requests are serialised per server process,
 * which is where the concurrency actually comes from (one Nitro instance).
 */
let appendQueue: Promise<unknown> = Promise.resolve()

/**
 * Writes to an explicit row range instead of values.append: append picks its
 * target column by guessing where the "table" is, and once a row carried a
 * hero_name while the header still ended at token_expiry it started guessing
 * column I — new speakers were written to I:Q, where every lookup (which reads
 * the email from column A) missed them, silently.
 */
export async function appendSpeaker(speaker: Speaker): Promise<void> {
  const write = async () => {
    const isNew = await ensureSheet(SHEET)
    if (isNew) {
      await updateRange(`${SHEET}!A1:I1`, [HEADER])
    }
    const { rows } = await getAllRows()
    const target = Math.max(rows.length, 1) + 1 // past the last row, never over the header
    await updateRange(`${SHEET}!A${target}:I${target}`, [speakerToRow(speaker)])
  }

  const run = appendQueue.then(write, write)
  appendQueue = run.catch(() => {}) // a failed append must not wedge the queue
  return run
}

export async function updateSpeakerRow(rowIndex: number, speaker: Speaker): Promise<void> {
  await updateRange(`${SHEET}!A${rowIndex}:I${rowIndex}`, [speakerToRow(speaker)])
}

export async function deleteSpeakerRow(rowIndex: number): Promise<void> {
  await deleteRow(SHEET, rowIndex)
}
