<template lang="pug">
//- The star is the "super feedback" item: it flies in spinning, lands upright
//- with a golden glow, bursts into fireworks, then rests and pulses before
//- fading out. Everything is done within 4.5 s — the store drops the item at 5 s.
//- Only transform/opacity are animated; the anchor (left/top) never moves.
div(:class="c.wrap")
  <component is="style">
      | .{{c.wrap}} { position: absolute; left: {{left}}%; top: {{top}}%; width: 0; height: 0; z-index: 100; pointer-events: none; }
      | .{{c.wrap}} > * { position: absolute; left: 0; top: 0; will-change: transform, opacity; }
      | .{{c.star}} { width: {{size}}px; height: {{size}}px; filter: drop-shadow(0 0 6px rgba(255, 214, 0, 0.95)) drop-shadow(0 0 16px rgba(255, 140, 0, 0.7)); animation: star{{n}} {{TOTAL}}s linear both; }
      | .{{c.glow}} { width: {{size * 2.2}}px; height: {{size * 2.2}}px; border-radius: 50%; background: radial-gradient(circle, rgba(255, 230, 120, 0.85) 0%, rgba(255, 170, 0, 0.45) 35%, rgba(255, 140, 0, 0) 70%); animation: glow{{n}} {{TOTAL}}s linear both; }
      | .{{c.flash}} { width: {{size * 1.8}}px; height: {{size * 1.8}}px; border-radius: 50%; background: radial-gradient(circle, #fff 0%, rgba(255, 245, 180, 0.9) 30%, rgba(255, 220, 80, 0) 70%); animation: flash{{n}} 0.35s ease-out both; }
      | .{{c.ring}} { width: {{size}}px; height: {{size}}px; border-radius: 50%; border: 4px solid #ffd54a; box-shadow: 0 0 14px rgba(255, 170, 0, 0.9), inset 0 0 10px rgba(255, 170, 0, 0.6); box-sizing: border-box; animation: ring{{n}} 0.7s ease-out both; }
      | .{{c.spark}} { animation: spark{{n}} var(--t) ease-out var(--delay) both; }
      | .{{c.mini}} { font-size: var(--fs); line-height: 1; color: var(--col); text-shadow: 0 0 6px rgba(255, 190, 0, 0.9); }
      | .{{c.bar}} { width: 4px; height: var(--len); border-radius: 2px; background: linear-gradient(to top, rgba(255, 255, 255, 0), var(--col)); }
      | @keyframes star{{n}} {
      |   0%    { transform: translate(-50%, -50%) rotate({{spin}}deg) scale(2.4); opacity: 0.25; animation-timing-function: ease-in; }
      |   15.5% { transform: translate(-50%, -50%) rotate(0deg) scale(0.85); opacity: 1; animation-timing-function: ease-out; }
      |   20%   { transform: translate(-50%, -50%) rotate(0deg) scale(1.2); animation-timing-function: ease-in-out; }
      |   25%   { transform: translate(-50%, -50%) rotate(0deg) scale(1); }
      |   38%   { transform: translate(-50%, -50%) rotate(0deg) scale(1.06); }
      |   51%   { transform: translate(-50%, -50%) rotate(0deg) scale(1); }
      |   64%   { transform: translate(-50%, -50%) rotate(0deg) scale(1.06); }
      |   77%   { transform: translate(-50%, -50%) rotate(0deg) scale(1); opacity: 1; animation-timing-function: ease-in; }
      |   100%  { transform: translate(-50%, -50%) rotate(0deg) scale(0.6); opacity: 0; }
      | }
      | @keyframes glow{{n}} {
      |   0%, 15% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
      |   19%     { transform: translate(-50%, -50%) scale(1.25); opacity: 1; }
      |   30%     { transform: translate(-50%, -50%) scale(1); opacity: 0.45; }
      |   45%     { opacity: 0.6; }
      |   60%     { opacity: 0.45; }
      |   77%     { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
      |   100%    { transform: translate(-50%, -50%) scale(0.6); opacity: 0; }
      | }
      | @keyframes flash{{n}} {
      |   from { transform: translate(-50%, -50%) scale(0.3); opacity: 1; }
      |   to   { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
      | }
      | @keyframes ring{{n}} {
      |   from { transform: translate(-50%, -50%) scale(0.2); opacity: 1; }
      |   to   { transform: translate(-50%, -50%) scale(2.6); opacity: 0; }
      | }
      | @keyframes spark{{n}} {
      |   from { transform: translate(-50%, -50%) rotate(var(--a)) translateY(0) rotate(0deg) scale(1); opacity: 1; }
      |   55%  { transform: translate(-50%, -50%) rotate(var(--a)) translateY(calc(-0.8 * var(--d))) rotate(calc(0.6 * var(--spin))) scale(1.1); opacity: 1; animation-timing-function: ease-in; }
      |   to   { transform: translate(-50%, -50%) rotate(var(--a)) translateY(calc(-1 * var(--d))) rotate(var(--spin)) scale(0.4); opacity: 0; }
      | }
  </component>
  div(:class="c.glow")
  img(:class="c.star" src="/img/star_throw.png" alt="star")
  template(v-if="impact")
    div(:class="c.flash")
    div(:class="c.ring")
    template(v-for="p in particles" :key="p.id")
      span(v-if="p.kind === 'star'" :class="[c.spark, c.mini]" :style="p.style") ★
      div(v-else :class="[c.spark, c.bar]" :style="p.style")
</template>

<script setup lang="ts">
import globalMixin from '~/globalMixin'
const rnd = globalMixin.methods.$getRandomInt

const TOTAL = 4.5 // s, must stay below the store's 5 s removal
const IMPACT_MS = 700 // matches 15.5 % of TOTAL in the star keyframes

// random suffix keeps several stars on screen from overwriting each other's classes
const n = rnd(0, 1000000)
const c = {
  wrap: `st${n}-wrap`, star: `st${n}-star`, glow: `st${n}-glow`, flash: `st${n}-flash`,
  ring: `st${n}-ring`, spark: `st${n}-spark`, mini: `st${n}-mini`, bar: `st${n}-bar`,
}

const left = rnd(0, 100)
const top = rnd(0, 100)
const size = rnd(90, 190) // px — smaller than before so the glow does not overpower
const spin = (Math.random() < 0.5 ? -1 : 1) * rnd(180, 540) // spins on approach, lands at 0deg

const COLORS = ['#ffffff', '#fff3b0', '#ffd54a', '#ffb300', '#ff8f00']
const count = rnd(8, 12)
const particles = Array.from({ length: count }, (_, i) => {
  const kind = i % 2 === 0 ? 'star' : 'bar'
  return {
    id: i,
    kind,
    style: {
      '--a': `${(i * 360) / count + rnd(-12, 12)}deg`,
      '--d': `${Math.round(size * rnd(120, 220) / 100)}px`,
      '--spin': kind === 'star' ? `${rnd(-200, 200)}deg` : '0deg',
      '--t': `${rnd(900, 1300)}ms`,
      '--delay': `${rnd(0, 60)}ms`,
      '--col': COLORS[rnd(0, COLORS.length - 1)],
      '--fs': `${rnd(20, 36)}px`,
      '--len': `${rnd(16, 30)}px`,
    },
  }
})

const impact = ref(false)

// Optional "ding" on impact. To enable: put a short sound at public/audio/ding.mp3
// and uncomment. play() rejects when the browser blocks autoplay (no user gesture
// yet, e.g. on the beamer) — the catch keeps that silent.
// const ding = new Audio('/audio/ding.mp3')
// ding.volume = 0.5

onMounted(() => {
  globalMixin.methods.$delay(IMPACT_MS).then(() => {
    impact.value = true
    // ding.play()?.catch(() => {})
  })
})
</script>
