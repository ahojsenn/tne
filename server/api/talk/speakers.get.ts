import { listActiveSpeakers, speakerHandle } from '~/server/utils/speakerStore'
import type { SPEAKER_OPTION } from '~/types/talk'

/**
 * The speakers the gameconsole can put on stage.
 *
 * Returns handles rather than emails, so no address leaves the server. The
 * gameconsole's password gate is client-side only (see /api/auth/verify —
 * nothing is remembered server-side), which means an endpoint here cannot
 * check that the caller is the operator. The handle keeps that from mattering:
 * what is exposed is the display and hero names, which the audience sees
 * anyway once a talk starts.
 */
export default defineEventHandler(async (): Promise<SPEAKER_OPTION[]> => {
  const speakers = await listActiveSpeakers()
  return speakers.map(s => ({
    handle: speakerHandle(s.email),
    displayName: s.displayName,
    heroName: s.heroName ?? s.displayName,
  }))
})
