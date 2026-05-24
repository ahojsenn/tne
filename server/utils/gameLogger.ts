import { ensureSheet, appendRows } from './sheetsClient'
import type { HERO_MESSAGE } from '~/types/message'
import type { GAME } from '~/types/gameModes'

const SHEET = 'games'

export async function logGameOver(
  game: GAME,
  heroHitlist: HERO_MESSAGE[],
  tomatoScore: { hits: number; misses: number; score: number; aim: number },
): Promise<void> {
  try {
    await ensureSheet(SHEET)

    const eventId = `game-${Date.now()}`
    const dateTime = new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })
    const gameType = game.type ?? 'unknown'

    // One cell: sorted hero list with individual scores
    const heroSummary = heroHitlist
      .filter(h => h.h_m_s.hits > 0 || h.h_m_s.misses > 0)
      .sort((a, b) => b.h_m_s.score - a.h_m_s.score)
      .map(h => `${h.heroName}: H${h.h_m_s.hits} M${h.h_m_s.misses} S${h.h_m_s.score}`)
      .join(' | ') || '(no throws)'

    // One cell: overall troll/tomato score
    const trollSummary = `hits:${tomatoScore.hits} misses:${tomatoScore.misses} score:${tomatoScore.score} aim:${tomatoScore.aim}`

    await appendRows(`${SHEET}!A:E`, [[eventId, dateTime, gameType, heroSummary, trollSummary]])
    console.log(`[gameLogger] saved ${eventId} to sheets`)
  } catch (err) {
    console.warn('[gameLogger] could not save game to sheets:', err)
  }
}
