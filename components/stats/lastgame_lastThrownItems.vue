<template lang="pug">
div
  div thrown stuff: {{totalThrows}} with a tomato rate of {{(100*count('tomato')/totalThrows).toFixed(1) }}%
  div tomatoes: {{ count('tomato') }}
  div eggs: {{ count('egg')}}
  div shoes: {{ count('shoe') }}
  div frogs: {{ count('frog') }}
  div cakes: {{ count('cake') }}
  div stars: {{ count('star') }}
</template>

<script setup lang="ts">
import { type THROW } from '~/types/message'
import { useClientStore } from '~/store/useClientStore';
const store = ref(useClientStore())
const m = store.value.last_game_heroes
const throws = m.reduce((acc, h) => [...acc].concat(h.throws), [] as THROW[])

const count = (thing: string) => throws.reduce((acc, cv) => cv.text === thing ? acc + cv.number : acc, 0)
const totalThrows = throws.reduce((acc, cv) => acc + cv.number, 0)
</script>