import { google } from 'googleapis'
import { JWT } from 'google-auth-library'

// Nitro/Vite defines `window`, causing gaxios to lazily pick `window.fetch`
// (Nitro's patched fetch) instead of node-fetch, which hangs.
// Fix: pass node-fetch directly as transporterOptions.fetchImplementation
// so the JWT auth client's gaxios transporter uses it from the start.
let _nodeFetch: typeof fetch | null = null
async function getNodeFetch() {
  if (!_nodeFetch) {
    _nodeFetch = (await import('node-fetch')).default as unknown as typeof fetch
  }
  return _nodeFetch
}

async function getAuthClient(): Promise<JWT> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  if (!email || !rawKey) {
    throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY env vars')
  }
  // .env stores \n as literal backslash-n — replace with real newlines
  const privateKey = rawKey.replace(/\\n/g, '\n')
  const fetchImplementation = await getNodeFetch()
  const jwt = new JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    // pass node-fetch so gaxios doesn't use Nitro's patched window.fetch
    transporterOptions: { fetchImplementation },
  })
  await jwt.authorize()
  return jwt
}

/**
 * Read a range from a Google Sheet.
 * @param range e.g. "config!A:B"
 * @returns 2D array of cell values
 */
function getSpreadsheetId(): string {
  const isProd = process.env.NODE_ENV === 'production'
  const id = isProd
    ? process.env.GOOGLE_SHEETS_SPREADSHEET_ID
    : (process.env.GOOGLE_SHEETS_SPREADSHEET_ID_DEV ?? process.env.GOOGLE_SHEETS_SPREADSHEET_ID)
  if (!id) throw new Error('Missing GOOGLE_SHEETS_SPREADSHEET_ID env var')
  return id
}

export async function readRange(range: string): Promise<string[][]> {
  const spreadsheetId = getSpreadsheetId()
  const auth = await getAuthClient()
  const sheets = google.sheets({ version: 'v4', auth })
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range })
  return (res.data.values as string[][]) ?? []
}

/**
 * Ensure a sheet with the given title exists; creates it if missing.
 * Returns true if the sheet was freshly created.
 */
export async function ensureSheet(sheetTitle: string): Promise<boolean> {
  const spreadsheetId = getSpreadsheetId()
  const auth = await getAuthClient()
  const sheets = google.sheets({ version: 'v4', auth })
  const meta = await sheets.spreadsheets.get({ spreadsheetId })
  const exists = meta.data.sheets?.some(s => s.properties?.title === sheetTitle)
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: sheetTitle } } }] },
    })
    console.log(`[sheetsClient] created sheet "${sheetTitle}"`)
    return true
  }
  return false
}

/**
 * Append rows to a sheet.
 * @param range e.g. "log!A:Z"
 * @param rows  array of value arrays
 * @param valueInputOption  'USER_ENTERED' (default) or 'RAW' — use RAW for auth/sensitive data
 */
export async function appendRows(range: string, rows: string[][], valueInputOption: 'USER_ENTERED' | 'RAW' = 'USER_ENTERED'): Promise<void> {
  const spreadsheetId = getSpreadsheetId()
  const auth = await getAuthClient()
  const sheets = google.sheets({ version: 'v4', auth })
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption,
    requestBody: { values: rows },
  })
}

/**
 * Overwrite a specific range with the given values.
 * @param range e.g. "speakers!A3:F3"
 * @param values 2D array matching the range dimensions
 */
export async function updateRange(range: string, values: string[][]): Promise<void> {
  const spreadsheetId = getSpreadsheetId()
  const auth = await getAuthClient()
  const sheets = google.sheets({ version: 'v4', auth })
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'RAW',
    requestBody: { values },
  })
}
