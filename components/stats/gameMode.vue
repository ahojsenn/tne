<template lang="pug">
div(:class="{gameMode: store.getGameSettings.ison}")
  div {{  store.getGameSettings.ison ? 'game mode on' : 'throw mode on' }} 
    span(v-if="store.getGameSettings.ison") game: {{ store.getGameSettings.type }}
    div score: {{ tomatoGameScore.score }} / {{ tomatoGameScore.aim }}
  div current heroes: {{ store.heroes.length }}
  button(@click="enableGameMode({'ison': true, 'difficulty': 1, 'aim': 10+10*store.heroes.length, 'type': 'Startup'})") Enable Game Mode Startup 
  br
  button(@click="enableGameMode({'ison': true, 'difficulty': 3, 'aim': 10+10*store.heroes.length, 'type': 'Lufthansa Technik'})") Enable Game Mode Lufthansa Technik
  br
  button(@click="enableGameMode({'ison': true, 'difficulty': 5, 'aim': 10+10*store.heroes.length, 'type': 'NASA'})") Enable Game Mode NASA
  br
  button(@click="gameOver") Game Over
</template>

<script setup lang="ts">
import type {GAME} from "~/types/gameModes"
let tomatoGameScore = ref({} as any)
const { $io } = useNuxtApp()
import { useClientStore } from '~/store'
const store = useClientStore()

onMounted( () => {
  $io.on('tne-reset', () => tomatoGameScore.value = {"hits": 0, "misses": 0, "score": 0})
  $io.on('gameMode', (gm: GAME) => {
    //console.log('got $io.on gamemode: ',gm)
    store.setGameSettings(gm)
  })
  $io.on('broadcast-tomato-game-score', (score: any) => {console.log("got broadcast-tomato-game-score"); tomatoGameScore.value = score})
  $io.on('gameOver', () => store.setGameSettings({'ison': false, 'difficulty': 5, 'aim': 300, 'type': 'Lufthansa Technik'}))
})

const enableGameMode =  (gm = {} as GAME) => {
  //console.log("enableGameMode: ", gm)
  store.setGameSettings(gm)
  store.reset_last_game_heroes()
  // emit the new gameMode
  $io.emit('setGameMode', gm) 
  $io.emit('delete-messages', () => {})
}
const gameOver = () => {
  //console.log("gameOver ", store.getGameSettings)
  store.setGameSettings({'ison': false, 'difficulty': 5, 'aim': 300, 'type': 'Lufthansa Technik'})
  $io.emit('setGameMode', {ison: false, "difficulty": 5, "aim": 300})
  $io.emit('clientSentGameOver', () => {})
}
</script>