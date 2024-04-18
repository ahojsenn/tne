<template lang=pug>
div 
  <component is="style">
      | .{{thr}}    { position: absolute; animation-name: throwthing{{rnd}}; animation-duration: 0.9s;   }
      | .{{spl}}    { position: absolute; scale: 0.5;left: {{ left }}%; animation-duration: 0.3s;  top: {{top}}%; transform: rotate({{ circulation }}deg) }
      | .{{spl2}}  { position: absolute; animation-name: fly{{rnd}}; scale: 0.5;left: {{ left }}%;  animation-duration: 1.0s;  top: {{top}}%; transform: rotate({{ circulation }}deg) }
      | @keyframes throwthing{{rnd}} { 
      | 0% { left: {{left}}%;top: {{top}}%; } 
      | 100% { transform: rotate({{ circulation }}deg) scale(0.5); left: {{left}}%; top: {{top}}% }}
      | @keyframes fly{{rnd}} { 
      |   from {left: {{left}}%;top: {{top}}%; } 
      |   to { left: {{endleft}}%; top: {{endtop}}%; } 
      | }
  </component>
  img(:class="thr" v-if="thrown" src="/img/frog_throw.png")
  img(:class="spl" v-if="splashed" src="/img/frog_splash.png")
  img(:class="spl2" v-if="splashed_1" src="/img/frog_splash.png")
</template>

<script setup lang=ts>
import globalMixin from '~/globalMixin' 
const offsetrotation = 140
let rnd =  globalMixin.methods.$getRandomInt(0,1000000),
    thrown = true, 
    splashed = ref(false),
    splashed_1 = ref(false),
    circulation = globalMixin.methods.$getRandomInt(-180,180) + offsetrotation,
    top =  globalMixin.methods.$getRandomInt(0,100),
    left = globalMixin.methods.$getRandomInt(0,100),
    thr = "thr-"+globalMixin.methods.$getRandomInt(0,1000000),
    spl = "spl-"+globalMixin.methods.$getRandomInt(0,1000000),
    spl2 =  "spl-2-"+globalMixin.methods.$getRandomInt(0,1000000),
    endleft: 0,
    endtop: 0

onMounted(() => {
  endleft = left+Math.cos((circulation-offsetrotation)*(3.14)/180)*200
  endtop = top+Math.sin((circulation-offsetrotation)*3.14/180)*200
  globalMixin.methods.$delay(900).then(() => {
    thrown = false
    splashed.value = true
    globalMixin.methods.$delay(500).then( () => {
      splashed.value = false
      splashed_1.value = true
      globalMixin.methods.$delay(800).then( () => {
        splashed_1.value = false
      })
    })
  })
})

</script>