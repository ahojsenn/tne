<template lang="pug">
div Tomato Trolls: {{ store.getTrollsLastGame.length }} 
  div(v-for="hero,i in store.getTrollsLastGame") 
    span(v-if='count(hero.throws)>0') 
      span {{i+1}}... {{ hero.hero }} missed {{ countMisses(hero.throws) }} tomatoes
</template>

<script setup lang="ts">
import { type HERO_MESSAGE, type THROW } from '~/types/message'
import { useClientStore } from '~/store/useClientStore';
const store = ref(useClientStore())
const count = (throws: THROW[]) => throws.reduce((acc, cv) => cv.text === 'tomato' ? acc + 1 : acc, 0)
const countMisses = (throws: THROW[]) => throws.reduce((acc, cv) => cv.text != 'tomato' ? acc + cv.number: acc, 0)
</script>