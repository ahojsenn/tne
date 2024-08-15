# Nuxt 3 Minimal Starter

Look at the [Nuxt 3 documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install the dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm run dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm run build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm run preview

# yarn
yarn preview

# bun
bun run preview
```
# Socket events on the socket server
- global.io.on *connect*: connect a socket
- socket.on *register-gameconsole-client*: store the connection as game console client
...



- socket.on *register-game-console*: store the connection as game console
- socket.on *tne*: a thing was thrown
	- emit *cachtup-channel* with data as THROW_MESSAGE
	- emit *tomato-game-score* if gamemode is on
	- emit "*game-over*" if game is over
- socket.on *last-messages*: send the last n messages
   - emit "last-thrown-items" as messages
- socket.on *delete-messages*: delete all messages
	- emit *last-thrown-items* with sliced data
   	- emit *tne-reset*
- game_console.on *setGameMode*: store game mode
	- global.io.emit('*gameMode*', gm)
	- game_console.emit('tomato_game_score', 	- Effect.runSync(*last_game_hero_hitlist*))
- socket.on *client-id*: hand out new client id with hero
	- socket.emit('new-client', client)
	- socket.emit('gameMode', gameMode)
-   socket.on('get_heroes', () => { socket.emit('heroes', Effect.runSync(hero_hitlist)) })
-      socket.on('disconnect', () => {
      // Put optional disconnect logic here
    }); 




