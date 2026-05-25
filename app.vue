<template lang="pug">
div
  div.nav-menu(style="position: fixed; top: 10px; right: 10px; z-index: 9999")
    button.nav-toggle(@click="drawer = !drawer") ☰
    div.nav-drawer(v-if="drawer")
      a.nav-item(v-for="item in navItems" :key="item.title" :href="item.href" @click="drawer = false")
        span {{ item.title }}
      a.nav-item(v-if="spreadsheetUrl" :href="spreadsheetUrl" target="_blank" @click="drawer = false")
        span 📊 Spreadsheet
      a.nav-item(href="https://github.com/ahojsenn/tne" target="_blank" @click="drawer = false")
        span 🐙 GitHub
  NuxtPage
</template>

<script setup lang="ts">
const navItems = [
  { title: 'Home',         href: '/' },
  { title: 'Throw',        href: '/throw' },
  { title: 'Game Console', href: '/gameconsole' },
  { title: 'Quiz',         href: '/quiz' },
  { title: 'Answer',       href: '/answer' },
  { title: 'Catchup',      href: '/catchup' },
  { title: 'Kommitment',   href: '/kommitment' },
]

const drawer = ref(false)
const spreadsheetUrl = ref<string | null>(null)

onMounted(async () => {
  const data = await $fetch<{ url: string | null }>('/api/spreadsheet-url')
  spreadsheetUrl.value = data.url
})

import { useGameStore } from '~/store/useGameStore';
import { useClientStore } from '~/store/useClientStore';
const game = useGameStore()
const clientStore = useClientStore()
import type { Client } from '~/types/client'
import type { GAME } from '~/types/gameModes';

import type { THROW_MESSAGE } from '~/types/message'
import { useClientHeroStore } from './store/useClientHeroStore';

const secret = useCookie('secret')
const { $io } = useNuxtApp()
const clientHeroStore = useClientHeroStore()  

onBeforeMount(() => {
  // store a secret in a local cookie
  secret.value = secret.value || Math.random()*100000000 +""
  // and store it in the store
  clientStore.client.id = secret.value
})

onMounted( () => {
  console.log('app.vue: onMounted')
  document.body.classList.add('bodyClassNoGame')
  $io.onAny((event, ...args) => console.log('app.vue: got event:', event, args))  

  // watch the clientStore for changes/throws and emit them to the server
  clientStore.$subscribe((mutation, state) => {
    // console.log('mutation: ', mutation)
    if (!state.throws) return
    const thing = state.LastThrownItem
    // console.log('a change happened: ', thing , 'was thrown')
    const message = {text: thing.trim(), clientId: clientStore.client.id ?? 'unknown',} as THROW_MESSAGE
    if (!$io.connected) return
    // console.log('emitting tne message: ', message)
    //$io.emit('tne', message  )
  })

  $io.on('new-client', (c: Client) => {
    // get this socketId
    clientStore.client.socketId = c.socketId
    clientStore.storeClient(c)
    clientHeroStore.newHero(c.hero)
  })
  $io.on('tne-reset', () => {
    clientStore.reset_throws()
    // clientHeroStore.reset_hero()
  })
  $io.on('gameOver', (gameScore) =>  {
    // set game to L#ufthansaa Technik as default
    clientStore.setGameSettings({'ison': false, 'difficulty': 5, 'aim': 300, 'type': 'Lufthansa Technik'})
    const weWon = gameScore.score >= gameScore.aim

    // audio
    const audioGameOver = new Audio('/audio/gameOver.mp3')
    audioGameOver.play()
    // blink background color six times
    for (let i = 0; i < 6; i++) {
      const cl =  weWon ? 'gameOverWon' : 'gameOverLost'
      setTimeout(() => document.body.classList.toggle(cl), i*500)
    }
    // set background to gameMode if it is not the catchup page
    document.body.classList.remove('gameMode')
    document.body.classList.add('bodyClassNoGame')
  })
  $io.on('gameMode', (gm: GAME) => {
    console.log(' app.$io.on. got GameMode: ', gm)
    clientStore.setGameSettings(gm)
    clientStore.reset_tomatoGameScore()
    if (gm.ison) document.body.classList.add('gameMode')
    else document.body.classList.remove('gameMode')
    document.body.classList.add('bodyClassNoGame')
    game.set(gm.ison)
  }) 

  // every 10 seconds log $io connection status
  setInterval(() => console.log('app.vue: $io.connected: ', $io.connected), 10000)
})
</script>

<style>
.nav-menu {
  position: fixed;
  top: 10px;
  right: 10px;
  z-index: 9999;
}

.nav-toggle {
  background: black;
  color: greenyellow;
  border: 1px solid greenyellow;
  border-radius: 4px;
  font-size: 1.2em;
  padding: 4px 10px;
  cursor: pointer;
}

.nav-drawer {
  position: absolute;
  top: 36px;
  right: 0;
  background: black;
  border: 1px solid greenyellow;
  border-radius: 4px;
  min-width: 160px;
  padding: 6px 0;
}

.nav-item {
  display: block;
  color: greenyellow;
  text-decoration: none;
  padding: 8px 16px;
  font-family: 'Courier New', Courier, monospace;
}

.nav-item:hover {
  background: rgba(173, 255, 47, 0.15);
}

.bodyClassNoGame {
  background-color: rgba(0, 0, 0, 1);
  color: white;
  font-family: 'Courier New', Courier, monospace;
} 
.ibm {
  color: greenyellow;
  font-family: 'Courier New', Courier, monospace;
}
.gameMode {
  background-color: rgb(60, 8, 60);
}
.gameOverWon {
  background-color: rgb(22, 211, 25);
}
.gameOverLost {
  background-color: rgb(211, 8, 86);
}
button {
  background-color: grey;
  /* nice rounded corners */
  border-radius: 3px;
  /* nice shadow */
  box-shadow: 2px 2px 2px 2px rgba(0, 0, 0, 0.2);
  /* nice padding */
  padding: 1px;
  /* nice border */
  border: 1px solid grey;
  /* nice color */
  color: white;
  /* nice font */
  font-family: 'Courier New', Courier, monospace;
  /* nice font size */
  font-size: 1em;
  /* nice cursor */
  cursor: pointer;
  /* nice margin */
  margin: 1px;
  /* nice hover effect */
  transition: all 0.1s ease-in-out;

}
</style>