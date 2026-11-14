<template lang="pug">
div  
  div.qrcode(:class="{ fullscreen }")
    qrcode(
      :key="size"
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
import QRCodeVue3 from "qrcode-vue3"  
const qrcode = QRCodeVue3

const props = withDefaults(
  defineProps<{ path?: string; size?: number; fullscreen?: boolean }>(),
  { path: 'throw', size: 256, fullscreen: false },
)

const baseUrl = useRequestURL()
const value = computed(() => `${baseUrl.origin}/${props.path}`)
const size = computed(() => props.size)
</script>

<style scoped>
.qrcode {
  position: absolute;
  right: 0;
  bottom: 0;
  z-index: 199;
  font-size: 0.5em;
}
.qrcode.fullscreen {
  position: static;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 1em;
}
.text {
  color: darkgrey;
}
</style>
