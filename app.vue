<template lang="pug">
div 
  NuxtPage 
</template>

<script setup lang="ts">
import { useGameStore } from '~/store/useGameStore';
import { useClientStore } from '~/store/useClientStore';
const game = useGameStore()
const store = useClientStore()
import type { Client } from '~/types/client'
import type { GAME } from '~/types/gameModes';
import type { ThrownItem } from '~/types/thrownItem'
import type { THROW_MESSAGE } from '~/types/message'
import { useThrownItemsStore } from '~/store/useThrownItemsStore';

const secret = useCookie('secret')
const { $io } = useNuxtApp()
const ti_store = useThrownItemsStore()

onBeforeMount(() => {
  // store a secret in a local cookie
  secret.value = secret.value || Math.random()*100000000 +""
  // and store it in the store
  store.client.id = secret.value
})

onMounted( () => {
  $io.onAny((event, ...args) => console.log('app.vue: got event:', event, args))  
  $io.emit('register-tne-app-client')
  $io.on('connect', () => $io.emit('client-id', store.client.id))
  $io.on('new-client', (c: Client) => store.storeClient(c))
  $io.on('tne-reset', () => {console.log("got reset") ;store.reset_throws()})
  $io.on('gameOver', (gameScore) =>  {
    // set game to L#ufthansaa Technik as default
    store.setGameSettings({'ison': false, 'difficulty': 5, 'aim': 300, 'type': 'Lufthansa Technik'})
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
    store.setGameSettings(gm)
    store.reset_tomatoGameScore()
    if (gm.ison) document.body.classList.add('gameMode')
    else document.body.classList.remove('gameMode')
    document.body.classList.add('bodyClassNoGame')
    game.set(gm.ison)
  }) 
  $io.emit('register-catchup-client')
  $io.on('catchup-event', (m: THROW_MESSAGE) => {
    const item: ThrownItem = {
        x: m.text,
        rnd: Math.floor(Math.random() * 100000),
      }
    ti_store.throw(item)
  })
})
</script>

<style>
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