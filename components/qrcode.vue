<template lang="pug">
div  
  div.qrcode 
    qrcode(
      :value="value" 
      :width="size" 
      :height="size"  
      :margin="20"
      :qr-options="{errorCorrectionLevel: 'Q'}"
      :backgroundOptions="{ color: 'rgba(0;255;255;0.5)' }"
      :dotsOptions="{type: 'square',color: '#ffffff'}"
      :corners-dot-options="{type: undefined,color: '#ffffff'}"
      :cornersSquareOptions="{ type: 'square', color: '#ffffff' }"
   
      )
    div.text {{value}}
</template>

<script setup lang="ts">
// SyntaxError: The requested module 'qrcode-vue3' does not provide an export named 'default'

import QRCodeVue3 from "qrcode-vue3"  
const qrcode = QRCodeVue3

const value = useRequestURL()+'throw'
const size = 256
</script>

<style scoped>
.qrcode {
  position: absolute;
  right: 0;
  bottom: 0;
  z-index: 199;
  font-size: 0.5em;
}
.text {
  color: darkgrey;
}
</style>
