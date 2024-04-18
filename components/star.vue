<template lang="pug">
div
  <component is="style">
      | .{{thr}} {  z-index: 100; position: absolute;  animation-name: throwthing{{randomNr}}; animation-duration: 0.9s;   }
      | .{{spl}}  { position: absolute; scale: {{scale}}; left: {{ left }}%; animation-duration: 0.1s;  top: {{top}}%; transform: rotate({{ circulation }}deg) }
      | @keyframes throwthing{{randomNr}} { 
      |   0% { left: {{left}}%; top: {{top}}%; } 
      |   100% { transform: rotate({{ circulation }}deg) scale({{scale}}); left: {{left}}%; top: {{top}}% }
      | }
      | @keyframes fly{{randomNr}} { 
      |   from {left: {{left}}%; top: {{top}}%; } 
      |   to { left: {{endleft}}%; top: {{endtop}}%; }
      | }
  </component>
  div
    img(:class="thr" v-if="thrown" src="/img/star_throw.png" alt="star")  
    img(:class="spl" v-if="splashed" src="/img/star_splash.png" alt="star")
    img(:class="spl" v-if="splashed_1" src="/img/star_splash_1.png" alt="star")
    img(:class="spl" v-if="splashed_2" src="/img/star_splash_2.png" alt="star")
    img(:class="spl" v-if="splashed_3" src="/img/star_splash_3.png" alt="star")
    img(:class="spl" v-if="splashed_4" src="/img/star_splash_4.png" alt="star")
    img(:class="spl" v-if="splashed_5" src="/img/star_splash_5.png" alt="star")
</template>

<script setup lang="ts">
import globalMixin from '~/globalMixin' 

let thrown = true,
      splashed = ref(false),
      splashed_1 = ref(false),
      splashed_2 = ref(false),
      splashed_3 = ref(false),
      splashed_4 = ref(false),
      splashed_5 = ref(false),
      scale = globalMixin.methods.$getRandomInt(30, 330) / 100,
      circulation = ref(globalMixin.methods.$getRandomInt(-30, 30) / 10),
      top = ref(globalMixin.methods.$getRandomInt(0, 100)),
      left = ref(globalMixin.methods.$getRandomInt(-30, 100)),
      thr = 'thr-' + globalMixin.methods.$getRandomInt(0, 1000000),
      spl = 'spl-' + globalMixin.methods.$getRandomInt(0, 1000000),
      endleft = ref(0),
      endtop = ref(0),
      randomNr = globalMixin.methods.$getRandomInt(0, 100000)

onMounted( () => {
  top.value = globalMixin.methods.$getRandomInt(0, 100)
  left.value = globalMixin.methods.$getRandomInt(0, 100)
  circulation.value = globalMixin.methods.$getRandomInt(-180, 180) + 140
  endleft.value = left.value + Math.cos(((circulation.value - 140) * 3.14) / 180) * 100
  endtop.value = top.value + Math.sin(((circulation.value - 140) * 3.14) / 180) * 100
  globalMixin.methods.$delay(700).then(() => {
    thrown = false
    splashed_1.value = true
    globalMixin.methods.$delay(100).then(() => {
      splashed_1.value = false
      splashed_2.value = true
      globalMixin.methods.$delay(100).then(() => {
        splashed_2.value = false
        splashed_3.value = true
        globalMixin.methods.$delay(100).then(() => {
          splashed_3.value = false
          splashed_4.value = true
          globalMixin.methods.$delay(100).then(() => {
            splashed_4.value = false
            splashed_5.value = true
          })
        })
      })
    })
  })
})
</script>
