<template lang="pug">
div
  <component is="style">
      | .{{thr}}  { position: absolute;  animation-name: throwthing{{rnd}}; animation-duration: 0.9s;   }
      | .{{spl}}  { position: absolute; scale: 0.5;left: {{ left }}; top: {{top}}; transform: rotate({{ circulation }}) }
      | @keyframes throwthing{{rnd}} { 
      |   0% {left: {{left}};top: {{top}}; } 
      |   100% { transform: rotate({{ circulation }}) scale(0.2); left: {{left}}; top: {{top}} }
      | }
  </component>
  img(:class="thr" v-if="thrown" src="/img/egg_throw.png")
  img(:class="spl" v-if="splashed" src="/img/egg_splash.png")
</template>

<script setup lang="ts">
import globalMixin from '~/globalMixin' 
let thrown = true,
    splashed = ref(false),
    circulation = (Math.random() < 0.5 ? -1 : 1) * globalMixin.methods.$getRandomInt(400, 900) + 'deg',
    top = globalMixin.methods.$getRandomInt(10, 90) + '%',
    left = globalMixin.methods.$getRandomInt(10, 90) + '%',
    rnd = globalMixin.methods.$getRandomInt(0, 100000),
    thr = 'thr' + globalMixin.methods.$getRandomInt(0, 100000),
    spl = 'spl' + globalMixin.methods.$getRandomInt(0, 100000)

onMounted(() => {
  globalMixin.methods.$delay(600).then(() => {
    thrown = false
    splashed.value = true
  })
})
</script>
