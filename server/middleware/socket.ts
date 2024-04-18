// ~/server/middleware/socket.middleware.ts
import { Socket, Server } from 'socket.io'
import { HERO_MESSAGE, THROW_MESSAGE, type MESSAGE } from '~/types/message'
import { type Client } from '~/types/client'
import originalHeroes from '~/types/heroes'
import { MyGlobal } from '~/types'
import { Effect, pipe } from "effect"
import { GAME } from '~/types/gameModes'

const global = {} as MyGlobal
const messages = [] as Array<THROW_MESSAGE>
const hero_hitlist = Effect.succeed([] as Array<HERO_MESSAGE>)
const last_game_hero_hitlist = Effect.succeed([] as Array<HERO_MESSAGE>)
const tomatoGameScore = { "hits": 0, "misses": 0, "score": 0, "aim": 300, "difficulty": 5 }
let heroes = [...originalHeroes]
let replenishHeroeshowmanytimes = 0
// store different enumerables in a variable
let gameMode = { 'ison': false, 'difficulty': 5, 'aim': 300, 'type': 'Lufthansa Technik' } as GAME

const gameLog = (hl: Array<HERO_MESSAGE>) => Effect.sync(() => {
  console.log('gameLog: gameMode:', gameMode)
  console.log('gameLog: ', hl)
})

const e_heroes_with_throws = () => Effect.runSync(
  pipe(
    hero_hitlist,
    //    Effect.tap((hl) => console.log('tapped heroes', hl)),
    Effect.map(hl => hl.filter((h) => h.throws.length > 0)),
    //    Effect.tap((hl) => console.log('tapped heroes again', hl))
  )
)

// replenish heroes by resetting the array to the originalHeroes
// and add -replenishHeroes to the replenishHeroes strings
const replenishHeroes = () => {
  heroes = [...originalHeroes.map((h) => h + '-' + replenishHeroeshowmanytimes)]
  replenishHeroeshowmanytimes++
  console.log('replenishing heroes')
}

// return a random superhero that is not yet taken in clients
// and if it is taken, try add a "1" or ++ to the name and try again
const getHero = (): string => {
  if (heroes.length === 0) replenishHeroes()
  // pick a random hero from the list
  const hero = heroes[Math.floor(Math.random() * heroes.length)]
  // remove the new used hero from the heroes list
  heroes = heroes.filter((h) => h !== hero)
  return hero
}

// add hero to hitlist
const add_hero = (clientId: string, hl: Array<HERO_MESSAGE>, threw?: string) => {
  // if hero is already in hitlist, return
  if (hl.find((h) => h.clientId === clientId)) return
  // console.log('adding hero to hitlist', clientId, threw)
  const heroName = getHeroFromClientId(clientId)
  hl.push({
    clientId: clientId,
    hero: heroName,
    throws: threw ? [{ text: threw, number: 1 }] : [],
    joined: new Date()
  })
}

const gameOver = () => (tomatoGameScore.aim <= Math.abs(tomatoGameScore.score))

// add throw to hitlist
const add_throw = (clientId: string, hl: Array<HERO_MESSAGE>, threw: string) => {
  const heroName = getHeroFromClientId(clientId)
  if (!heroName) add_hero(clientId, hl, threw)
  // find hero in hero_hitlist *Attention*
  const hero = hl.find((h) => h.clientId === clientId)
  // add throw to hero
  if (!hero) {
    add_hero(clientId, hl, threw)
    console.log("WARNING: in socket.ts.add_throw: added hero ", heroName, clientId, threw, hl)
    return
  }
  const existingThrow = hero.throws.find((t) => t.text === threw)
  if (existingThrow) {
    existingThrow.number++
  } else
    hero.throws.push({ text: threw, number: 1 })
}


// get hero from clientid
const getHeroFromClientId = (clientId: string): string => {
  //  const client = clients.find((c) => c.id === clientId)
  const client = Effect.runSync(hero_hitlist).find((c) => c.clientId === clientId)
  if (client) return client.hero
  // create a new hero if not found
  const heroName = getHero()
  Effect.runSync(hero_hitlist).push({
    clientId: clientId,
    hero: heroName,
    throws: [],
    joined: new Date()
  })
  return heroName
}

// reset hero hitlist
// by setting the throws array to an empty array
// and deleting heroes that are older than 12 hours
const reset_hero_hitlist = (hl: Effect.Effect<HERO_MESSAGE[], never, never>) => {
  Effect.runSync(hl).forEach((h) => h.throws = [])
  Effect.runSync(hl).filter((h) => {
    const time = new Date().getTime() - new Date(h.joined).getTime()
    return time < 12 * 60 * 60 * 1000
  }) /**  */
}


