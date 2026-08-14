import { test, expect } from '@playwright/test'
import {
  endTalk,
  getActiveTalk,
  getActiveTalkId,
  getActiveTalkInternal,
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
})
