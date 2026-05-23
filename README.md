# Tomatoes and Eggs

A real-time multiplayer throwing game. Players throw virtual items (tomatoes, eggs, shoes, cakes, frogs, stars) at targets. Results are broadcast live to a game console and a catchup animation display.

## Tech Stack

- **[Nuxt 3](https://nuxt.com)** — Vue 3 framework, CSR-only (no SSR)
- **[Vue 3](https://vuejs.org)** + **[Pinia](https://pinia.vuejs.org)** — UI and client-side state
- **[Socket.io 4](https://socket.io)** — real-time bidirectional communication
- **[Effect.js](https://effect.website)** — functional server-side state management
- **[Vuetify 3](https://vuetifyjs.com)** — UI components
- **[Playwright](https://playwright.dev)** — end-to-end testing
- **Pug** — template language (all `.vue` files use `lang="pug"`)

## Pages

| Route | Purpose |
|---|---|
| `/` | Landing page — shows QR code, catchup iframe, and throw interface |
| `/throw` | Throw interface — players tap items to throw them |
| `/gameconsole` | Game console — live scoreboard, hero hitlist, stats |
| `/catchup` | Animation display — shows flying items in real time (embed or standalone) |
| `/kommitment` | Info page |

## Communication Flow

```
Player (/throw)
  │
  │  Socket.io emit: "tne" {text, clientId}
  ▼
Server middleware (server/middleware/socket.ts)
  │
  ├──► emit "catchup-event"    → /catchup  (animation)
  ├──► emit "client-hero"      → throwing client (updated score)
  ├──► emit "tomato-game-score"→ /gameconsole (if game on)
  └──► emit "gameOver"         → all clients (if game ends)
```

## Architecture

**Client state** (Pinia stores in `store/`):
- `useClientStore` — client identity, throws, game settings
- `useClientHeroStore` — current player's hero and score
- `useGameStore` — game on/off state
- `useThrownItemsStore` — items in flight for catchup animation

**Server state** (Effect.js in `server/utils/`):
- `heroStore.ts` — hero scores and hitlist
- `clientStore.ts` — connected clients
- `messagesStore.ts` — thrown item history
- `gameModeStore.ts` — game mode configuration

**Socket setup:**
- Server: `server/middleware/socket.ts` (init) → `server/utils/socketHandlers.ts` (logic)
- Client: `plugins/socketClient.ts` — exposes `$io` via `useNuxtApp().$io`

Look at the [Nuxt 3 documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install the dependencies:

```bash
yarn install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
npm run dev
```

## Production

Build the application for production:

```bash
npm run build
```

Locally preview production build:

```bash
npm run preview
```

## Testing

Run all Playwright E2E tests:

```bash
npm run test
```

## Socket events on the socket server

### Registration
- socket.on **`register-tne-app-client`**: join `tne-app-channel`
- socket.on **`register-gameconsole-client`**: join `tne-gameconsole-channel`
- socket.on **`register-catchup-client`**: join `catchup-channel`
- socket.on **`register-game-console`**: join `console-channel`
  - emit `heroes` to `console-channel`

### Gameplay
- socket.on **`tne`**: a thing was thrown
  - emit `catchup-event` to `catchup-channel` with data as `THROW_MESSAGE`
  - emit `client-hero` back to the throwing client with updated score
  - if game mode is on: emit `tomato-game-score` to `tne-gameconsole-channel`
  - if game is over: emit `gameMode` and `gameOver` to all, emit `tomato_game_score` to `tne-gameconsole-channel`
- socket.on **`setGameMode`**: set game mode, reset hero hitlist, notify all clients
  - emit `client-hero` to each connected client
  - emit `gameMode` to all
- socket.on **`clientSentGameOver`**: client signals game over
  - emit `gameOver` and `tomato_game_score` back to caller

### Data
- socket.on **`client-id`**: register client and assign hero
  - emit `new-client` with client info
  - emit `client-hero` with hero data
  - emit `gameMode` with current game mode
- socket.on **`get_heroes`**: request hero hitlist
  - emit `heroes` with current hero hitlist
- socket.on **`last-messages`** *(n)*: request last n thrown items
  - emit `last-thrown-items` with sliced message list
- socket.on **`delete-messages`**: delete all messages and reset score
  - emit `last-thrown-items` (empty)
  - emit `tne-reset` to all
- socket.on **`reset-hero-hitlist`**: reset all hero scores
  - emit `tne-reset` to all
- socket.on **`disconnect`**: client disconnected (logged)
