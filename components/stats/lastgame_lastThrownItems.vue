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
import { type THROW_MESSAGE, type THROWS } from '~/types/message'
import { useClientStore } from '~/store'
const store = ref(useClientStore())
const m = store.value.last_game_heroes
const throws = m.reduce((acc, h) => acc = [...acc].concat(h.throws), [] as THROWS[])

const count = (thing: string) => throws.reduce((acc , cv) => cv.text === thing ? acc + 1 : acc, 0)
const count_repair = (thing: string) => throws.reduce((acc , cv) => cv.text === thing ? acc + 1 : acc, 0)
</script>