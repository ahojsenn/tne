<template lang="pug">
div
  //- Password gate
  .auth-gate(v-if="!authenticated")
    .auth-card
      h2 🎮 Game Console
      input.auth-input(
        v-model="password"
        type="password"
        placeholder="Password"
        :disabled="checking"
        @keyup.enter="login"
        autofocus
      )
      p.auth-error(v-if="error") {{ error }}
      button.auth-btn(:disabled="checking" @click="login") {{ checking ? '…' : 'Enter' }}

  //- Console content
  div.statistics(v-if="authenticated")
    h1 Game Console
    stats_gameMode
    div ---  
    table.small
      thead
        tr
          th Thrown Stuff
          th Hero Hitlist
          th Tomato Trolls
      tbody
        tr
          td 
            stats_lastThrownItems
          td 
            stats_heroHitlist
          td
            stats_tomatoTrolls
    div ---
    div.small last game
    table.small(v-if="store.last_game_heroes.length > 0 || true")
      thead
        tr
          th Thrown Stuff last game
          th Hero Hitlist last game
          th Tomato Trolls last game
      tbody
        tr
          td 
            stats_lastgame_lastThrownItems
          td 
            stats_lastgame_heroHitlist
          td
            stats_lastgame_tomatoTrolls

    iframe(style="position: absolute; height: 30%; border: none; opacity: 0.5" 
          allowtransparency="true" src="catchup" 
          width='30%' scrolling="no")
</template>


<script setup lang="ts">
const { $io } = useNuxtApp()

import { type MESSAGE, type HERO_MESSAGE } from '~/types/message'
type clients = { hero: string; throws: number }
const m = ref( [] as Array<MESSAGE>)
import { useClientStore } from '~/store/useClientStore';
const store = useClientStore()

const last_game_heroes = ref([] as HERO_MESSAGE[])

// --- Auth ---
const authenticated = ref(false)
const password = ref('')
const error = ref('')
const checking = ref(false)

onMounted(() => {
  if (sessionStorage.getItem('tne-console-auth') === '1') {
    authenticated.value = true
  }
})

async function login() {
  if (!password.value) return
  error.value = ''
  checking.value = true
  try {
    await $fetch('/api/auth/verify', {
      method: 'POST',
      body: { password: password.value },
    })
    sessionStorage.setItem('tne-console-auth', '1')
    authenticated.value = true
  } catch (e: any) {
    error.value = e?.data?.statusMessage === 'Wrong password'
      ? 'Wrong password, try again.'
      : 'Could not verify — please retry.'
  } finally {
    checking.value = false
    password.value = ''
  }
}

// --- Socket ---
onMounted(() => {
  $io.onAny((event, ...args) => console.log('gameconsole: got event:', event, args))
  // register game-console for incoming messages
  $io.emit('register-game-console')
  $io.on('heroes', (msgs: HERO_MESSAGE[]) => { 
    console.log('in gameconsole: got HERO_MESSAGE[]...', msgs)
    store.heroes = msgs
  })
  $io.on('tomato_game_score', (tgs) => {
    console.log('gameconsole: got last tomato game score', tgs, store.last_game_heroes)
    store.storeLastGameHeroes(tgs)
  })
  // every three seconds emit a request for the last 10000 messages
  setInterval(() => $io.emit('get_heroes',10000), 5000)
})
</script>


<style>
.auth-gate {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
}
.auth-card {
  background: #1e1e1e;
  border: 1px solid #444;
  border-radius: 10px;
  padding: 32px;
  width: 340px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  font-family: 'Courier New', Courier, monospace;
  color: white;
}
.auth-card h2 { margin: 0; font-size: 1.2em; }
.auth-input {
  background: #2a2a2a;
  border: 1px solid #555;
  border-radius: 4px;
  color: white;
  font-family: 'Courier New', Courier, monospace;
  font-size: 1em;
  padding: 10px;
  width: 100%;
  box-sizing: border-box;
}
.auth-input:focus { outline: 2px solid greenyellow; border-color: greenyellow; }
.auth-error { color: #ff6b6b; margin: 0; font-size: 0.85em; }
.auth-btn { width: 100%; padding: 10px; font-size: 1em; }

button {
  background-color: grey;
}

/* I want to have an onclick effect on  buttons */
button:active {
  background-color: rgb(205, 239, 239);
  color: black;
}
.statistics {
  color: white;
  font-family: 'Lucida Console', 'Courier New', monospace;
  /*background-color: black ;*/
}
iframe {
  top: 0;
  right: 0;
  position: fixed;
}
.small {
  font-size: 0.7em;
}
table {
  border-collapse: collapse;
  margin: 10px;
  padding: 8px;
}
td, th {
  border: 1px solid #dddddd;
  text-align: left;
  padding: 7px;
  vertical-align: top;
}
</style>
