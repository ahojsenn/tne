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
}

export type THROW = { 'text': string; 'number': number }

export type HERO_MESSAGE = {
  clientId: string
  heroName: string
  throws: THROW[]
  joined: Date
  h_m_s: SCORE,
}
