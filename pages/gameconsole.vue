<template lang="pug">
div.statistics
  h1 Game Console
  stats_gameMode
  div ---  
  table.small
    tr
      th Thrown Stuff
      th Hero Hitlist
      th Tomato Trolls
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
    tr
      th Thrown Stuff last game
      th Hero Hitlist last game
      th Tomato Trolls last game
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
