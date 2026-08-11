// Shared between the dashboard UI and the /api/speaker/hero endpoint, so the
// rules and the wording of the errors cannot drift apart. The server calls
// this too — client-side validation is a convenience, never the authority.

export const HERO_NAME_MIN_LENGTH = 2
export const HERO_NAME_MAX_LENGTH = 23

export type HeroNameCheck =
  | { ok: true; value: string }
  | { ok: false; message: string }

/**
 * Trims the input and checks its length.
 *
 * A speaker may pick any name, including one that is not in types/heroes.ts —
 * that list is only a set of suggestions. The upper bound exists because the
 * name is rendered in the gameconsole hitlist, where longer names wrap badly.
 */
export function validateHeroName(raw: unknown): HeroNameCheck {
  if (typeof raw !== 'string') {
    return { ok: false, message: 'Hero name is required' }
  }

  const value = raw.trim()

  if (!value) {
    return { ok: false, message: 'Hero name is required' }
  }
  if (value.length < HERO_NAME_MIN_LENGTH) {
    return { ok: false, message: `Hero name must be at least ${HERO_NAME_MIN_LENGTH} characters` }
  }
  if (value.length > HERO_NAME_MAX_LENGTH) {
    return { ok: false, message: `Hero name must be at most ${HERO_NAME_MAX_LENGTH} characters` }
  }

  return { ok: true, value }
}
