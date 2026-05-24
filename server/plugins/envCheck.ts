import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { config as dotenvConfig } from 'dotenv'

export default defineNitroPlugin(() => {
  const required = [
    'GOOGLE_SERVICE_ACCOUNT_EMAIL',
    'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
    'GOOGLE_SHEETS_SPREADSHEET_ID',
  ]

  // Derive project root from the actual script path (process.argv[1] is reliable in bundles,
  // unlike import.meta.url which Nitro may resolve to '/' after bundling).
  // e.g. /home/hannes/tomatoes-and-eggs/.output/server/index.mjs -> ../../.. -> project root
  const scriptPath = resolve(process.argv[1] ?? '')
  const projectRoot = resolve(scriptPath, '../../..')
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
