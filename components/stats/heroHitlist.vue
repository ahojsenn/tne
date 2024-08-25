<template lang="pug">
div Hero Hitlist: {{ store.heroes.length }}
  div(v-for="hero,i in store.heroes.sort((a,b) => score(b)-score(a))") {{i+1}}... {{ hero.heroName }} threw {{ throws(hero) }} times
    span &nbsp; score: {{ score(hero) }}
</template>

<script setup lang="ts">
import { type HERO_MESSAGE } from '~/types/message'
import { useClientStore } from '~/store/useClientStore';
const props = useAttrs()
const store = useClientStore()
const throws = (h: HERO_MESSAGE) => h.h_m_s.hits + h.h_m_s.misses
const score = (h: HERO_MESSAGE ) => h.h_m_s.score
</script>

