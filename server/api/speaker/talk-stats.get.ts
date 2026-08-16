import { useSpeakerSession } from '~/server/utils/session'
import * as talkStore from '~/server/utils/talkStore'
import type { TALK_STATS } from '~/types/talk'

/**
 * The live tally for the speaker currently on stage — and only for them.
 *
 * Two conditions have to hold: the caller is logged in, and the running talk
 * is theirs. Anything else answers `onStage: false` with no numbers, so this
 * cannot be used to watch someone else's talk, or to find out whether a talk
 * is running at all beyond what /throw already shows everyone.
 *
 * Polled rather than pushed: the socket connection is unauthenticated, and
 * proving who a socket belongs to would be a much larger change than a
 * two-second poll against the session that already exists.
 */
export default defineEventHandler(async (event): Promise<TALK_STATS> => {
  const session = await useSpeakerSession(event)
  const { email } = session.data
  if (!email) throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })

  const talk = talkStore.getActiveTalkInternal()
  const offStage: TALK_STATS = { onStage: false, startedAt: null, counts: {}, total: 0 }

  if (!talk) return offStage
  if (talk.speakerEmail.trim().toLowerCase() !== email.trim().toLowerCase()) return offStage

  const counts = talkStore.getCounts()
  return {
    onStage: true,
    startedAt: talk.startedAt,
    counts,
    total: Object.values(counts).reduce((sum, n) => sum + n, 0),
  }
})
