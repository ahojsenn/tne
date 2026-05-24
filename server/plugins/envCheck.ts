import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

export default defineNitroPlugin(() => {
  const cwd = process.cwd()
  const envPath = resolve(cwd, '.env')

  const required = [
    'GOOGLE_SERVICE_ACCOUNT_EMAIL',
    'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
    'GOOGLE_SHEETS_SPREADSHEET_ID',
  ]

  const missing = required.filter(k => !process.env[k])

  if (missing.length > 0) {
    const envExists = existsSync(envPath)
    console.error(`
╔══════════════════════════════════════════════════════════════╗
║              ❌  MISSING ENVIRONMENT VARIABLES               ║
╠══════════════════════════════════════════════════════════════╣
║  Missing keys:                                               ║
${missing.map(k => `║    • ${k.padEnd(56)}║`).join('\n')}
╠══════════════════════════════════════════════════════════════╣
║  .env file expected at:                                      ║
║    ${envPath.padEnd(58)}║
║  .env file present: ${(envExists ? '✅ YES' : '❌ NO').padEnd(42)}║
╠══════════════════════════════════════════════════════════════╣
║  Working directory (process.cwd()):                          ║
║    ${cwd.padEnd(58)}║
╚══════════════════════════════════════════════════════════════╝
`)
  } else {
    console.log('[envCheck] ✅ All required environment variables are set.')
  }
})