export default defineEventHandler((event) => {
  // event.context.appSocket = appSocket
  if (global.io) return
  console.log('Initiating socket.middleware')
  /* **/
  const node = event.node
  if (!node.res.socket) {
    console.log('No socket')
    return
  }/** */
  global.io = new Server((node.res.socket as any).server)
  console.log('Socket.io server initiated: ')

  global.io.on('connect', (socket: Socket) => {
    // find out if the socket referer ist from the statistics page
    const referer = socket.handshake.headers.referer
    console.log('socket referer:', referer)

    // reset hero_hitlist
    reset_hero_hitlist(hero_hitlist)
    reset_hero_hitlist(last_game_hero_hitlist)

    socket._onerror = (err: Error) => {
      console.log('socket error', err)
    }
    socket._onconnect = () => {
      console.log('socket connected')
    }

    socket.on('tne', (data: THROW_MESSAGE) => {
      messages.push(data)
      // slice array to a maximum of 2000 items
      if (messages.length > 2000) messages.shift()
      global.io.emit('catchup-channel', data)
      // update hero_hitlist
      const hero = Effect.runSync(hero_hitlist).find((h) => h.clientId === data.clientId)
      // add hero to hitlist if not already there
      add_throw(data.clientId, Effect.runSync(hero_hitlist), data.text)
      // if gameMode is on, count the tomatoe hits
      if (gameMode.ison) {
        add_throw(data.clientId, Effect.runSync(last_game_hero_hitlist), data.text)
        if (data.text === 'tomato') tomatoGameScore.hits++
        else tomatoGameScore.misses++
        tomatoGameScore.score = tomatoGameScore.hits - tomatoGameScore.difficulty * tomatoGameScore.misses
        global.io.emit('broadcast-tomato-game-score', tomatoGameScore)
        // send "gameOver" if score is higher or equal to aim
        //  console.log('score:', gameOver(), tomatoGameScore.score, tomatoGameScore.aim)
        if (gameOver()) {
          gameMode.ison = false
          global.io.emit('gameMode', gameMode)
          global.io.emit('gameOver', { score: tomatoGameScore.score, aim: tomatoGameScore.aim })
          socket.emit('tomato_game_score', Effect.runSync(last_game_hero_hitlist))
          socket.emit('tomato_game_score', Effect.runSync(last_game_hero_hitlist))

        }
      }
      console.log('A %s was thrown from %s, score %s... ', data.text, getHeroFromClientId(data.clientId), tomatoGameScore.score)
    })

    socket.on('last-messages', (n: number) => {
      // console.log('Sending last %s messages', n)
      socket.emit('last-thrown-items', messages.slice(-n))
    })

    socket.on('delete-messages', (n: number) => {
      console.log('deleting all essages')
      // delete all messages
      messages.splice(0, messages.length)
      // reset hero_hitlist
      reset_hero_hitlist(hero_hitlist)
      reset_hero_hitlist(last_game_hero_hitlist)
      // reset tomatoGameScore
      tomatoGameScore.hits = 0
      tomatoGameScore.misses = 0
      tomatoGameScore.score = 0
      socket.emit('last-thrown-items', messages.slice(-n))
      global.io.emit('tne-reset')
    })

    socket.on('setGameMode', (gm: GAME) => {
      // console.log('--> gameMode:', gm)
      gameMode = gm
      tomatoGameScore.aim = gm.aim
      tomatoGameScore.difficulty = gm.difficulty
      // reset last_game_hero_hitlist
      if (gameMode.ison) reset_hero_hitlist(last_game_hero_hitlist)
      global.io.emit('gameMode', gm)
    })

    socket.on('clientSentGameOver', () => {
      global.io.emit('gameOver', { score: tomatoGameScore.score, aim: tomatoGameScore.aim })
      // save the game score
      // Effect.runSync(gameLog(Effect.runSync(hero_hitlist)))
      socket.emit('tomato_game_score', Effect.runSync(last_game_hero_hitlist))
    })

    socket.on("client-id", (newid: string) => {
      // find client by id
      // console.log('client-id', newid, " clients find:", getHeroFromClientId(newid))
      const client =
        {
          id: newid || socket.id,
          clientStr: socket.handshake.headers['user-agent'],
          hero: getHeroFromClientId(newid)
        } as Client
      socket.emit('new-client', client)
      // add hero to hitlist
      if (!Effect.runSync(hero_hitlist).find((h) => h.clientId === newid)) add_hero(newid, Effect.runSync((hero_hitlist)))
      // emit gameMode to new connection
      socket.emit('gameMode', gameMode)
      console.log('New client connected:  welcome %s', client.hero, client.id, socket.id)
    })

    socket.on('get_heroes', () => { socket.emit('heroes', e_heroes_with_throws()) })

    socket.on('disconnect', () => {
      // Put optional disconnect logic here
    });
  })

})

/* **/