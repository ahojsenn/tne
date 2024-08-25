<template lang="pug">
div Hero Hitlist: {{ clientStore.last_game_heroes.length }}
  div(v-for="hero,i in clientStore.last_game_heroes.sort((a,b) => score(b)-score(a))") 
    span(v-if='count(hero.throws)>0') 
      span {{i+1}}... {{ hero.hero }} threw {{ count(hero.throws) }} times
      span &nbsp; score: {{ score(hero) }}
</template>

<script setup lang="ts">
import { type THROW, type HERO_MESSAGE } from '~/types/message'
import { useClientStore } from '~/store/useClientStore';
const props = useAttrs()
const clientStore = useClientStore()
const count = (throws: THROW[]) => throws.reduce((acc, cv) => acc + cv.number, 0)
const missedTomatoes = (throws: THROW[]) => throws.reduce((acc, cv) => cv.text != 'tomato' ? acc + cv.number : acc, 0)
const score = (h: HERO_MESSAGE ) => count(h.throws) - missedTomatoes(h.throws)*clientStore.getGameSettings.difficulty
</script>

