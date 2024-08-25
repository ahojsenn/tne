<template lang="pug">
div Tomato Trolls: {{ store.getTrolls.length }} 
  div(v-for="hero,i in store.getTrolls") 
    span {{i+1}}... {{ hero.heroName }} missed {{ countMisses(hero.throws) }} tomatoes
</template>

<script setup lang="ts">
import { type HERO_MESSAGE, type THROW } from '~/types/message'
import { useClientStore } from '~/store/useClientStore'
const store = ref(useClientStore())
const countMisses = (throws: THROW[]) => throws.reduce((acc, cv) => cv.text != 'tomato' ? acc + cv.number: acc, 0)
</script>