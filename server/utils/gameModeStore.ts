import { GAME } from "~/types/gameModes"
import { reset_hero_hitlist, last_game_hero_hitlist } from "./heroStore";
import { HERO_MESSAGE, THROW_MESSAGE } from "~/types/message";
import * as heroes from "./heroStore";
import { Effect } from "effect";

export const tomatoGameScore = { "hits": 0, "misses": 0, "score": 0, "aim": 0 }
export let gameMode = { 'ison': false, 'difficulty': 1, 'aim': 0, 'type': 'none yet' } as GAME
export const gameOver = () => (tomatoGameScore.aim <= Math.abs(tomatoGameScore.score))
export const setGameMode = (gm: GAME) => {
  // console.log('--> gameMode:', gm)
  tomatoGameScore.aim = gm.aim
  gameMode = gm
  // reset last_game_hero_hitlist
  if (gameMode.ison) reset_hero_hitlist(last_game_hero_hitlist)
  // set all the hero scores to zero
  heroes.reset_hero_scores(Effect.runSync((heroes.hero_hitlist)))
}

export const calculate_score = (data: THROW_MESSAGE) => {
  // console.log("in calculate_score: ", data)
  if (data.text === 'tomato') tomatoGameScore.hits++
  else tomatoGameScore.misses++
  tomatoGameScore.score = tomatoGameScore.hits - gameMode.difficulty * tomatoGameScore.misses
}

export const updateHeroScore = (clientId: string, hl: Array<HERO_MESSAGE>, data: THROW_MESSAGE) => {
  // console.log('updating hero score', hl)
  const heromsg = hl.find((h) => h.clientId === clientId)
  // console.log('hero:', heromsg)
  if (heromsg) {
    heromsg.h_m_s.hits += data.text === 'tomato' ? 1 : 0
    heromsg.h_m_s.misses += data.text === 'tomato' ? 0 : 1
    heromsg.h_m_s.score += data.text === 'tomato' ? 1 : -1 * gameMode.difficulty
  }
}

