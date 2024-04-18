<template lang="pug">
div.ibm
  qrcode  

  div.leftTop(v-if="!$device.isMobile")
  iframe(style="position: absolute; height: 100%; border: none" 
        allowtransparency="true" src="catchup" 
        width='100%' scrolling="no")

  throwComponent
</template>

<style scoped>
iframe {
  border: 0;
}

.leftTop {
  pointer-events: none;
  position: absolute;
  top: 0;
  left: 0;
  height: 100vh;
  width: 100%;
  z-index: 99;
}
</style>
