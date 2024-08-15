import { Socket, Server } from 'socket.io'
import { THROW_MESSAGE } from '~/types/message'
import { MyGlobal } from '~/types'
import { Effect } from "effect"
import * as heroes from '../utils/heroes'
import * as gameMode from '../utils/gameMode'
import * as messages from '../utils/messages'
import * as handlers from '../utils/socketHandlers'

export const global = {} as MyGlobal

export default defineEventHandler((event) => {
  if (global.io) return
  const node = event.node
  if (!node.res.socket) {
    console.log('No socket')
    return
  }/** */
  global.io = new Server((node.res.socket as any).server)
  console.log('Socket.io server initiated: ')

  global.io.on('connect', (socket: Socket) => {
    // reset hero_hitlist
    heroes.reset_hero_hitlist(heroes.hero_hitlist)
    heroes.reset_hero_hitlist(heroes.last_game_hero_hitlist)
    // log stuff
    socket.onAny((eventName, ...args) => console.log('socket event:', eventName, args, soc keySet.id))
    //  remember the catchup-channel, remember the registry of game-console
    socket.on('register-gameconsole-client', () => { socket.join("tne-gameconsole-channel"); console.log("registered") })
    socket.on('register-tne-app-client', () => socket.join("tne-app-channel"))
    socket.on('register-catchup-client', () => socket.join("catchup-channel"))
    socket.on('register-game-console', () => socket.join("console-channel"))
    socket._onerror = (err: Error) => console.log('socket error', err)
    socket._onconnect = () => console.log('socket connected')
    socket.on('tne', (data: THROW_MESSAGE) => handlers.handle_tne(socket, global, data))
    socket.on('last-messages', (n: number) => socket.emit('last-thrown-items', messages.messages.slice(-n)))
    socket.on('delete-messages', (n: number) => handlers.handle_delete(socket, global, n))
    socket.on('setGameMode', gm => {
      gameMode.setGameMode(gm)
      global.io.emit('gameMode', gm)
    })
    socket.on('clientSentGameOver', () => {
      socket.emit('gameOver', { score: gameMode.tomatoGameScore.score, aim: gameMode.tomatoGameScore.aim })
      socket.emit('tomato_game_score', Effect.runSync(heroes.last_game_hero_hitlist))
    })
    socket.on('client-id', (newid: string) => handlers.handle_client_id(socket, global, newid))
    socket.on('get_heroes', () => { socket.emit('heroes', Effect.runSync(heroes.hero_hitlist)) })
    socket.on('disconnect', (reason) => {
      const c = heroes.getHeroFromClientId(socket.id)
      console.log('Client disconnected: ', socket.id, c, reason)
      // Put optional disconnect logic here
    });
  })
})