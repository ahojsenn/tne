<template lang="pug">
div Tomato Trolls: {{ store.getTrolls.length }} 
  div(v-for="hero,i in store.getTrolls") 
    span {{i+1}}... {{ hero.hero }} missed {{ countMisses(hero.throws) }} tomatoes
</template>

<script setup lang="ts">
import { type HERO_MESSAGE, type THROWS } from '~/types/message'
import { useClientStore } from '~/store'
const store = ref(useClientStore())
const countMisses = (throws: THROWS[]) => throws.reduce((acc, cv) => cv.text != 'tomato' ? acc + cv.number: acc, 0)
</script>