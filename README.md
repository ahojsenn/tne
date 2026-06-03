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

## Game Modes

Game modes are set from `/gameconsole`. The **aim** scales with the number of connected players: `aim = 10 + 10 × players`.

The **score** formula is: `score = tomato_hits − difficulty × misses`

Game over is triggered when `|score| >= aim`.

| Mode | Difficulty | Tomato hit | Any other throw | Icon shuffle |
|---|---|---|---|---|
| **Startup** | 1 | +1 | −1 | On throw |
| **Lufthansa Technik** | 3 | +1 | −3 | On throw |
| **NASA** | 5 | +1 | −5 | On throw + every 2s automatically |

- **Throw mode** (game off) — no scoring, free throwing, icons don't shuffle
- **Startup** — easy introduction mode, low penalty for non-tomato throws
- **Lufthansa Technik** — medium difficulty, wrong throws cost more
- **NASA** — hardest mode, icons constantly reshuffle to confuse players, high miss penalty



## Installation Guide (macOS / Windows)

This guide takes you from a completely empty system to a running development environment.

### 1. Install Git

**macOS:**
```bash
# Install Homebrew first (https://brew.sh)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Then install Git
brew install git
```

**Windows:**
Download and run the installer from https://git-scm.com/download/win  
Use all default options. After install, open **Git Bash** for all commands below.

Verify:
```bash
git --version
```

---

### 2. Install Node.js

Use **Node Version Manager** — it lets you switch Node versions easily.

**macOS:**
```bash
brew install nvm
# Follow the instructions to add nvm to your shell profile, then:
nvm install 22
nvm use 22
```

**Windows:**
Download and install **nvm-windows** from https://github.com/coreybutler/nvm-windows/releases  
Then in a new terminal:
```bash
nvm install 22
nvm use 22
```

Verify:
```bash
node --version   # should show v22.x.x
npm --version
```

---

### 3. Install Yarn

```bash
npm install -g yarn
```

Verify:
```bash
yarn --version
```

---

### 4. Clone the Repository

```bash
git clone https://github.com/ahojsenn/tne.git
cd tne
```

---

### 5. Install Dependencies

```bash
yarn install
```

This installs all packages including Nuxt 3, Vue 3, Socket.io, Vuetify, Pinia and Effect.js.

---

### 6. Start the Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

To expose the server on your local network (so phones can connect):
```bash
npm run dev -- --host
```

The terminal will show a local network URL (e.g. `http://192.168.x.x:3000`) — open that on any phone on the same Wi-Fi to play.

---

### 7. Open the Right Pages

| URL | Who opens it |
|---|---|
| `http://localhost:3000/` or `/throw` | Each player on their phone |
| `http://localhost:3000/gameconsole` | Game master / big screen |
| `http://localhost:3000/catchup` | Animation display / second screen |

---

### Troubleshooting

- **Port 3000 already in use** — run `npm run dev -- --port 3001`
- **Socket.io not connecting** — make sure all devices are on the same Wi-Fi network
- **`yarn install` fails** — try deleting `node_modules/` and `yarn.lock`, then run `yarn install` again
- **Windows: `node` not found after nvm install** — close and reopen the terminal

---

## Quick Start (existing install)

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
