import { Socket } from 'socket.io'
import { THROW_MESSAGE } from '~/types/message'
import { type Client } from '~/types/client'
import { MyGlobal } from '~/types'
import { Effect } from "effect"
import * as heroes from '../utils/heroes'
import * as gameMode from '../utils/gameMode'
import * as messages from '../utils/messages'

export function handle_client_id(socket: Socket, global: MyGlobal, newid: string): void {
  // find client by id
  console.log('client-id', newid, " clients find:", heroes.getHeroFromClientId(newid))
  const client =
    {
      id: newid || socket.id,
      clientStr: socket.handshake.headers['user-agent'],
      hero: heroes.getHeroFromClientId(newid)
    } as Client
  socket.emit('new-client', client)
  // check, if this is a new client
  if (!heroes.clientIdIsKnown(newid)) {
    console.log('new client')
    // add hero to hitlist
    heroes.add_hero(newid, Effect.runSync((heroes.hero_hitlist)))
  }
  // console.log('hero_hitlist:', Effect.runSync(heroes.hero_hitlist))
  // emit gameMode to new connection
  socket.emit('gameMode', gameMode.gameMode)
  // console.log('Client connected:  welcome %s', client.hero, client.id, socket.id, socket.request.headers.referer)
}

export function handle_delete(socket: Socket, global: MyGlobal, n: number): void {
  console.log('deleting all messages')
  // delete all messages
  messages.delete_all_messages()
  // reset hero_hitlist
  heroes.reset_hero_hitlist(heroes.hero_hitlist)
  heroes.reset_hero_hitlist(heroes.last_game_hero_hitlist)
  console.log('after reset: hero_hitlist:', Effect.runSync(heroes.hero_hitlist))
  console.log('after reset: last_game_hero_hitlist:', Effect.runSync(heroes.last_game_hero_hitlist))
  // reset tomatoGameScore
  gameMode.tomatoGameScore.hits = 0
  gameMode.tomatoGameScore.misses = 0
  gameMode.tomatoGameScore.score = 0
  socket.emit('last-thrown-items', messages.messages.slice(-n))
  global.io.emit('tne-reset')
}

export function handle_tne(socket: Socket, global: MyGlobal, data: THROW_MESSAGE): void {
  global.io.to('catchup-channel').emit("catchup-event", data)
  messages.add_to_messages(data)
  // update hero_hitlist
  const hero = Effect.runSync(heroes.hero_hitlist).find((h) => h.clientId === data.clientId)
  // add hero to hitlist if not already there
  heroes.add_throw(data.clientId, Effect.runSync(heroes.hero_hitlist), data.text)
  gameMode.calculate_score(data)
  // if gameMode is on, count the tomatoe hits
  if (gameMode.gameMode.ison) {
    console.log('gameMode is on')
    heroes.add_throw(data.clientId, Effect.runSync(heroes.last_game_hero_hitlist), data.text)
    global.io.to('tne-gameconsole-channel').emit('tomato-game-score', gameMode.tomatoGameScore)
    // send "gameOver" if score is higher or equal to aim
    // console.log('score:', gameOver(), tomatoGameScore.score, tomatoGameScore.aim)
    if (gameMode.gameOver()) {
      console.log('game over')
      gameMode.gameMode.ison = false
      global.io.emit('gameMode', gameMode.gameMode)
      global.io.emit('gameOver', { score: gameMode.tomatoGameScore.score, aim: gameMode.tomatoGameScore.aim })
      global.io.to('tne-gameconsole-channel').emit('tomato_game_score', Effect.runSync(heroes.last_game_hero_hitlist))
    }
  }
  console.log('A %s was thrown from %s, score %s... ',
    data.text, heroes.getHeroFromClientId(data.clientId),
    gameMode.tomatoGameScore.score)

}