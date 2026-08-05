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

async function createAuthClient(): Promise<JWT> {
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
 * One JWT for the process, not one per call. jwt.authorize() is a round-trip to
 * Google's OAuth token endpoint, and this module used to run it inside every
 * read and write — a single speaker registration minted four access tokens to
 * make four API calls. The token endpoint rate-limits a service account that
 * asks that often, which surfaced as intermittent 500s under the e2e suite.
 *
 * The JWT refreshes its own token when it nears expiry, so holding one is both
 * correct and enough. The promise (not the resolved client) is cached, so
 * concurrent first callers share one authorize instead of racing.
 */
let authClientPromise: Promise<JWT> | null = null

async function getAuthClient(): Promise<JWT> {
  if (!authClientPromise) {
    authClientPromise = createAuthClient().catch((err) => {
      authClientPromise = null // a failed authorize must not be cached forever
      throw err
    })
  }
  return authClientPromise
}

async function getSheetsApi() {
  const auth = await getAuthClient()
  return google.sheets({ version: 'v4', auth })
}

const TRANSIENT_STATUS = new Set([408, 429, 500, 502, 503, 504])
const TRANSIENT_CODES = new Set(['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'ENOTFOUND', 'EPIPE'])

function statusOf(err: any): number | undefined {
  for (const v of [err?.status, err?.response?.status, err?.code]) {
    if (typeof v === 'number') return v
    if (typeof v === 'string' && /^\d+$/.test(v)) return Number(v)
  }
  return undefined
}

function isTransient(err: any): boolean {
  const status = statusOf(err)
  if (status !== undefined && TRANSIENT_STATUS.has(status)) return true
  return typeof err?.code === 'string' && TRANSIENT_CODES.has(err.code)
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Google returns 429 when the per-minute quota is exceeded and the occasional
 * 5xx for no reason at all; both clear on their own. Only wrap operations that
 * are safe to run twice — a repeated read, or a write to an explicit range,
 * lands on the same result. Appends and row deletes are NOT idempotent and are
 * deliberately left unwrapped: a retried append duplicates a row and a retried
 * delete removes somebody else's.
 *
 * A stale-credential failure is not retried, but it does drop the cached client
 * so the next call authorizes again rather than reusing a dead token.
 */
async function retryTransient<T>(label: string, fn: () => Promise<T>, attempts = 3): Promise<T> {
  let delay = 300
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn()
    } catch (err: any) {
      const status = statusOf(err)
      if (status === 401 || status === 403) authClientPromise = null

      if (attempt >= attempts || !isTransient(err)) throw err
      console.warn(`[sheetsClient] ${label} failed (${status ?? err?.code ?? err?.message}) — retrying in ${delay}ms (${attempt}/${attempts - 1})`)
      await sleep(delay)
      delay *= 2
    }
  }
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
  return retryTransient(`read ${range}`, async () => {
    const sheets = await getSheetsApi()
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range })
    return (res.data.values as string[][]) ?? []
  })
}

/**
 * Ensure a sheet with the given title exists; creates it if missing.
 * Returns true if the sheet was freshly created.
 */
export async function ensureSheet(sheetTitle: string): Promise<boolean> {
  const spreadsheetId = getSpreadsheetId()
  const sheets = await getSheetsApi()
  const meta = await retryTransient(`metadata for ${sheetTitle}`, () => sheets.spreadsheets.get({ spreadsheetId }))
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
  // Not retried: a second append after a lost response duplicates the rows.
  const sheets = await getSheetsApi()
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
  // Safe to retry: the range is explicit, so a repeat writes the same cells.
  await retryTransient(`write ${range}`, async () => {
    const sheets = await getSheetsApi()
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: { values },
    })
  })
}

/**
 * Delete a single row from a sheet by its 1-based row index.
 * @param sheetTitle e.g. "speakers"
 * @param rowIndex   1-based row number (as returned by speakerStore)
 */
export async function deleteRow(sheetTitle: string, rowIndex: number): Promise<void> {
  const spreadsheetId = getSpreadsheetId()
  const sheets = await getSheetsApi()
  // The lookup is safe to retry; the delete itself is not — a repeat would take
  // out the row that shifted up into this index.
  const meta = await retryTransient(`metadata for ${sheetTitle}`, () => sheets.spreadsheets.get({ spreadsheetId }))
  const sheet = meta.data.sheets?.find(s => s.properties?.title === sheetTitle)
  if (!sheet?.properties) throw new Error(`Sheet "${sheetTitle}" not found`)
  const sheetId = sheet.properties.sheetId!
  const zeroIndex = rowIndex - 1
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: zeroIndex, endIndex: zeroIndex + 1 } } }],
    },
  })
}
