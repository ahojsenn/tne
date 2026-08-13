import { Socket, Server } from 'socket.io'
import { THROW_MESSAGE } from '~/types/message'
import { MyGlobal } from '~/types'
import { Effect } from "effect"
import * as heroes from '../utils/heroStore'
import * as gameMode from '../utils/gameModeStore'
import * as messages from '../utils/messagesStore'
import * as handlers from '../utils/socketHandlers'
import { GAME } from '~/types/gameModes'
import { loadConfig } from '../utils/configStore'
import { type Question } from '~/types/quiz'
import * as quizStore from '../utils/quizStore'
import { logQuizResults } from '../utils/quizLogger'

export const global = {} as MyGlobal

function isExpectedSocketError(err: any): boolean {
  const code = err?.code ?? ''
  const msg: string = err?.message ?? String(err)
  return code === 'EPIPE' || code === 'ECONNRESET' || code === 'ECONNABORTED' ||
    msg.includes('EPIPE') || msg.includes('ECONNRESET') || msg.includes('write after end')
}

export default defineEventHandler((event) => {
  if (global.io) return
  const node = event.node
  if (!node.res.socket) {
    console.log('No socket')
    return
  }/** */
  global.io = new Server((node.res.socket as any).server)

  // Suppress EPIPE/ECONNRESET from clients that disconnect mid-handshake.
  // Adding an error listener to each raw transport socket prevents Node.js
  // from turning these expected disconnects into unhandled rejections.
  const httpServer = (node.res.socket as any).server
  httpServer.on('connection', (sock: NodeJS.ErrnoException & { on: Function }) => {
    sock.on('error', (err: NodeJS.ErrnoException) => {
      if (isExpectedSocketError(err)) return
      // Code and message only. Logging the error object dumps its rawPacket
      // buffer — hundreds of bytes of hex per event, which filled the journal
      // whenever a scanner spoke TLS or HTTP/2 at the plain HTTP port.
      console.error(`[socket] tcp error: ${err.code ?? 'UNKNOWN'}: ${err.message}`)
    })
  })
  console.log('Socket.io server initiated: ')

  // Log environment and spreadsheet in use
  const isProd = process.env.NODE_ENV === 'production'
  const sheetId = isProd
    ? process.env.GOOGLE_SHEETS_SPREADSHEET_ID
    : (process.env.GOOGLE_SHEETS_SPREADSHEET_ID_DEV ?? process.env.GOOGLE_SHEETS_SPREADSHEET_ID)
  console.log(`[env] NODE_ENV=${process.env.NODE_ENV ?? 'undefined'} → ${isProd ? '🚀 production' : '🛠️  development'}`)
  console.log(`[env] spreadsheet ID: ${sheetId ?? '⚠️  not set'}`)

  // Load config from Google Sheets asynchronously on startup.
  // Skip immediately if credentials are not configured (local dev without Sheets).
  const hasSheetsCreds = !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY && sheetId)
  if (!hasSheetsCreds) {
    console.warn('[socket] Google Sheets credentials not set — skipping config load (set ADMIN_PASSWORD for local auth)')
  } else {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout after 15s')), 15000)
    )
    Promise.race([loadConfig(), timeoutPromise])
      .then((cfg: any) => console.log('[socket] config loaded, admin user:', cfg.adminUser))
      .catch(err => console.warn('[socket] could not load config from Google Sheets:', err?.message ?? err))
  }


  const emitHeroesToGameConsole = (socket: Socket) => {
    console.log('emitHeroesToGameConsole')
    // list the clients in the console-channel
    console.log('clients in console-channel:', global.io.sockets.adapter.rooms.get('console-channel'))
    socket.to('console-channel').emit('heroes', Effect.runSync(heroes.hero_hitlist))
  }

  global.io.on('connect', (socket: Socket) => {
    // log stuff
    socket.onAny((eventName, ...args) => console.log('socket event:', eventName, args, socket.id))
    //  remember the catchup-channel, remember the registry of game-console
    socket.on('register-gameconsole-client', () => { socket.join("tne-gameconsole-channel"); console.log("registered") })
    socket.on('register-tne-app-client', () => socket.join("tne-app-channel"))
    socket.on('register-catchup-client', () => socket.join("catchup-channel"))
    socket.on('register-game-console', () => { socket.join("console-channel"), emitHeroesToGameConsole(socket) })
    socket._onerror = (err: Error) => console.log('socket error', err)
    socket._onconnect = () => console.log('socket connected')
    socket.on('tne', (data: THROW_MESSAGE) => handlers.handle_tne(socket, global, data))
    socket.on('last-messages', (n: number) => socket.emit('last-thrown-items', messages.messages.slice(-n)))
    socket.on('delete-messages', (n: number) => handlers.handle_delete(socket, global, n))
    socket.on('reset-hero-hitlist', () => handlers.handle_reset_hero_hitlist(socket, global))
    socket.on('setGameMode', (gm: GAME) => handlers.handle_setGameMode(socket, global, gm))
    socket.on('clientSentGameOver', () => {
      socket.emit('gameOver', { score: gameMode.tomatoGameScore.score, aim: gameMode.tomatoGameScore.aim })
      socket.emit('tomato_game_score', Effect.runSync(heroes.last_game_hero_hitlist))
    })
    socket.on('client-id', (newid: string) => handlers.handle_client_id(socket, global, newid))
    socket.on('set-speaker-hero', (data: { clientId: string; heroName: string }) => handlers.handle_set_speaker_hero(socket, global, data))
    socket.on('get_heroes', () => { socket.emit('heroes', Effect.runSync(heroes.hero_hitlist)) })
    socket.on('activate-question', (q: Question | null) => {
      // Save results of the previous question before switching
      const prev = quizStore.getActiveQuestion()
      if (prev) {
        logQuizResults(prev, quizStore.getVotes(prev.id))
          .catch(e => console.warn('[socket] logQuizResults failed:', e))
      }
      quizStore.setActiveQuestion(q)
      global.io.emit('active-question', q)
      global.io.emit('quiz-vote-update', { questionId: q?.id ?? null, votes: {} })
    })
    socket.on('get-active-question', () => {
      socket.emit('active-question', quizStore.getActiveQuestion())
    })
    socket.on('submit-answer', ({ questionId, answerId }: { questionId: string; answerId: string }) => {
      quizStore.recordVote(questionId, answerId)
      global.io.emit('quiz-vote-update', { questionId, votes: quizStore.getVotes(questionId) })
    })
    socket.on('disconnect', (reason) => { console.log('Client disconnected: ', socket.id, reason) });
  })
})