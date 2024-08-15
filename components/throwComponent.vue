<template lang="pug">
div.thrower(@wheel.prevent @touchmove.prevent @scroll.prevent)
  div.f1 {{ store.getHero }} threw {{ store.getNumberOfThrows }} things, score: {{ store.getScore }}
  span(v-if="store.getGameSettings.type==='NASA'") NASA mode active
  div(v-for="img,i in getImageLinks()")
    div.column(@click="onClickImage(throwables[i])" :id="throwables[i]")
      img.i1(:src="img" :alt="throwables[i]")
      div.f1 {{store.getNumberOfThrowsOf(throwables[i])  }}
  div
    span.k &copy;k
    span.kommitment ommitment 2024
</template>
  
<script setup lang="ts">
import { type THROW_MESSAGE } from '~/types/message'
import { useClientStore } from '~/store/useClientStore'
import { useGameStore } from '~/store/useGameStore'
const store = useClientStore()
const game = useGameStore()
const { $io } = useNuxtApp()

const connected = ref(false)
let throwables= ref(['star', 'cake', 'tomato', 'egg', 'frog', 'shoe'])

const getImageLinks = (): string[] => {
  return throwables.value.map((throwable: string) => `/img/${throwable}_throw.png`)
}
const rotateImages = () => {
  throwables.value.sort(() => Math.random() - 0.5)
}

const startRotation = () => setInterval(() => {
  if (store.getGameSettings.type === 'NASA' && game.isOn) rotateImages()
}, 2000)

const onClickImage = async (thing: string) => {
  const audioBoing = new Audio('/audio/boiiing.mp3')
  const yayTomato = new Audio('/audio/yayTomato.mp3')
  store.storeThrow(thing)
  store.calculate_score({"text": thing, "clientId": "none"})
  const message = {
    text: thing.trim(),
    clientId: store.client.id ?? 'unknown',
  } as THROW_MESSAGE
  if (!$io.connected) return
  $io.emit('tne', message  )

  // rotate images if game mode is not Startup and if gamemode is on
  if (store.getGameSettings.type !== 'Startup' && game.isOn) rotateImages()
  // iphones can not be vibrated from JS as of 03/2024
  const clientCanVibrate = window.navigator.vibrate !== undefined
  const letzVibrateTheClientFor100ms = () => window.navigator.vibrate(100)
  if (clientCanVibrate) ((letzVibrateTheClientFor100ms()))

  if (store.getGameSettings.ison && thing != 'tomato') {
    audioBoing.play()
  }
  else if (store.getGameSettings.ison) {
    yayTomato.play()
  }
  
  // if (store.getGameSettings.ison && (store.getGameSettings.type === 'NASA')) throwables.sort(() => Math.random() - 0.5)
}

onMounted(() => {
  document.getElementById('body')?.requestFullscreen()
  // start a function that will repeat after 2 seconds
  startRotation()
  onMounted(() => {
    startRotation()
  })
})
</script>

<style>
.thrower {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 0px solid green;
  padding: 0px;
  text-align: center; 
  z-index: 80;
}

.f1 {
  /* a slightly transparent color */
  color: rgba(255, 255, 255, 0.9);
  font-size: 1em;
  font-family: 'Courier New', Courier, monospace;
}

.i1 {
  display: block;
  margin-left: auto;
  margin-right: auto;
  max-width: 40vw;
  max-height: 30vh;
  transform: scale(1);
  transition: all 0.1s ease-in-out;
}
.i1inaktive:hover {
  background-color: rgb(73, 42, 42);
  transform: scale(1.1);
}
.i1:active {
  background-color: rgb(100, 42, 42);
  transform: scale(0);
}
.column {
  float: left;
  width: 50%;
  padding: 5px;
}

.k {
  font-family: 'Roboto Mono';
  src: url('../fonts/roboto-mono-v23-latin-regular.woff2');
  font-weight: 800;
  color: rgba(255, 255, 255, 0.9);
}
.kommitment {
  /* roboto mono small caps */
  font-family: 'Roboto Mono';
  src: url('../fonts/roboto-mono-v23-latin-regular.woff2') format('woff2');
  font-variant-caps: small-caps;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.9);
}

</style>
