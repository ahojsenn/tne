<template lang="pug">
div.catchup(:class="{ 'with-slides': slidesEmbedUrl }")
  iframe.slides-frame(
    v-if="slidesEmbedUrl"
    :src="slidesEmbedUrl"
    frameborder="0"
    allow="fullscreen"
    allowfullscreen
  )
  form.slides-form(v-else @submit.prevent="showSlides")
    input(v-model="slidesInput" placeholder="Google Slides URL oder ID" autofocus)
    button(type="submit") Präsentation zeigen
  div.slides-controls(v-if="slidesEmbedUrl")
    button(@click="toggleFullscreen" title="Vollbild") ⛶
    button(@click="clearSlides" title="Präsentation schließen") ✕
  div.thrown-layer
    div(v-for="(item, key, index) in ti_store.thrownItems" v-bind:key="item.rnd")
      cake(v-if="item.x === 'cake'") 
      tomato(v-if="item.x ==='tomato'")
      shoe(v-if="item.x ==='shoe'" )
      egg(v-if="item.x ==='egg'" )
      frog(v-if="item.x ==='frog'" )
      star(v-if="item.x ==='star'")
</template>

<script setup lang="ts">
import type { THROW_MESSAGE } from '~/types/message'
import type { ThrownItem } from '~/types/thrownItem'
import { useThrownItemsStore } from '~/store/useThrownItemsStore'
const ti_store = useThrownItemsStore()
const { $io } = useNuxtApp()
const route = useRoute()
const router = useRouter()

// accepts a full Google Slides URL (edit, view or published "/d/e/..." link) or a bare presentation ID
function toSlidesEmbedUrl(input: string): string | null {
  const s = input.trim()
  if (!s) return null
  const published = s.match(/\/presentation\/d\/e\/([\w-]+)/)
  if (published) return `https://docs.google.com/presentation/d/e/${published[1]}/embed?start=false&loop=false&delayms=3000`
  const regular = s.match(/\/presentation\/d\/([\w-]+)/)
  const id = regular ? regular[1] : (/^[\w-]+$/.test(s) ? s : null)
  return id ? `https://docs.google.com/presentation/d/${id}/embed?start=false&loop=false&delayms=3000` : null
}

const slidesParam = computed(() => {
  const q = route.query.slides
  return (Array.isArray(q) ? q[0] : q) ?? ''
})
const slidesEmbedUrl = computed(() => toSlidesEmbedUrl(slidesParam.value))
const slidesInput = ref('')

function showSlides() {
  if (!toSlidesEmbedUrl(slidesInput.value)) return alert('Das sieht nicht nach einer Google-Slides-URL oder -ID aus.')
  router.replace({ query: { ...route.query, slides: slidesInput.value.trim() } })
}

function clearSlides() {
  const { slides, ...rest } = route.query
  router.replace({ query: rest })
}

// fullscreen the whole page, so thrown items stay on top of the slides
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen()
  else document.documentElement.requestFullscreen()
}

onMounted( () => {
  console.log('catchup.vue: onMounted')
  $io.onAny((event, ...args) => {    console.log('catchup.vue: onAny', event, args)  })
  document.body.classList.remove('bodyClassNoGame')
  document.body.classList.add('transparentMode')
  $io.emit('register-catchup-client')

  $io.on('catchup-event', (m: THROW_MESSAGE) => {
    console.log('app.vue: got catchup-event: ', m)
    const item: ThrownItem = {
        x: m.text,
        rnd: Math.floor(Math.random() * 100000),
      }
    ti_store.throw(item)
  })

  // every 10 seconds log $io connection status
  setInterval(() => console.log('catchup.vue: $io.connected: ', $io.connected), 10000)
})
</script>

<style>
.transparentMode {
  background-color: rgba(255, 0, 0, 0) !important;
  color: white;
  font-family: 'Courier New', Courier, monospace;
}
.catchup {
  color: greenyellow;
  height: 100%;
  width: 100%;
}
/* dark letterbox behind the slides */
.catchup.with-slides {
  position: fixed;
  inset: 0;
  background-color: #000;
}
/* keep the iframe at 16:9 so Google doesn't add its own light letterbox */
.slides-frame {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(100vw, calc(100vh * 16 / 9));
  height: min(100vh, calc(100vw * 9 / 16));
  border: 0;
  z-index: 0;
}
/* thrown items fly above the slides but let clicks through to the iframe */
.thrown-layer {
  position: fixed;
  inset: 0;
  z-index: 10;
  pointer-events: none;
  overflow: hidden;
}
.slides-form {
  position: fixed;
  top: 40%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  gap: 8px;
  width: min(600px, 90vw);
  z-index: 20;
}
.slides-form input {
  flex: 1;
  padding: 8px;
  font-family: inherit;
}
.slides-form button, .slides-controls button {
  padding: 8px 12px;
  cursor: pointer;
  font-family: inherit;
}
.slides-controls {
  position: fixed;
  bottom: 10px;
  right: 10px;
  display: flex;
  gap: 6px;
  z-index: 20;
  opacity: 0.3;
}
.slides-controls:hover {
  opacity: 1;
}
</style>
