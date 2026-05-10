# Copilot Instructions — Tomatoes and Eggs

## What This App Does

A real-time multiplayer throwing game. Players on `/throw` throw virtual items (tomatoes, eggs, shoes, cakes, frogs, stars) at targets. Results are broadcast via Socket.io to `/gameconsole` (stats/scoreboard) and `/catchup` (live animation display). The app is CSR-only (no SSR).

## Commands

```bash
npm run dev        # Dev server at http://localhost:3000
npm run build      # Production build
npm run preview    # Preview production build
npm run test       # Run all Playwright E2E tests

# Run a single test file
npx playwright test tests/e2e/tne.spec.ts

# Run a single test by name
npx playwright test -g "reset gameconsole"

# Debug mode
npx playwright test --debug
```

There is no lint command configured.

## Architecture

**Communication flow:**
1. Player opens `/throw` → Socket.io event `tne` fires with item type + hero ID
2. Server middleware (`server/middleware/socket.ts`) receives it, updates server-side stores, broadcasts to all connected clients
3. `/gameconsole` receives broadcast → updates Pinia stores → re-renders stats
4. `/catchup` receives broadcast → `useThrownItemsStore` adds item → animates it → auto-deletes after 5s

**Client/server state split:**
- Client state: Pinia stores in `store/` (`useClientStore`, `useClientHeroStore`, `useGameStore`, `useThrownItemsStore`)
- Server state: Effect.js functional stores in `server/utils/` (`heroStore.ts`, `clientStore.ts`, `messagesStore.ts`, `gameModeStore.ts`) — always accessed via `Effect.runSync()`

**Socket.io setup:**
- Server: initialized in `server/middleware/socket.ts`, event handlers delegated to `server/utils/socketHandlers.ts`
- Client: plugin at `plugins/socketClient.ts` exposes `$io` globally via `useNuxtApp().$io`

## Key Conventions

**Templates use Pug**, not HTML. All `.vue` files use `lang="pug"` in the template block and `lang="scss"` in style blocks.

**Stores are imported explicitly** — not auto-imported:
```ts
import { useClientStore } from '~/store/useClientStore'
```

**Types are imported from `~/types/`** — key types: `THROW_MESSAGE`, `HERO_MESSAGE`, `GAME`, `ThrownItem`, `Client`

**Global helpers** (`globalMixin.ts`) provide `$getRandomInt(min, max)` and `$delay(ms)` — used in throwable item components for animation randomization. These are plain exports, not a Vue mixin.

**Throwable item components** (`tomato.vue`, `egg.vue`, etc.) each accept an `x` position prop and emit a `thrown` event. They generate inline CSS keyframe animations dynamically using random values.

**Socket event names** use kebab-case: `register-tne-app-client`, `tne`, `setGameMode`, `get_heroes` (underscore for some legacy events).

**Heroes** are assigned server-side from a fixed list in `types/heroes.ts` (90+ superhero names). The client receives its hero via the `new-client` Socket event handled in `app.vue`.

**Game state classes** are applied to `<body>` from `app.vue`: `bodyClassNoGame`, `gameMode`, `gameOverWon`, `gameOverLost`.

## Project Structure Highlights

```
pages/          # throw.vue, gameconsole.vue, catchup.vue, index.vue
components/
  stats/        # heroHitlist, lastThrownItems, tomatoTrolls, gameMode, plus lastgame_ variants
server/
  middleware/   # socket.ts — Socket.io server init (runs on every request)
  utils/        # socketHandlers.ts + Effect.js stores
store/          # 4 Pinia stores
types/          # TypeScript types + heroes name list
tests/e2e/      # Playwright tests (tne.spec.ts, reset-throw-stats.spec.ts)
```

## Dependencies to Know

- **Vuetify 3** — UI components and layout
- **Socket.io 4** — real-time bidirectional communication
- **Effect.js** (`effect` package) — functional server-side state; use `Effect.runSync()` to execute effects
- **Pug** — required for all template additions
- **`@nuxtjs/device`** — available in components for mobile/desktop detection
- **`qrcode-vue3`** — used on index page for QR code to `/throw`
