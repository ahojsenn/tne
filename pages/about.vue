<template lang="pug">
div.about-page
  div.about-card
    h2.about-title ℹ️ About
    p.about-subtitle Tomatoes &amp; Eggs — what is running right now

    div.loading(v-if="loading") ⏳ Loading…

    div.error(v-else-if="error") Could not load version info: {{ error }}

    template(v-else-if="info")
      div.version-badge(:class="{ dev: info.isDev }") {{ info.version }}

      p.dev-note(v-if="info.isDev")
        | This is a development build — no release information available.
        | Deployed builds show the tag, commit and deploy time here.

      dl.facts(v-else)
        dt Deployed
        dd
          span(:title="info.builtAt") {{ relativeBuilt }}
          span.muted(v-if="info.builtAt")  ({{ info.builtAt }})

        dt Commit
        dd
          a(v-if="info.commitUrl" :href="info.commitUrl" target="_blank" rel="noopener") {{ info.commitShort }}
          span(v-else) {{ info.commitShort ?? '—' }}

        dt Release
        dd.muted {{ info.release ?? '—' }}

        dt(v-if="info.deployedBy") Deployed by
        dd(v-if="info.deployedBy") {{ info.deployedBy }}

        dt(v-if="info.runUrl") Build
        dd(v-if="info.runUrl")
          a(:href="info.runUrl" target="_blank" rel="noopener") CI run

    div.links
      a(href="/") ← Back to the game
</template>

<script setup lang="ts">
interface VersionInfo {
  version: string
  release: string | null
  commit: string | null
  commitShort: string | null
  commitUrl: string | null
  builtAt: string | null
  deployedBy: string | null
  runUrl: string | null
  isDev: boolean
}

const info = ref<VersionInfo | null>(null)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    info.value = await $fetch<VersionInfo>('/api/version')
  } catch (e: any) {
    error.value = e?.message ?? 'unknown error'
  } finally {
    loading.value = false
  }
})

// "3 hours ago" style, so the page answers "is this current?" at a glance.
// The exact UTC timestamp stays visible next to it.
const relativeBuilt = computed(() => {
  const raw = info.value?.builtAt
  if (!raw) return '—'
  const then = new Date(raw).getTime()
  if (Number.isNaN(then)) return raw
  const seconds = Math.round((Date.now() - then) / 1000)
  if (seconds < 60) return 'just now'
  const units: [number, string][] = [
    [60, 'minute'],
    [3600, 'hour'],
    [86400, 'day'],
    [2592000, 'month'],
  ]
  let label = 'a while'
  for (let i = 0; i < units.length; i++) {
    const [size, name] = units[i]
    const next = units[i + 1]?.[0] ?? Infinity
    if (seconds < next) {
      const n = Math.floor(seconds / size)
      label = `${n} ${name}${n === 1 ? '' : 's'}`
      break
    }
  }
  return `${label} ago`
})
</script>

<style scoped>
/* Matches the speaker pages: dark card, greenyellow accents, Courier New.
   The colours are set explicitly rather than inherited — the global
   .bodyClassNoGame rule in app.vue sets `color: white`, so anything left to
   inherit is invisible against a light background. */
.about-page {
  display: flex;
  justify-content: center;
  padding: 48px 16px;
}

.about-card {
  background: #111;
  border: 1px solid greenyellow;
  border-radius: 8px;
  padding: 32px 28px;
  width: 100%;
  max-width: 460px;
  color: #eee;
  font-family: 'Courier New', Courier, monospace;
}

.about-title {
  margin: 0 0 4px;
  color: greenyellow;
}

.about-subtitle {
  margin: 0 0 24px;
  color: #999;
}

.version-badge {
  display: inline-block;
  padding: 6px 16px;
  margin-bottom: 24px;
  border-radius: 999px;
  background: greenyellow;
  color: #111;
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.version-badge.dev {
  background: #555;
  color: #eee;
}

.facts {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 10px 20px;
  margin: 0;
}

.facts dt {
  color: #888;
}

.facts dd {
  margin: 0;
  color: #eee;
  overflow-wrap: anywhere;
}

.facts a,
.links a {
  color: greenyellow;
  text-decoration: none;
}

.facts a:hover,
.links a:hover {
  text-decoration: underline;
}

.muted {
  color: #777;
}

.dev-note {
  color: #999;
  line-height: 1.6;
}

.loading {
  color: #999;
}

.error {
  color: #ff6b6b;
}

.links {
  margin-top: 28px;
}
</style>
