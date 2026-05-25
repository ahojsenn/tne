import { readRange } from './sheetsClient'

export interface AppConfig {
  adminUser: string
  adminPasswd: string
}

let _config: AppConfig | null = null

/**
 * Load config from the "config" sheet (columns A=key, B=value).
 * Cached after the first successful load.
 */
export async function loadConfig(): Promise<AppConfig> {
  if (_config) return _config

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  const sheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  if (!email || !key || !sheetId) {
    throw new Error('[configStore] missing Google Sheets env vars')
  }

  const rows = await readRange('config!A:C')
  console.log('[configStore] loaded', rows.length, 'config rows')
  const map: Record<string, string> = {}
  for (const row of rows) {
    const [rawKey, ...values] = row
    if (!rawKey) continue
    // Normalize key: lowercase, remove trailing colon, collapse repeated chars
    const key = rawKey.trim().toLowerCase().replace(/:+$/, '')
    for (const val of values) {
      if (!val) continue
      // Support "user=admin" and "passwd=test" style or plain values
      if (val.includes('=')) {
        const eqIdx = val.indexOf('=')
        const subKey = val.slice(0, eqIdx).trim().toLowerCase()
        const subVal = val.slice(eqIdx + 1).trim()
        if (subKey === 'user') map['adminaccount'] = subVal
        else if (subKey === 'passwd') map['adminpasswd'] = subVal
        else map[subKey] = subVal
      } else {
        map[key] = val.trim()
      }
    }
  }

  _config = {
    adminUser: map['adminaccount'] ?? '',
    adminPasswd: map['adminpasswd'] ?? '',
  }

  console.log('[configStore] loaded config, adminUser:', _config.adminUser)
  return _config
}

/** Force a reload on the next call (useful for hot-reloading config). */
export function invalidateConfig(): void {
  _config = null
}

/** Returns cached config synchronously — call loadConfig() first. */
export function getConfig(): AppConfig | null {
  return _config
}
