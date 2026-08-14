/**
 * The talk currently being given, as every client sees it.
 *
 * Deliberately carries no email: this object is broadcast to every connected
 * client, including the audience on /throw. The speaker's address stays in the
 * server-side store.
 */
export type ACTIVE_TALK = {
  id: string
  displayName: string
  heroName: string
  startedAt: string // ISO 8601 — survives the trip over Socket.io as a string
}

/**
 * A speaker the gameconsole can put on stage.
 *
 * `handle` identifies the speaker without revealing them: it is an HMAC of the
 * email (see speakerHandle in speakerStore), so the operator's list and the
 * activation call never carry an address around.
 */
export type SPEAKER_OPTION = {
  handle: string
  displayName: string
  heroName: string
}
