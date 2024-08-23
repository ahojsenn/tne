<template lang="pug">
div(:class="{gameMode: store.getGameSettings.ison}")
  div {{  store.getGameSettings.ison ? 'game mode on' : 'throw mode on' }} 
    span(v-if="store.getGameSettings.ison") game: {{ store.getGameSettings.type }}

    div.gamescore(v-if="store.getGameSettings.ison") score: {{ tomatoGameScore.score }} / {{ tomatoGameScore.aim }}
    div(v-else) score: {{ tomatoGameScore.score }} / {{ tomatoGameScore.aim }}

  div current heroes: {{ store.heroes.length }}
  button(@click="enableGameMode({'ison': true, 'difficulty': 1, 'aim': game_aim(), 'type': 'Startup'})") Enable Game Mode Startup 
  br
  button(@click="enableGameMode({'ison': true, 'difficulty': 3, 'aim': game_aim(), 'type': 'Lufthansa Technik'})") Enable Game Mode Lufthansa Technik
  br
  button(@click="enableGameMode({'ison': true, 'difficulty': 5, 'aim': game_aim(), 'type': 'NASA'})") Enable Game Mode NASA
  br
  button(@click="gameOver()") Game Over
  br
  button(@click="resetHeroesList()") reset hero list
</template>

<script setup lang="ts">
import type {GAME} from "~/types/gameModes"
const { $io } = useNuxtApp()
import { useClientStore } from '~/store/useClientStore';
const store = useClientStore()
const game_aim = () => 10+10*store.heroes.length
let tomatoGameScore = ref({"hits": 0, "misses": 0, "score": 0, 'aim': game_aim()})

onMounted( () => {
  $io.emit('register-gameconsole-client')
  $io.on('tne-reset', () => tomatoGameScore.value = {"hits": 0, "misses": 0, "score": 0, aim: game_aim()})
  $io.on('gameMode', (gm: GAME) => {
    //console.log('got $io.on gamemode: ',gm)
    store.setGameSettings(gm)
  })
  $io.on('tomato-game-score', (score: any) => {console.log("got tomato-game-score"); tomatoGameScore.value = score})
  $io.on('gameOver', () => store.setGameSettings({'ison': false, 'difficulty': 5, 'aim': game_aim(), 'type': 'Lufthansa Technik'}))
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
  store.setGameSettings({'ison': false, 'difficulty': 5, 'aim': game_aim(), 'type': 'Lufthansa Technik'})
  $io.emit('setGameMode', {ison: false, "difficulty": 5, "aim": game_aim()})
  $io.emit('clientSentGameOver', () => {})
}
const resetHeroesList = () => {
  console.log("resetHeroesList")
  store.reset_last_game_heroes()  
  $io.emit('delete-messages')
  $io.emit('reset-hero-hitlist')
  console.log("resetHeroesList: ", store.last_game_heroes)
  store.reset_throws()
  store.reset_heroes()
  store.reset_tomatoGameScore()
  console.log("resetHeroesList: ", store.heroes)
} 
</script>

<style>
.gamescore {
  background: red;
  padding: 20px;
  font-size: large;
  display: inline-block;
  -webkit-transform: scale(3,3); /* Safari and Chrome */
  -moz-transform: scale(3,3); /* Firefox */
  -ms-transform: scale(3,3); /* IE 9 */
  -o-transform: scale(3,3); /* Opera */
  transform: scale(3,3); /* W3C */
}
</style>