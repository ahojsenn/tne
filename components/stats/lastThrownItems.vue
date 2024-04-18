<template lang="pug">
div
  div thrown stuff: {{m.length}} with a tomato rate of {{(100*count('tomato')/m.length).toFixed(1) }}%
  div tomatoes: {{ count('tomato') }}
  div eggs: {{ count('egg')}}
  div shoes: {{ count('shoe') }}
  div frogs: {{ count('frog') }}
  div cakes: {{ count('cake') }}
  div stars: {{ count('star') }}
</template>

<script setup lang="ts">
import { type THROW_MESSAGE } from '~/types/message'

const { $io } = useNuxtApp()
const socket = $io
const m = ref( [] as Array<THROW_MESSAGE>)

onMounted(() => {
  socket
    .on('last-thrown-items', (msgs: THROW_MESSAGE[]) => {
      //console.log('got response...', count('tomato'), count('egg'))
      m.value = msgs
    })
  // every three seconds emit a request for the last 10000 messages
  setInterval(() => socket.emit('last-messages', 10000, () => {}), 3000)
})
const count = (thing: string) => m.value.reduce((acc, cv) => cv.text === thing ? acc + 1 : acc, 0)
</script>