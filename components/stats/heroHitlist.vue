<template lang="pug">
div Hero Hitlist: {{ store.heroes.length }}
  div(v-for="hero,i in store.heroes.sort((a,b) => score(b)-score(a))") {{i+1}}... {{ hero.hero }} threw {{ count(hero.throws) }} times
    span &nbsp; score: {{ score(hero) }}
</template>

<script setup lang="ts">
import { type THROWS, type HERO_MESSAGE } from '~/types/message'
import { useClientStore } from '~/store/useClientStore';
const props = useAttrs()
const store = useClientStore()
const count = (throws: THROWS[]) => throws.reduce((acc, cv) => acc + cv.number, 0)
const missedTomatoes = (throws: THROWS[]) => throws.reduce((acc, cv) => cv.text != 'tomato' ? acc + cv.number : acc, 0)
const score = (h: HERO_MESSAGE ) => count(h.throws) - missedTomatoes(h.throws)*store.getGameSettings.difficulty
</script>

