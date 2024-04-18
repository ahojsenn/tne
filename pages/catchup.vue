<template lang="pug">
div.catchup 
  div(v-for="(item, key, index) in store.thrownItems" v-bind:key="item.rnd")
    cake(v-if="item.x === 'cake'") 
    tomato(v-if="item.x ==='tomato'")
    shoe(v-if="item.x ==='shoe'" )
    egg(v-if="item.x ==='egg'" )
    frog(v-if="item.x ==='frog'" )
    star(v-if="item.x ==='star'")
</template>

<script setup lang="ts">
import type { ThrownItem } from '~/types/thrownItem'
import { useThrownItemsStore } from '~/store'
import type { MESSAGE, THROW_MESSAGE } from '~/types/message';
const { $io } = useNuxtApp()
const store = useThrownItemsStore()

onMounted( () => {
  $io.on('catchup-channel', (m: THROW_MESSAGE) => {
    //console.log('got new message', m)
    const item: ThrownItem = {
        x: m.text,
        rnd: Math.floor(Math.random() * 100000),
      }
    store.throw(item)
  })
  document.body.classList.remove('bodyClassNoGame')
  document.body.classList.add('transparentMode')
})
document.body.classList.remove('trasnparentMode')
  
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