// define MESSAGE types
export type MESSAGE = {
  message: {
    text: string
    date: Date
    clientId: string
    clientInfo: string
    hero: string
  }
}

export type SCORE = {
  hits: number
  misses: number
  score: number
}

export type THROW_MESSAGE = {
  text: string
  clientId: string
  /**
   * The talk this throw was aimed at, or absent when nobody is on stage —
   * free play stays valid. Always set by the server in handle_tne from the
   * active talk; anything a client sends is discarded.
   */
  talkId?: string
}

export type THROW = { 'text': string; 'number': number }

export type HERO_MESSAGE = {
  clientId: string
  heroName: string
  throws: THROW[]
  joined: Date
  h_m_s: SCORE,
}
