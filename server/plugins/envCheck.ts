import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as dotenvConfig } from 'dotenv'

export default defineNitroPlugin(() => {
  const required = [
    'GOOGLE_SERVICE_ACCOUNT_EMAIL',
    'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
    'GOOGLE_SHEETS_SPREADSHEET_ID',
  ]

  // In production the server runs as .output/server/index.mjs — two levels up is the project root
  const scriptDir = fileURLToPath(new URL('.', import.meta.url))
  const projectRoot = resolve(scriptDir, '..', '..')
  const cwdEnvPath = resolve(process.cwd(), '.env')
  const scriptEnvPath = resolve(projectRoot, '.env')

  const missing = () => required.filter(k => !process.env[k])

  // If vars are missing, try to load .env from project root (handles the case where
  // cwd differs from project root, e.g. `node tomatoes-and-eggs/.output/server/index.mjs`)
  if (missing().length > 0 && existsSync(scriptEnvPath)) {
    dotenvConfig({ path: scriptEnvPath, override: false })
    console.log(`[envCheck] loaded .env from ${scriptEnvPath}`)
  }

  const stillMissing = missing()
  if (stillMissing.length > 0) {
    console.error(`
╔══════════════════════════════════════════════════════════════╗
║              ❌  MISSING ENVIRONMENT VARIABLES               ║
╠══════════════════════════════════════════════════════════════╣
║  Missing keys:                                               ║
${stillMissing.map(k => `║    • ${k.padEnd(56)}║`).join('\n')}
╠══════════════════════════════════════════════════════════════╣
║  .env searched at (cwd):                                     ║
║    ${cwdEnvPath.padEnd(58)}║
║    present: ${(existsSync(cwdEnvPath) ? '✅ YES' : '❌ NO').padEnd(49)}║
║  .env searched at (project root):                            ║
║    ${scriptEnvPath.padEnd(58)}║
║    present: ${(existsSync(scriptEnvPath) ? '✅ YES' : '❌ NO').padEnd(49)}║
╠══════════════════════════════════════════════════════════════╣
║  Working directory (process.cwd()):                          ║
║    ${process.cwd().padEnd(58)}║
╚══════════════════════════════════════════════════════════════╝
`)
  } else {
    console.log('[envCheck] ✅ All required environment variables are set.')
  }
})
