import { randomUUID } from 'node:crypto'
import type { ACTIVE_TALK } from '~/types/talk'

/**
 * Which talk is happening right now.
 *
 * Server state that gets broadcast, the same shape as gameMode and the active
 * quiz question — not something the client owns. There is at most one active
 * talk; starting a second one ends the first.
 *
 * In memory only, so a restart ends the talk. That is fine for what this
 * store is used for (nothing reads back a finished talk yet) but it is the
 * reason #15/#16/#17 need persistence before they can work — see issue #12.
 */

type StoredTalk = ACTIVE_TALK & {
  /** Kept here and never broadcast. */
  speakerEmail: string
}

let _active: StoredTalk | null = null

export function startTalk(speaker: {
  email: string
  displayName: string
  heroName: string
}): ACTIVE_TALK {
  _active = {
    id: randomUUID(),
    speakerEmail: speaker.email,
    displayName: speaker.displayName,
    heroName: speaker.heroName,
    startedAt: new Date().toISOString(),
  }
  return getActiveTalk()!
}

export function endTalk(): void {
  _active = null
}

/** The public view — safe to send to every client. */
export function getActiveTalk(): ACTIVE_TALK | null {
  if (!_active) return null
  const { speakerEmail, ...pub } = _active
  return pub
}

/** Includes the email. Server-side callers only. */
export function getActiveTalkInternal(): StoredTalk | null {
  return _active
}

/** Convenience for stamping throws; null when nobody is on stage. */
export function getActiveTalkId(): string | null {
  return _active?.id ?? null
}
