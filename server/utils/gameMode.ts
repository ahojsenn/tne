import { GAME } from "~/types/gameModes"
import { reset_hero_hitlist, last_game_hero_hitlist } from "./heroes";
import { THROW_MESSAGE } from "~/types/message";

export const tomatoGameScore = { "hits": 0, "misses": 0, "score": 0, "aim": 0 }
export let gameMode = { 'ison': false, 'difficulty': 1, 'aim': 0, 'type': 'none yet' } as GAME
export const gameOver = () => (tomatoGameScore.aim <= Math.abs(tomatoGameScore.score))
export const setGameMode = (gm: GAME) => {
  // console.log('--> gameMode:', gm)
  tomatoGameScore.aim = gm.aim
  gameMode = gm
  // reset last_game_hero_hitlist
  if (gameMode.ison) reset_hero_hitlist(last_game_hero_hitlist);
}
export const calculate_score = (data: THROW_MESSAGE) => {
  // console.log("in calculate_score: ", data)
  if (data.text === 'tomato') tomatoGameScore.hits++
  else tomatoGameScore.misses++
  tomatoGameScore.score = tomatoGameScore.hits - gameMode.difficulty * tomatoGameScore.misses
}

