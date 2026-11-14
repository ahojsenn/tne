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
  div.slides-controls(v-if="embed || showCounter")
    button(v-if="showCounter" @click="resetCounts" title="Zähler zurücksetzen (Taste R, wenn der Fokus nicht in den Folien liegt)") ↺
    template(v-if="embed")
      button(@click="toggleFullscreen" title="Vollbild") ⛶
      button(@click="clearSlides" title="Schließen") ✕
  //- running tally of everything thrown; pointer-events: none so clicks still reach the slides
  div.throw-counter(v-if="showCounter && visibleCounts.length" :class="`pos-${counterPos}`")
    span.throw-count(v-for="c in visibleCounts" :key="c.type")
      img(:src="`/img/${c.type}_throw.png`" :alt="c.type")
      span {{ c.n }}
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

// --- throw counter ---
// useThrownItemsStore forgets items after 5 s, so the tally lives here.
const ITEM_TYPES = ['tomato', 'egg', 'shoe', 'cake', 'frog', 'star'] as const
type ItemType = typeof ITEM_TYPES[number]
const isItemType = (x: unknown): x is ItemType =>
  typeof x === 'string' && (ITEM_TYPES as readonly string[]).includes(x)

// sessionStorage, so an accidental reload mid-talk does not zero the counts
const COUNTS_KEY = 'tne-catchup-counts'
function emptyCounts(): Record<ItemType, number> {
  return Object.fromEntries(ITEM_TYPES.map(t => [t, 0])) as Record<ItemType, number>
}
function loadCounts(): Record<ItemType, number> {
  const counts = emptyCounts()
  try {
    const stored = JSON.parse(sessionStorage.getItem(COUNTS_KEY) ?? '{}')
    for (const t of ITEM_TYPES) {
      const n = stored?.[t]
      if (Number.isInteger(n) && n > 0) counts[t] = n
    }
  } catch { /* storage blocked or garbage: start from zero */ }
  return counts
}
const counts = ref(loadCounts())
watch(counts, c => {
  try { sessionStorage.setItem(COUNTS_KEY, JSON.stringify(c)) } catch { /* storage blocked */ }
}, { deep: true })

const visibleCounts = computed(() =>
  ITEM_TYPES.filter(t => counts.value[t] > 0).map(t => ({ type: t, n: counts.value[t] })))

function resetCounts() { counts.value = emptyCounts() }

// ?counter=top-left|top-right|bottom-left|bottom-right|off, default bottom-left
// (bottom-right is where slides usually carry their QR code)
const COUNTER_POSITIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const
const counterParam = computed(() => {
  const q = route.query.counter
  return (Array.isArray(q) ? q[0] : q) ?? ''
})
const showCounter = computed(() => !embedded && counterParam.value !== 'off')
const counterPos = computed(() =>
  (COUNTER_POSITIONS as readonly string[]).includes(counterParam.value) ? counterParam.value : 'bottom-left')

// R resets — only while keyboard focus is on this page, not inside the slides iframe
function onKeydown(e: KeyboardEvent) {
  if (!showCounter.value || e.ctrlKey || e.metaKey || e.altKey) return
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
  if (e.key === 'r' || e.key === 'R') resetCounts()
}

function onCatchupEvent(m: THROW_MESSAGE) {
  console.log('catchup.vue: got catchup-event: ', m)
  const item: ThrownItem = {
      x: m?.text,
      rnd: Math.floor(Math.random() * 100000),
    }
  ti_store.throw(item)
  // the embedded overlay shows no counter, so it does not count either
  if (!embedded && isItemType(m?.text)) counts.value[m.text]++
}

onMounted( () => {
  console.log('catchup.vue: onMounted')
  $io.onAny((event, ...args) => {    console.log('catchup.vue: onAny', event, args)  })
  document.body.classList.remove('bodyClassNoGame')
  document.body.classList.add(embedded ? 'transparentMode' : 'catchupMode')
  $io.emit('register-catchup-client')

  // named handlers, removed on unmount, so revisiting the page does not count every throw twice
  $io.on('catchup-event', onCatchupEvent)
  $io.on('catchup-reset', resetCounts)
  window.addEventListener('keydown', onKeydown)

  // every 10 seconds log $io connection status
  setInterval(() => console.log('catchup.vue: $io.connected: ', $io.connected), 10000)
})

onBeforeUnmount(() => {
  $io.off('catchup-event', onCatchupEvent)
  $io.off('catchup-reset', resetCounts)
  window.removeEventListener('keydown', onKeydown)
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
/* quiet tally of thrown items, above the slides like .thrown-layer, clicks pass through */
.throw-counter {
  position: fixed;
  z-index: 10;
  pointer-events: none;
  display: flex;
  gap: 10px;
  padding: 4px 8px;
  border-radius: 6px;
  background-color: rgba(0, 0, 0, 0.35);
  color: #fff;
  font-size: 14px;
  opacity: 0.6;
}
.throw-counter.pos-top-left { top: 10px; left: 10px; }
.throw-counter.pos-top-right { top: 10px; right: 10px; }
.throw-counter.pos-bottom-left { bottom: 10px; left: 10px; }
/* sits above the controls, which own the bottom-right corner */
.throw-counter.pos-bottom-right { bottom: 56px; right: 10px; }
.throw-count {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.throw-count img {
  width: 18px;
  height: 18px;
}
</style>
