<template lang="pug">
div.ibm 
  <component is="style">
      | .{{thr}} {  z-index: 100; position: absolute;  animation-name: throwthing{{randomNr}}; animation-duration: 0.7s;   }
      | .{{spl}}  { position: absolute; scale: 0.9;left: {{ left }}; top: {{top}}; transform: rotate({{ circulation }}) }
      | @keyframes throwthing{{randomNr}} { 
      |   0% {left: {{left}};top: {{top}}; } 
      |   100% { transform: rotate({{ circulation }}) scale(1.0); left: {{left}}; top: {{top}} }
      | } 
  </component>
  div
    img(:class="thr" v-if="thrown" src="/img/tomato_throw.png")
    img(:class="spl" v-if="splashed" src="/img/tomato_splash.png")
</template>

<script setup lang="ts">
import globalMixin from '~/globalMixin' 
const getRandomInt = globalMixin.methods.$getRandomInt

let thrown = ref(true), 
  splashed=ref(false),
  startcirculation='0deg',
  circulation=(Math.random() < 0.5 ? -1 : 1) * getRandomInt(100, 400) + 'deg',
  top= getRandomInt(-25, innerHeight - 100) + 'px',
  left= getRandomInt(-100, innerWidth - 100) + 'px',
  thr= 'thr-' + getRandomInt(0, 1000000),
  spl= 'spl-' + getRandomInt(0, 1000000),
  randomNr= getRandomInt(0, 100000)

onMounted( () => {
  globalMixin.methods.$delay(500).then(
    () => {thrown.value = false;  splashed.value = true}
  )
}) 

</script>


