import { readRange, appendRows, updateRange, deleteRow, ensureSheet } from './sheetsClient'
import type { Speaker } from '~/types/speaker'

const SHEET = 'speakers'
// columns: email(A) | display_name(B) | password_hash(C) | status(D) | confirm_token(E) | token_expiry(F)
const RANGE = `${SHEET}!A:F`

type SpeakerRow = { speaker: Speaker; rowIndex: number }

function rowToSpeaker(row: string[]): Speaker {
  const [email = '', displayName = '', passwordHash = '', status = '', confirmToken = '', confirmTokenExpiry = ''] = row
  return {
    email,
    displayName,
    passwordHash,
    status: status as Speaker['status'],
    confirmToken: confirmToken || undefined,
    confirmTokenExpiry: confirmTokenExpiry || undefined,
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

export async function appendSpeaker(speaker: Speaker): Promise<void> {
  const isNew = await ensureSheet(SHEET)
  if (isNew) {
    await appendRows(`${SHEET}!A:F`, [['email', 'display_name', 'password_hash', 'status', 'confirm_token', 'token_expiry']], 'RAW')
  }
  await appendRows(`${SHEET}!A:F`, [speakerToRow(speaker)], 'RAW')
}

export async function updateSpeakerRow(rowIndex: number, speaker: Speaker): Promise<void> {
  await updateRange(`${SHEET}!A${rowIndex}:F${rowIndex}`, [speakerToRow(speaker)])
}

export async function deleteSpeakerRow(rowIndex: number): Promise<void> {
  await deleteRow(SHEET, rowIndex)
}
