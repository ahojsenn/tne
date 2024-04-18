<template lang="pug">
div.statistics
  h1 Throw Statistics
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
  table.small(v-if="store.last_game_heroes.length > 0")
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
import { on } from 'events';
import { type MESSAGE, type HERO_MESSAGE } from '~/types/message'
type clients = { hero: string; throws: number }
const m = ref( [] as Array<MESSAGE>)
import { useClientStore } from '~/store'
const store = useClientStore()

const last_game_heroes = ref([] as HERO_MESSAGE[])

onMounted(() => {
  $io.on('heroes', (msgs: HERO_MESSAGE[]) => {
    //console.log('got HERO_MESSAGE[]...', msgs)
    store.heroes = msgs
  })
  $io.on('tomato_game_score', (tgs) => {
    store.storeLastGameHeroes(tgs)
    console.log('throw_statistics: got tomato game score', tgs, store.last_game_heroes)
  })
  // every three seconds emit a request for the last 10000 messages
  setInterval(() => $io.emit('get_heroes', () => {}), 2000)
})
</script>

<style>
button {
  background-color: grey;
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
