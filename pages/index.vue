<template lang="pug">
div.ibm
  qrcode

  div.leftTop(v-if="!$device.isMobile")
  iframe(style="position: absolute; height: 100%; border: none; z-index: 1"
        allowtransparency="true" src="catchup"
        width='100%' scrolling="no")

  throwComponent
</template>

<script setup lang="ts">
</script>

<style scoped>
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

<script setup lang="ts">
const drawer = ref(false)

const navItems = [
  { title: 'Home', icon: 'mdi-baseball-bat', href: '/' },
  { title: 'Throw', icon: 'mdi-baseball-bat', href: '/throw' },
  { title: 'Game Console', icon: 'mdi-monitor-dashboard', href: '/gameconsole' },
  { title: 'Catchup', icon: 'mdi-television-play', href: '/catchup' },
  { title: 'Kommitment', icon: 'mdi-handshake', href: '/kommitment' },
]
</script>

<style scoped>
.leftTop {
  pointer-events: none;
  position: absolute;
  top: 0;
  left: 0;
  height: 100vh;
  width: 100%;
  z-index: 99;
}

.nav-toggle {
  background: black;
  color: greenyellow;
  border: 1px solid greenyellow;
  border-radius: 4px;
  font-size: 1.2em;
  padding: 4px 10px;
  cursor: pointer;
}

.nav-drawer {
  position: absolute;
  top: 36px;
  left: 0;
  background: black;
  border: 1px solid greenyellow;
  border-radius: 4px;
  min-width: 160px;
  padding: 6px 0;
}

.nav-item {
  display: block;
  color: greenyellow;
  text-decoration: none;
  padding: 8px 16px;
  font-family: 'Courier New', Courier, monospace;
}

.nav-item:hover {
  background: rgba(173, 255, 47, 0.15);
}
</style>
