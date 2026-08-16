import { test, expect } from '@playwright/test'
import {
  endTalk,
  getActiveTalk,
  getActiveTalkId,
  getActiveTalkInternal,
  getCounts,
  recordThrow,
  startTalk,
} from '../../server/utils/talkStore'

// Stateless: no browser, no server, no spreadsheet.

const SPEAKER = { email: 'stage@test.example', displayName: 'Stage Person', heroName: 'Captain Stage' }

test.beforeEach(() => endTalk())

test.describe('talkStore', () => {
  test('nothing is on stage to begin with', () => {
    expect(getActiveTalk()).toBeNull()
    expect(getActiveTalkId()).toBeNull()
  })

  test('starting a talk exposes it with an id and a start time', () => {
    const talk = startTalk(SPEAKER)
    expect(talk.id).toBeTruthy()
    expect(talk.heroName).toBe('Captain Stage')
    expect(talk.displayName).toBe('Stage Person')
    expect(Number.isNaN(new Date(talk.startedAt).getTime())).toBe(false)
    expect(getActiveTalkId()).toBe(talk.id)
  })

  test('the broadcast view never carries the email', () => {
    // getActiveTalk() is sent to every client, including the audience.
    startTalk(SPEAKER)
    const pub = getActiveTalk()!
    expect(pub).not.toHaveProperty('speakerEmail')
    expect(JSON.stringify(pub)).not.toContain('stage@test.example')

    // ...while the server side keeps it.
    expect(getActiveTalkInternal()?.speakerEmail).toBe('stage@test.example')
  })

  test('starting a second talk replaces the first — never two at once', () => {
    const first = startTalk(SPEAKER)
    const second = startTalk({ email: 'other@test.example', displayName: 'Other', heroName: 'Doctor Other' })

    expect(second.id).not.toBe(first.id)
    expect(getActiveTalkId()).toBe(second.id)
    expect(getActiveTalk()?.heroName).toBe('Doctor Other')
  })

  test('ending clears the stage', () => {
    startTalk(SPEAKER)
    endTalk()
    expect(getActiveTalk()).toBeNull()
    expect(getActiveTalkId()).toBeNull()
  })

  test('ending twice is harmless', () => {
    startTalk(SPEAKER)
    endTalk()
    endTalk()
    expect(getActiveTalk()).toBeNull()
  })

  test('each talk gets its own id', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 5; i++) ids.add(startTalk(SPEAKER).id)
    expect(ids.size).toBe(5)
  })

  // --- live tally (#13) ---

  test('throws are tallied per item', () => {
    startTalk(SPEAKER)
    recordThrow('tomato')
    recordThrow('tomato')
    recordThrow('star')

    expect(getCounts()).toEqual({ tomato: 2, star: 1 })
  })

  test('with nobody on stage nothing is tallied', () => {
    recordThrow('tomato')
    expect(getCounts()).toEqual({})
  })

  test('a new talk starts from zero', () => {
    startTalk(SPEAKER)
    recordThrow('tomato')
    startTalk({ email: 'other@test.example', displayName: 'Other', heroName: 'Other Hero' })

    expect(getCounts()).toEqual({})
  })

  test('ending a talk discards its tally', () => {
    startTalk(SPEAKER)
    recordThrow('egg')
    endTalk()

    expect(getCounts()).toEqual({})
  })

  test('the tally is a snapshot, not a live handle into the store', () => {
    startTalk(SPEAKER)
    recordThrow('tomato')
    const snapshot = getCounts()
    recordThrow('tomato')

    expect(snapshot.tomato).toBe(1)
    expect(getCounts().tomato).toBe(2)
  })

  test('the counts never reach the broadcast view', () => {
    startTalk(SPEAKER)
    recordThrow('tomato')
    expect(getActiveTalk()).not.toHaveProperty('counts')
  })
})
