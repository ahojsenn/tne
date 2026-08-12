/**
 * In-memory stand-in for the Google Sheets calls in sheetsClient.ts, used by
 * the e2e suite (SHEETS_BACKEND=memory).
 *
 * Why this exists: the speaker specs register, confirm, log in and delete real
 * accounts, and every step was a round-trip to one shared dev spreadsheet. That
 * made the suite slow, order-dependent and intermittently red under cumulative
 * API pressure — a deploy could fail for reasons that had nothing to do with
 * the change being deployed.
 *
 * The seam is deliberately this low. Everything above it — speakerStore's row
 * mapping, header creation, append serialisation, 1-based row arithmetic,
 * token hashing — still runs for real; only the transport is swapped. A fake
 * at the speakerStore level would have skipped exactly the code most likely to
 * break.
 *
 * The semantics below intentionally copy the quirks the real API has and that
 * the callers depend on:
 *  - trailing empty cells are omitted from each returned row
 *  - trailing empty rows are omitted entirely, so `rows.length` means "last
 *    row with content", which is how appendSpeaker picks its target row
 */

type Grid = string[][]

const sheets = new Map<string, Grid>()

interface ParsedRange {
  title: string
  startRow: number | null // 0-based, null = unbounded
  endRow: number | null
  startCol: number // 0-based
  endCol: number | null
}

function colToIndex(letters: string): number {
  let n = 0
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

/** Handles the shapes this codebase uses: `title!A:I` and `title!A5:I5`. */
export function parseRange(range: string): ParsedRange {
  const bang = range.indexOf('!')
  if (bang < 0) throw new Error(`sheetsMemory: range without sheet title: ${range}`)

  const title = range.slice(0, bang).replace(/^'|'$/g, '')
  const [from = '', to = ''] = range.slice(bang + 1).split(':')

  const cell = /^([A-Za-z]+)(\d+)?$/
  const start = cell.exec(from)
  if (!start) throw new Error(`sheetsMemory: unsupported range: ${range}`)
  const end = to ? cell.exec(to) : null

  return {
    title,
    startCol: colToIndex(start[1]),
    startRow: start[2] ? Number(start[2]) - 1 : null,
    endCol: end ? colToIndex(end[1]) : null,
    endRow: end?.[2] ? Number(end[2]) - 1 : null,
  }
}

function grid(title: string): Grid {
  let g = sheets.get(title)
  if (!g) {
    g = []
    sheets.set(title, g)
  }
  return g
}

function trimTrailingEmpty(row: string[]): string[] {
  let end = row.length
  while (end > 0 && (row[end - 1] ?? '') === '') end--
  return row.slice(0, end)
}

function lastContentRow(g: Grid): number {
  let end = g.length
  while (end > 0 && trimTrailingEmpty(g[end - 1] ?? []).length === 0) end--
  return end
}

export async function readRange(range: string): Promise<string[][]> {
  const { title, startRow, endRow, startCol, endCol } = parseRange(range)
  const g = sheets.get(title)
  if (!g) return []

  const first = startRow ?? 0
  const last = endRow !== null ? Math.min(endRow, g.length - 1) : lastContentRow(g) - 1

  const out: string[][] = []
  for (let r = first; r <= last; r++) {
    const row = g[r] ?? []
    const sliced = endCol !== null ? row.slice(startCol, endCol + 1) : row.slice(startCol)
    out.push(trimTrailingEmpty(sliced))
  }

  // Mirror the API: trailing all-empty rows are not returned at all.
  while (out.length > 0 && out[out.length - 1].length === 0) out.pop()
  return out
}

export async function ensureSheet(sheetTitle: string): Promise<boolean> {
  if (sheets.has(sheetTitle)) return false
  sheets.set(sheetTitle, [])
  return true
}

export async function updateRange(range: string, values: string[][]): Promise<void> {
  const { title, startRow, startCol } = parseRange(range)
  const g = grid(title)
  const first = startRow ?? 0

  values.forEach((row, i) => {
    const r = first + i
    while (g.length <= r) g.push([])
    const target = g[r]
    row.forEach((value, c) => {
      const col = startCol + c
      while (target.length <= col) target.push('')
      target[col] = value ?? ''
    })
  })
}

export async function appendRows(range: string, rows: string[][]): Promise<void> {
  const { title, startCol } = parseRange(range)
  const g = grid(title)
  const start = lastContentRow(g)
  rows.forEach((row, i) => {
    const r = start + i
    while (g.length <= r) g.push([])
    const target = g[r]
    row.forEach((value, c) => {
      const col = startCol + c
      while (target.length <= col) target.push('')
      target[col] = value ?? ''
    })
  })
}

export async function deleteRow(sheetTitle: string, rowIndex: number): Promise<void> {
  const g = sheets.get(sheetTitle)
  if (!g) return
  const idx = rowIndex - 1 // callers pass 1-based row numbers
  if (idx < 0 || idx >= g.length) return
  g.splice(idx, 1)
}

/** Test helper: drop everything, so a spec can start from a clean sheet. */
export function resetMemorySheets(): void {
  sheets.clear()
}
