import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Every deployed release ships a RELEASE_INFO file written by the deploy
// pipeline (.github/workflows/deploy.yml) or by a manual ./deploy.sh run:
//
//   release=20260809T140717Z-d962461
//   commit=d962461257e58694199111f4e6744bd10b26ff24
//   ref=refs/tags/v1.0.1
//   built=2026-08-09T14:07:17Z
//   actor=ahojsenn
//   run=https://github.com/ahojsenn/tne/actions/runs/31315422325
//
// It sits at the release root, next to .output/. In development the file does
// not exist at all, which is not an error — the endpoint reports "dev".

const REPO_URL = 'https://github.com/ahojsenn/tne'

interface VersionInfo {
  version: string
  release: string | null
  commit: string | null
  commitShort: string | null
  commitUrl: string | null
  builtAt: string | null
  deployedBy: string | null
  runUrl: string | null
  isDev: boolean
}

function parseReleaseInfo(path: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of readFileSync(path, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return out
}

function findReleaseInfo(): Record<string, string> | null {
  // Same root derivation as server/plugins/envCheck.ts: process.argv[1] is
  // reliable in the Nitro bundle, where import.meta.url may resolve to '/'.
  // .output/server/index.mjs -> ../../.. -> release root
  const scriptPath = resolve(process.argv[1] ?? '')
  const candidates = [
    resolve(scriptPath, '../../../RELEASE_INFO'),
    resolve(process.cwd(), 'RELEASE_INFO'),
  ]
  for (const path of candidates) {
    if (existsSync(path)) {
      try {
        return parseReleaseInfo(path)
      } catch {
        // Unreadable or malformed: fall through to the next candidate rather
        // than turning an info page into a 500.
      }
    }
  }
  return null
}

function deriveVersion(info: Record<string, string>): string {
  const tag = /^refs\/tags\/(.+)$/.exec(info.ref ?? '')
  if (tag) return tag[1]
  if ((info.release ?? '').endsWith('-bootstrap')) return 'bootstrap'
  if (info.commit) return info.commit.slice(0, 7)
  return 'unknown'
}

// RELEASE_INFO cannot change while the process is alive — a new release means
// a new directory and a restart — so read it once.
let cached: VersionInfo | null = null

function buildVersionInfo(): VersionInfo {
  const info = findReleaseInfo()
  if (!info) {
    return {
      version: 'dev',
      release: null,
      commit: null,
      commitShort: null,
      commitUrl: null,
      builtAt: null,
      deployedBy: null,
      runUrl: null,
      isDev: true,
    }
  }
  const commit = info.commit ?? null
  return {
    version: deriveVersion(info),
    release: info.release ?? null,
    commit,
    commitShort: commit ? commit.slice(0, 7) : null,
    commitUrl: commit ? `${REPO_URL}/commit/${commit}` : null,
    builtAt: info.built ?? null,
    deployedBy: info.actor ?? null,
    runUrl: info.run ?? null,
    isDev: false,
  }
}

export default defineEventHandler((): VersionInfo => {
  if (!cached) cached = buildVersionInfo()
  return cached
})
