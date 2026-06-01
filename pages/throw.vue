<template lang="pug">
div.throw-page
  div.catchup-bg
    div(v-for="(item, key, index) in ti_store.thrownItems" v-bind:key="item.rnd")
      cake(v-if="item.x === 'cake'")
      tomato(v-if="item.x === 'tomato'")
      shoe(v-if="item.x === 'shoe'")
      egg(v-if="item.x === 'egg'")
      frog(v-if="item.x === 'frog'")
      star(v-if="item.x === 'star'")
  throwComponent
  quizOverlay
</template>

<script setup lang="ts">
import { useThrownItemsStore } from '~/store/useThrownItemsStore'

const ti_store = useThrownItemsStore()
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
</style>
