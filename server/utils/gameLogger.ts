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

    // One cell: sorted hero list with individual scores (computed from throws, since last_game_hero_hitlist only populates throws, not h_m_s)
    const heroSummary = heroHitlist
      .map(h => {
        const hits = h.throws.find(t => t.text === 'tomato')?.number ?? 0
        const misses = h.throws.filter(t => t.text !== 'tomato').reduce((a, t) => a + t.number, 0)
        const score = hits - game.difficulty * misses
        return { heroName: h.heroName, hits, misses, score }
      })
      .filter(h => h.hits > 0 || h.misses > 0)
      .sort((a, b) => b.score - a.score)
      .map(h => `${h.heroName}: H${h.hits} M${h.misses} S${h.score}`)
      .join(' | ') || '(no throws)'

    // One cell: overall troll/tomato score
    const trollSummary = `hits:${tomatoScore.hits} misses:${tomatoScore.misses} score:${tomatoScore.score} aim:${tomatoScore.aim}`

    // One cell: aggregate thrown items per type across all heroes in this game
    const itemTotals = new Map<string, number>()
    for (const hero of heroHitlist) {
      for (const t of hero.throws) {
        itemTotals.set(t.text, (itemTotals.get(t.text) ?? 0) + t.number)
      }
    }
    const thrownStuffSummary = [...itemTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([item, count]) => `${item}:${count}`)
      .join(' ') || '(none)'

    await appendRows(`${SHEET}!A:F`, [[eventId, dateTime, gameType, thrownStuffSummary, heroSummary, trollSummary]])
    console.log(`[gameLogger] saved ${eventId} to sheets`)
  } catch (err) {
    console.warn('[gameLogger] could not save game to sheets:', err)
  }
}
