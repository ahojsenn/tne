<template lang="pug">
div.qrcode-page
  thrownBackground
  qrcode(v-if="size" :path="path" :size="size" fullscreen)
</template>

<script setup lang="ts">
// Full-page QR code. Target path via query, e.g. /qrcode?path=answer (default: throw)
const route = useRoute()
const path = computed(() => String(route.query.path ?? 'throw').replace(/^\/+/, ''))

const size = ref(0)
const updateSize = () => {
  size.value = Math.floor(Math.min(window.innerWidth, window.innerHeight - 60) * 0.9)
}
onMounted(() => {
  updateSize()
  window.addEventListener('resize', updateSize)
})
onBeforeUnmount(() => window.removeEventListener('resize', updateSize))
</script>

<style scoped>
.qrcode-page {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.qrcode-page > :not(.thrown-background) {
  position: relative;
  z-index: 1;
}
</style>
