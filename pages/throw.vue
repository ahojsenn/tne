<template lang="pug">
div.throw-page(:class="{ 'has-banner': !!talk }")
  div.catchup-bg
    div(v-for="(item, key, index) in ti_store.thrownItems" v-bind:key="item.rnd")
      cake(v-if="item.x === 'cake'")
      tomato(v-if="item.x === 'tomato'")
      shoe(v-if="item.x === 'shoe'")
      egg(v-if="item.x === 'egg'")
      frog(v-if="item.x === 'frog'")
      star(v-if="item.x === 'star'")
  div.talk-banner(v-if="talk")
    span.talk-label Du wirfst auf
    span.talk-hero {{ talk.heroName }}
  throwComponent
  quizOverlay
</template>

<script setup lang="ts">
import { useThrownItemsStore } from '~/store/useThrownItemsStore'
import type { ACTIVE_TALK } from '~/types/talk'

const ti_store = useThrownItemsStore()

// Server state, pushed to every client — see server/utils/talkStore.ts. The
// get on mount is what makes joining mid-talk work without a reload.
//
// Held here rather than inside the banner because the page needs it for
// layout: .thrower is absolutely positioned at top 0, so the banner cannot
// push it down and the page has to move it out of the way instead.
const { $io } = useNuxtApp()
const talk = ref<ACTIVE_TALK | null>(null)

onMounted(() => {
  $io.on('active-talk', (t: ACTIVE_TALK | null) => { talk.value = t })
  $io.emit('get-active-talk')
})

onUnmounted(() => {
  $io.off('active-talk')
})
</script>

<style scoped>
.throw-page {
  position: relative;
  width: 100%;
  height: 100%;
}
.catchup-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.35;
  pointer-events: none;
  z-index: 1;
}

.talk-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 90; /* above .thrower (80), below the nav toggle (9999) */
  height: 34px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 52px 0 12px; /* keep clear of the nav toggle at the right */
  background: rgba(0, 0, 0, 0.85);
  border-bottom: 1px solid greenyellow;
  font-family: 'Courier New', Courier, monospace;
}

.talk-label {
  color: #999;
  font-size: 0.8em;
  white-space: nowrap;
}

.talk-hero {
  color: greenyellow;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* .thrower is position:absolute at top 0, so it has to be moved rather than
   pushed. Only while a talk is running — without a banner nothing shifts. */
.has-banner :deep(.thrower) {
  top: 34px;
  height: calc(100% - 34px);
}
</style>
