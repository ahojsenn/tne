<template lang="pug">
//- Everyone's throws, faded into the background (like the throw page, but for
//- pages where nobody throws locally). Page content must sit above z-index 0.
div.thrown-background
  div(v-for="item in ti_store.thrownItems" :key="item.rnd")
    cake(v-if="item.x === 'cake'")
    tomato(v-if="item.x === 'tomato'")
    shoe(v-if="item.x === 'shoe'")
    egg(v-if="item.x === 'egg'")
    frog(v-if="item.x === 'frog'")
    star(v-if="item.x === 'star'")
</template>

<script setup lang="ts">
import type { THROW_MESSAGE } from '~/types/message'
import { useThrownItemsStore } from '~/store/useThrownItemsStore'

const ti_store = useThrownItemsStore()
const { $io } = useNuxtApp()

const onThrow = (m: THROW_MESSAGE) => {
  ti_store.throw({ x: m.text, rnd: Math.floor(Math.random() * 100000) })
}

onMounted(() => {
  $io.emit('register-catchup-client')
  $io.on('catchup-event', onThrow)
})
onUnmounted(() => $io.off('catchup-event', onThrow))
</script>

<style scoped>
.thrown-background {
  position: fixed;
  inset: 0;
  opacity: 0.35;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}
</style>
