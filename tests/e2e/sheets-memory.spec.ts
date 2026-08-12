import { test, expect } from '@playwright/test'
import {
  appendRows,
  deleteRow,
  ensureSheet,
  parseRange,
  readRange,
  resetMemorySheets,
  updateRange,
} from '../../server/utils/sheetsMemory'

// Stateless: no browser, no server. These lock in the Google Sheets quirks that
// speakerStore depends on — get one of them wrong and the failure shows up as a
// mysterious "speaker vanished after registering", not as a failing assertion
// in this file.

test.beforeEach(() => resetMemorySheets())

test.describe('sheetsMemory', () => {
  test('parses the range shapes this codebase uses', () => {
    expect(parseRange('speakers!A:I')).toMatchObject({
      title: 'speakers', startCol: 0, endCol: 8, startRow: null, endRow: null,
    })
    expect(parseRange('speakers!A5:I5')).toMatchObject({
      title: 'speakers', startCol: 0, endCol: 8, startRow: 4, endRow: 4,
    })
    expect(parseRange('config!A:C')).toMatchObject({ title: 'config', startCol: 0, endCol: 2 })
  })

  test('an unknown sheet reads as empty rather than throwing', async () => {
    expect(await readRange('nope!A:C')).toEqual([])
  })

  test('ensureSheet reports only the first creation', async () => {
    expect(await ensureSheet('speakers')).toBe(true)
    expect(await ensureSheet('speakers')).toBe(false)
  })

  test('written cells come back', async () => {
    await updateRange('t!A1:C1', [['a', 'b', 'c']])
    await updateRange('t!A2:C2', [['d', 'e', 'f']])
    expect(await readRange('t!A:C')).toEqual([['a', 'b', 'c'], ['d', 'e', 'f']])
  })

  test('trailing empty cells are dropped from a row, as the API does', async () => {
    // A speaker with no hero_name yields a short row; rowToSpeaker relies on
    // destructuring defaults to cope with exactly this.
    await updateRange('t!A1:I1', [['email', 'name', '', '', '', '', '', '', '']])
    expect(await readRange('t!A:I')).toEqual([['email', 'name']])
  })

  test('trailing empty rows are not returned, so rows.length means "last row with content"', async () => {
    // appendSpeaker derives its target row from rows.length. If empty rows were
    // counted, every new speaker would be written further and further down.
    await updateRange('t!A1:I1', [['header']])
    await updateRange('t!A2:I2', [['someone']])
    await updateRange('t!A5:I5', [['']])
    expect(await readRange('t!A:I')).toEqual([['header'], ['someone']])
  })

  test('deleteRow takes a 1-based index and shifts the rest up', async () => {
    await updateRange('t!A1:A3', [['one'], ['two'], ['three']])
    await deleteRow('t', 2)
    expect(await readRange('t!A:A')).toEqual([['one'], ['three']])
  })

  test('deleting out of range is a no-op, not a crash', async () => {
    await updateRange('t!A1:A1', [['one']])
    await deleteRow('t', 99)
    await deleteRow('t', 0)
    expect(await readRange('t!A:A')).toEqual([['one']])
  })

  test('appendRows lands after the last row with content', async () => {
    await updateRange('t!A1:B1', [['header', 'x']])
    await appendRows('t!A:B', [['first', '1'], ['second', '2']])
    expect(await readRange('t!A:B')).toEqual([
      ['header', 'x'], ['first', '1'], ['second', '2'],
    ])
  })

  test('a bounded range reads only its own rows', async () => {
    await updateRange('t!A1:A3', [['one'], ['two'], ['three']])
    expect(await readRange('t!A2:A2')).toEqual([['two']])
  })

  test('resetMemorySheets clears everything', async () => {
    await updateRange('t!A1:A1', [['one']])
    resetMemorySheets()
    expect(await readRange('t!A:A')).toEqual([])
  })
})
