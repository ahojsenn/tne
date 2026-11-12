<template lang="pug">
div.catchup(:class="{ embedded }")
  iframe.slides-frame(
    v-if="embed"
    :class="{ full: !embed.isSlides }"
    :src="embed.url"
    frameborder="0"
    allow="fullscreen"
    allowfullscreen
  )
  form.slides-form(v-else-if="!embedded" @submit.prevent="showSlides")
    input(v-model="slidesInput" placeholder="Google Slides oder beliebige https-URL" autofocus)
    button(type="submit") Anzeigen
  div.slides-controls(v-if="embed")
    button(@click="toggleFullscreen" title="Vollbild") ⛶
    button(@click="clearSlides" title="Schließen") ✕
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
// the home page embeds this page as a transparent overlay; only the standalone page gets the slides input and black background
const embedded = window.self !== window.top

// accepts a full Google Slides URL (edit, view or published "/d/e/..." link) or a bare presentation ID
function toSlidesEmbedUrl(input: string): string | null {
  const s = input.trim()
  if (!s) return null
  const published = s.match(/\/presentation\/d\/e\/([\w-]+)/)
  if (published) return `https://docs.google.com/presentation/d/e/${published[1]}/embed?start=false&loop=false&delayms=3000&rm=minimal`
  const regular = s.match(/\/presentation\/d\/([\w-]+)/)
  const id = regular ? regular[1] : (/^[\w-]+$/.test(s) ? s : null)
  return id ? `https://docs.google.com/presentation/d/${id}/embed?start=false&loop=false&delayms=3000&rm=minimal` : null
}

// Google Slides get the 16:9 embed; any other https URL is embedded as-is, filling the viewport
function toEmbed(input: string): { url: string, isSlides: boolean } | null {
  const s = input.trim()
  const isGoogleSlides = /docs\.google\.com\/presentation\//.test(s) || /^[\w-]+$/.test(s)
  if (isGoogleSlides) {
    const url = toSlidesEmbedUrl(s)
    return url ? { url, isSlides: true } : null
  }
  try {
    const u = new URL(s)
    return u.protocol === 'https:' ? { url: u.href, isSlides: false } : null
  } catch {
    return null
  }
}

// ?show= is the new name; ?slides= keeps old links working
const showParam = computed(() => {
  const q = route.query.show ?? route.query.slides
  return (Array.isArray(q) ? q[0] : q) ?? ''
})
const embed = computed(() => toEmbed(showParam.value))
const slidesInput = ref('')

function showSlides() {
  if (!toEmbed(slidesInput.value)) return alert('Bitte eine Google-Slides-URL/-ID oder eine https://-URL eingeben.')
  const { slides, ...rest } = route.query
  router.replace({ query: { ...rest, show: slidesInput.value.trim() } })
}

function clearSlides() {
  const { slides, show, ...rest } = route.query
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
  document.body.classList.add(embedded ? 'transparentMode' : 'catchupMode')
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
.catchupMode {
  background-color: #000 !important;
  color: white;
  font-family: 'Courier New', Courier, monospace;
}
.catchup {
  color: greenyellow;
  position: fixed;
  inset: 0;
  background-color: #000;
}
.catchup.embedded {
  background-color: transparent;
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
/* arbitrary pages have no fixed aspect ratio: fill the viewport */
.slides-frame.full {
  width: 100vw;
  height: 100vh;
  background-color: #fff;
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
  color: greenyellow;
  background-color: #111;
  border: 1px solid greenyellow;
}
.slides-form input::placeholder {
  color: greenyellow;
  opacity: 0.5;
}
.slides-form button, .slides-controls button {
  padding: 8px 12px;
  cursor: pointer;
  font-family: inherit;
  color: greenyellow;
  background-color: #111;
  border: 1px solid greenyellow;
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
