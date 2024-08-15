<template lang="pug">
div
  div.background tests
    <img class="image-fit" src='/public/img/backgrounds/JMainusch_BStemmildt_AHamann_Speaker.jpg' alt="JmainuschStemmildtHammen"/>
  qrcode
  div.catchup(v-for="(item, key, index) in store.thrownItems" v-bind:key="item.rnd")
    cake( v-if="item.x === 'cake'") 
    tomato( v-if="item.x ==='tomato'" )
    shoe( v-if="item.x ==='shoe'" )
    egg( v-if="item.x ==='egg'" )
    frog( v-if="item.x ==='frog'" )
    star( v-if="item.x ==='star'")
  </template>


<script setup lang="ts">
import { useThrownItemsStore } from '~/store/useThrownItemsStore';
const { $io } = useNuxtApp()
const store = useThrownItemsStore()

console.log("accounts: kstore loaded...") 

</script>

<style scoped>
.catchup {
  height: 100%;
  width: 100%;
  z-index: 79;
}
.background {
  position: absolute;
  background-color: black;
  height: 100%;
  width: 100%;
  vertical-align: middle;
}
.image-fit {
  background: #3a6f9a;
  vertical-align: middle;
  width: 100%;
}
</style>
~/thrownItem