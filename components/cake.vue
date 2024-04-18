<template lang="pug">
div
  <component is="style">
      | .{{thr}}  { position: absolute;  animation-name: throwthing{{rnd}}; animation-duration: 1.6s; animation-timing-function: ease-in;  }
      | .{{spl}}   { position: absolute;  left: {{lf2}}; top: {{top}}; transform: rotate({{rot}}) scale({{scale}})}
      | @keyframes throwthing{{rnd}} { 
      |   0%   { left: {{lft}}; top: {{top}}; } 
      |   100% { left: {{lf2}}; top: {{top}}; transform: rotate({{rot}}) scale({{scale}}); }
      | }
  </component>
  img(v-if="splashed" :class="spl" src="/img/cake_splash.png")
  img(v-else :class="thr" src="/img/cake_throw.png")
</template>

<script setup lang="ts">
import globalMixin from '~/globalMixin' 
let lft = globalMixin.methods.$getRandomInt(0, 100) + '%',
    lf2 = globalMixin.methods.$getRandomInt(0, 100) + '%',
    top = globalMixin.methods.$getRandomInt(0, 100) + '%',
    rot = (Math.random() < 0.5 ? -1 : 1) * globalMixin.methods.$getRandomInt(400, 900) + 'deg',
    rnd = globalMixin.methods.$getRandomInt(0, 1000000),
    splashed = ref(false),
    thr = 'thr' + globalMixin.methods.$getRandomInt(0, 1000000),
    spl = 'spl' + globalMixin.methods.$getRandomInt(0, 1000000),
    scale = globalMixin.methods.$getRandomInt(20, 190) / 100

onMounted(() => {
  setTimeout(() => {
    splashed.value = true
  }, 1600)
})

</script>
