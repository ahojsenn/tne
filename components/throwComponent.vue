<template lang="pug">
div.thrower(@wheel.prevent @touchmove.prevent @scroll.prevent)
  div.f1 {{ clientHeroStore.getHero.heroName }}: {{ clientHeroStore.getNumberOfThrows }} throws, score: {{ clientHeroStore.getHeroScore }}
  span(v-if="clientStore.getGameSettings.type==='NASA'") NASA mode active
  div(v-for="img,i in getImageLinks()" :key="img")
    div.column(@pointerdown="onClickImage($event, throwables[i])" :id="throwables[i]")
      img.i1(:src="img" :alt="throwables[i]")
      div.f1 {{clientHeroStore.getNumberOfThrowsOf(throwables[i])  }}
  div
    span.k &copy;&nbsp;
    span.kommitment kommitment 2024
</template>
  
<script setup lang="ts">
import { type HERO_MESSAGE, type SCORE, type THROW_MESSAGE } from '~/types/message'
import { useClientStore } from '~/store/useClientStore'
import { useGameStore } from '~/store/useGameStore'
import { useClientHeroStore } from '~/store/useClientHeroStore'
const clientStore = useClientStore()
const clientHeroStore = useClientHeroStore()  
const game = useGameStore()
const { $io } = useNuxtApp()

useHead({
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' }]
})

const connected = ref(false)
let throwables= ref(['star', 'cake', 'tomato', 'egg', 'frog', 'shoe'])

const getImageLinks = (): string[] => {
  return throwables.value.map((throwable: string) => `/img/${throwable}_throw.png`)
}
const rotateImages = () => {
  throwables.value.sort(() => Math.random() - 0.5)
}

const startRotation = () => setInterval(() => {
  if (clientStore.getGameSettings.type === 'NASA' && game.isOn) rotateImages()
}, 2000)

const audioBoing = new Audio('/audio/boiiing.mp3')
const yayTomato = new Audio('/audio/yayTomato.mp3')

// Batch state/DOM updates so rapid taps don't trigger re-renders mid-tap-sequence.
// Emits fire instantly; store updates are flushed 150ms after the last tap.
const pendingThrows: string[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null

const flushPending = () => {
  const batch = [...pendingThrows]
  pendingThrows.length = 0
  flushTimer = null
  for (const t of batch) {
    clientStore.storeThrow(t)
  }
  if (clientStore.getGameSettings.type !== 'Startup' && game.isOn) rotateImages()
}

// Synthetic mouse pointerdown events fire up to ~350ms after a touch event.
// Track the last pointer type + time so we can discard them.
let lastPointerType = ''
let lastEmitAt = 0

const onClickImage = (event: PointerEvent, thing: string) => {
  if (!event.isPrimary) return
  const now = Date.now()
  // Discard synthetic mouse event that follows a real touch tap
  if (event.pointerType === 'mouse' && lastPointerType === 'touch' && now - lastEmitAt < 500) return

  lastPointerType = event.pointerType
  lastEmitAt = now

  if (!$io.connected) {
    console.log('throwComponent.vue: not connected to server')
    return
  }
  // emit immediately — synchronous, no DOM side effects
  $io.emit('tne', {
    text: thing.trim(),
    clientId: clientStore.client.id ?? 'unknown',
  } as THROW_MESSAGE)

  // queue store update — DOM stays frozen until tapping pauses
  pendingThrows.push(thing)
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(flushPending, 150)

  if (window.navigator.vibrate) window.navigator.vibrate(100)

  if (clientStore.getGameSettings.ison && thing !== 'tomato') {
    audioBoing.currentTime = 0
    audioBoing.play()
  } else if (clientStore.getGameSettings.ison) {
    yayTomato.currentTime = 0
    yayTomato.play()
  }
}

// Prevent pinch-zoom and double-tap zoom (iOS Safari ignores user-scalable=no)
let lastTouchEnd = 0
const preventPinch = (e: TouchEvent) => { if (e.touches.length > 1) e.preventDefault() }
const preventDoubleTap = (e: TouchEvent) => {
  const now = Date.now()
  if (now - lastTouchEnd < 300) e.preventDefault()
  lastTouchEnd = now
}

onMounted(() => {
  document.addEventListener('touchstart', preventPinch, { passive: false })
  document.addEventListener('touchend', preventDoubleTap, { passive: false })
  console.log('throwComponent.vue: onMounted')
  $io.onAny((event, ...args) => console.log('throwComponent.vue: got event:', event, args))
  $io.emit('register-tne-app-client')
  $io.on('connect', () => $io.emit('client-id', clientStore.client.id))
  $io.on('client-hero', (hero: HERO_MESSAGE) => {
    console.log('throwComponent.vue: got client-hero', hero, clientHeroStore.getHero)
    clientHeroStore.storeHero(hero)  // set score in clientHeroStore
  })

  document.getElementById('body')?.requestFullscreen()
  // start a function that will repeat after 2 seconds
  startRotation()
  onMounted(() => {
    startRotation()
  })
})

onUnmounted(() => {
  document.removeEventListener('touchstart', preventPinch)
  document.removeEventListener('touchend', preventDoubleTap)
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
  touch-action: pan-x pan-y;
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
  touch-action: manipulation;
  user-select: none;
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
