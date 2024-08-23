<template lang="pug">
div.catchup 
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
</style>~/thrownItem