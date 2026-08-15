<template lang="pug">
div.dashboard-page
  div.dashboard-card
    h2.dashboard-title 🎤 Speaker Dashboard

    div(v-if="pending")
      p.text-center ⏳ Loading…

    div(v-else-if="speaker")
      p.welcome Welcome, #[strong {{ speaker.displayName }}]!
      p.email-label {{ speaker.email }}

      div.alert.alert-error(v-if="serverError") {{ serverError }}
      div.alert.alert-success(v-if="successMessage") {{ successMessage }}

      //- Live tally while this speaker is the one on stage.
      div.live-section(v-if="stats")
        div.live-head
          span.live-dot(v-if="stats.onStage") ●
          span.live-title(v-if="stats.onStage") LIVE — you are on stage
          span.live-title.off(v-else) Not on stage right now
          span.live-since(v-if="stats.onStage && elapsedLabel") {{ elapsedLabel }}

        template(v-if="stats.onStage")
          div.live-total
            span.live-total-n {{ stats.total }}
            span.live-total-l {{ stats.total === 1 ? 'throw' : 'throws' }} so far
          div.live-grid
            div.live-item(v-for="item in THROWABLES" :key="item")
              img.live-img(:src="`/img/${item}_throw.png`" :alt="item")
              span.live-count {{ stats.counts[item] ?? 0 }}
        p.live-hint(v-else)
          | Your live throw count appears here once the game console puts you on stage.

      div.hero-section
        p.hero-label 🦸 Hero Name
        p.hero-name {{ speaker.heroName ?? 'Not set' }}
        button.hero-change-btn(@click="openPicker" v-if="!showHeroPicker") Change Hero

        div.hero-picker(v-if="showHeroPicker")
          label.hero-input-label(for="heroName") Type your own name, or pick a suggestion
          input#heroName.hero-search(
            v-model="heroInput"
            type="text"
            placeholder="e.g. Captain Kommitment"
            autocomplete="off"
            :class="{ error: heroTouched && heroError }"
            @input="heroTouched = true"
          )
          div.hero-meta
            span.hero-error(v-if="heroTouched && heroError") {{ heroError }}
            span.hero-counter(v-else :class="{ over: heroTrimmed.length > HERO_NAME_MAX_LENGTH }")
              | {{ heroTrimmed.length }}/{{ HERO_NAME_MAX_LENGTH }}
          div.hero-list
            button.hero-item(
              v-for="hero in filteredHeroes"
              :key="hero"
              :class="{ selected: heroTrimmed === hero }"
              @click="pickHero(hero)"
            ) {{ hero }}
          //- Only when the name is actually saveable — otherwise this would
          //- promise to store something the validator is about to reject.
          p.hero-no-match(v-if="!filteredHeroes.length && !heroError")
            | No suggestion matches — “{{ heroTrimmed }}” will be saved as your own name.
          div.picker-actions
            button.save-btn(@click="saveHero" :disabled="!!heroError || !!actionLoading")
              span(v-if="actionLoading === 'hero'") ⏳ Saving…
              span(v-else) Save
            button.cancel-btn(@click="cancelPicker") Cancel

      div.confirm-dialog(v-if="showDeleteConfirm")
        p.confirm-text ⚠️ Are you sure? This cannot be undone.
        div.confirm-actions
          button.delete-btn(@click="deleteAccount" :disabled="!!actionLoading")
            span(v-if="actionLoading === 'delete'") ⏳ Deleting…
            span(v-else) Yes, delete my account
          button.cancel-btn(@click="showDeleteConfirm = false") Cancel

      div.actions(v-if="!showDeleteConfirm && !showHeroPicker")
        button.logout-btn(@click="logout" :disabled="!!actionLoading")
          span(v-if="actionLoading === 'logout'") ⏳ Logging out…
          span(v-else) Logout
        button.delete-btn(@click="showDeleteConfirm = true" :disabled="!!actionLoading") 🗑 Delete Account
</template>

<script setup lang="ts">
import superheroes from '~/types/heroes'
import { HERO_NAME_MAX_LENGTH, validateHeroName } from '~/types/heroName'
import { THROWABLES, type TALK_STATS } from '~/types/talk'

const speaker = ref<{ email: string; displayName: string; heroName: string | null } | null>(null)
const pending = ref(true)
const serverError = ref('')
const successMessage = ref('')
const actionLoading = ref<'logout' | 'delete' | 'hero' | ''>('')
const showDeleteConfirm = ref(false)
const showHeroPicker = ref(false)

// One field does both jobs: it is the name that gets saved, and it filters the
// suggestion list as you type. Starts empty when the picker opens so the full
// list is visible — the current name is already shown above it.
const heroInput = ref('')
const heroTouched = ref(false)

const heroTrimmed = computed(() => heroInput.value.trim())

// Same validator the server uses, so the message shown here is the message the
// API would return.
const heroError = computed(() => {
  const check = validateHeroName(heroInput.value)
  return check.ok ? '' : check.message
})

const filteredHeroes = computed(() =>
  heroTrimmed.value
    ? superheroes.filter(h => h.toLowerCase().includes(heroTrimmed.value.toLowerCase()))
    : superheroes
)

// --- live talk stats ---
// Polled, not pushed: the socket is unauthenticated, and these numbers are
// only for the speaker they belong to. Two seconds is live enough for a tally
// that a person is glancing at, and it costs one small request.
const stats = ref<TALK_STATS | null>(null)
const now = ref(Date.now())
let statsTimer: ReturnType<typeof setInterval> | null = null
let clockTimer: ReturnType<typeof setInterval> | null = null

const elapsedLabel = computed(() => {
  if (!stats.value?.startedAt) return ''
  const started = new Date(stats.value.startedAt).getTime()
  if (Number.isNaN(started)) return ''
  const secs = Math.max(0, Math.floor((now.value - started) / 1000))
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
})

async function loadStats() {
  try {
    stats.value = await $fetch<TALK_STATS>('/api/speaker/talk-stats')
  } catch {
    // A dropped poll is not worth showing; the next one will tell the truth.
  }
}

onMounted(async () => {
  try {
    speaker.value = await $fetch('/api/speaker/me')
  } catch {
    await navigateTo('/speaker/login')
    return
  } finally {
    pending.value = false
  }

  await loadStats()
  statsTimer = setInterval(loadStats, 2000)
  clockTimer = setInterval(() => { now.value = Date.now() }, 1000)
})

onUnmounted(() => {
  if (statsTimer) clearInterval(statsTimer)
  if (clockTimer) clearInterval(clockTimer)
})

function openPicker() {
  heroInput.value = ''
  heroTouched.value = false
  showHeroPicker.value = true
}

function pickHero(hero: string) {
  heroInput.value = hero
  heroTouched.value = true
}

function cancelPicker() {
  heroInput.value = ''
  heroTouched.value = false
  showHeroPicker.value = false
}

async function saveHero() {
  heroTouched.value = true
  if (heroError.value) return

  serverError.value = ''
  successMessage.value = ''
  actionLoading.value = 'hero'
  const name = heroTrimmed.value
  try {
    const saved = await $fetch<{ heroName: string }>('/api/speaker/hero', {
      method: 'PUT',
      body: { heroName: name },
    })
    if (speaker.value) speaker.value.heroName = saved.heroName
    heroInput.value = ''
    heroTouched.value = false
    showHeroPicker.value = false
    successMessage.value = `Hero set to ${saved.heroName}!`
    setTimeout(() => { successMessage.value = '' }, 4000)
  } catch (e: any) {
    serverError.value = e?.data?.statusMessage ?? 'Could not save hero — please try again.'
  } finally {
    actionLoading.value = ''
  }
}

async function logout() {
  serverError.value = ''
  actionLoading.value = 'logout'
  try {
    await $fetch('/api/speaker/logout', { method: 'POST' })
    await navigateTo('/speaker/login')
  } catch (e: any) {
    serverError.value = e?.data?.statusMessage ?? 'Logout failed — please try again.'
    actionLoading.value = ''
  }
}

async function deleteAccount() {
  serverError.value = ''
  actionLoading.value = 'delete'
  try {
    await $fetch('/api/speaker/delete', { method: 'POST' })
    await navigateTo('/speaker/register')
  } catch (e: any) {
    serverError.value = e?.data?.statusMessage ?? 'Delete failed — please try again.'
    actionLoading.value = ''
    showDeleteConfirm.value = false
  }
}
</script>

<style scoped lang="scss">
.dashboard-page {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 60px 16px;
  min-height: 100vh;
  box-sizing: border-box;
}

.dashboard-card {
  background: #111;
  border: 1px solid greenyellow;
  border-radius: 8px;
  padding: 32px 28px;
  width: 100%;
  max-width: 420px;
  font-family: 'Courier New', Courier, monospace;
}

.dashboard-title {
  color: greenyellow;
  font-size: 1.3em;
  text-align: center;
  margin: 0 0 24px;
}

.welcome {
  color: #fff;
  font-size: 1.05em;
  margin: 0 0 6px;
}

.email-label {
  color: #aaa;
  font-size: 0.85em;
  margin: 0 0 24px;
}

.text-center {
  text-align: center;
  color: #aaa;
}

.hero-section {
  border: 1px solid #333;
  border-radius: 6px;
  padding: 14px 16px;
  margin-bottom: 20px;
}

/* --- live talk stats --- */
.live-section {
  border: 1px solid #333;
  border-radius: 6px;
  padding: 14px 16px;
  margin-bottom: 20px;
  color: #eee; /* explicit: the global .bodyClassNoGame sets color: white */
}

.live-head {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
}

.live-dot {
  color: #f44;
  animation: live-pulse 1.4s ease-in-out infinite;
}

@keyframes live-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.25; }
}

.live-title {
  color: greenyellow;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.live-title.off {
  color: #888;
  font-weight: 400;
  letter-spacing: 0;
}

.live-since {
  color: #888;
  font-size: 0.85em;
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}

.live-total {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 12px 0 4px;
}

.live-total-n {
  color: greenyellow;
  font-size: 2em;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.live-total-l {
  color: #aaa;
}

.live-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  margin-top: 8px;
}

.live-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.live-img {
  width: 100%;
  max-width: 44px;
  height: auto;
}

.live-count {
  color: #eee;
  font-variant-numeric: tabular-nums;
}

.live-hint {
  color: #888;
  font-size: 0.85em;
  line-height: 1.5;
  margin: 8px 0 0;
}

.hero-label {
  color: #aaa;
  font-size: 0.8em;
  margin: 0 0 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.hero-name {
  color: greenyellow;
  font-size: 1.1em;
  font-weight: bold;
  margin: 0 0 10px;
}

.hero-change-btn {
  background: transparent;
  border: 1px solid #555;
  border-radius: 4px;
  color: #aaa;
  cursor: pointer;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.85em;
  padding: 6px 12px;
  transition: border-color 0.15s, color 0.15s;

  &:hover { border-color: greenyellow; color: greenyellow; }
}

.hero-picker {
  margin-top: 12px;
}

.hero-input-label {
  display: block;
  color: #999;
  font-size: 0.8em;
  margin-bottom: 6px;
}

.hero-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.8em;
  margin: -4px 0 8px;
  min-height: 1.2em;
}

.hero-error {
  color: #f66;
}

.hero-counter {
  color: #777;
  margin-left: auto;
}

.hero-counter.over {
  color: #f66;
}

.hero-no-match {
  color: #999;
  font-size: 0.8em;
  margin: 8px 0 0;
}

.hero-search {
  background: #1a1a1a;
  border: 1px solid #444;
  border-radius: 4px;
  color: #fff;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.9em;
  padding: 8px 10px;
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 8px;

  &:focus { outline: none; border-color: greenyellow; }
  &::placeholder { color: #555; }

  // After &:focus deliberately — same specificity, so source order decides,
  // and the invalid state has to win while the field is focused.
  &.error, &.error:focus { border-color: #f44; }
}

.hero-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
  padding: 4px 0;
  margin-bottom: 12px;
}

.hero-item {
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 4px;
  color: #ccc;
  cursor: pointer;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.8em;
  padding: 5px 10px;
  transition: border-color 0.15s, color 0.15s;

  &:hover { border-color: greenyellow; color: greenyellow; }

  &.selected {
    border-color: greenyellow;
    color: greenyellow;
    background: rgba(173, 255, 47, 0.08);
  }
}

.picker-actions {
  display: flex;
  gap: 8px;
}

.save-btn {
  background: rgba(173, 255, 47, 0.1);
  border: 1px solid greenyellow;
  border-radius: 4px;
  color: greenyellow;
  cursor: pointer;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.9em;
  font-weight: bold;
  padding: 8px 16px;
  transition: opacity 0.15s;

  &:hover:not(:disabled) { opacity: 0.8; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.logout-btn {
  background: #1e1e1e;
  border: 1px solid greenyellow;
  border-radius: 4px;
  color: greenyellow;
  cursor: pointer;
  font-family: 'Courier New', Courier, monospace;
  font-size: 1em;
  font-weight: bold;
  padding: 12px;
  width: 100%;
  transition: opacity 0.15s;

  &:hover:not(:disabled) { opacity: 0.8; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

.delete-btn {
  background: rgba(255, 60, 60, 0.15);
  border: 1px solid #f44;
  border-radius: 4px;
  color: #f66;
  cursor: pointer;
  font-family: 'Courier New', Courier, monospace;
  font-size: 1em;
  font-weight: bold;
  padding: 12px;
  width: 100%;
  transition: opacity 0.15s;

  &:hover:not(:disabled) { opacity: 0.8; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

.cancel-btn {
  background: #1e1e1e;
  border: 1px solid #555;
  border-radius: 4px;
  color: #aaa;
  cursor: pointer;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.9em;
  padding: 8px 16px;
  transition: opacity 0.15s;

  &:hover { border-color: greenyellow; color: greenyellow; }
}

.confirm-dialog {
  border: 1px solid #f44;
  border-radius: 6px;
  padding: 16px;
  background: rgba(255, 60, 60, 0.08);
  margin-bottom: 16px;
}

.confirm-text {
  color: #f66;
  font-size: 0.95em;
  margin: 0 0 14px;
  text-align: center;
}

.confirm-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.alert {
  border-radius: 4px;
  font-size: 0.9em;
  margin-bottom: 16px;
  padding: 12px 14px;
}

.alert-error {
  background: rgba(255, 60, 60, 0.15);
  border: 1px solid #f44;
  color: #f66;
}

.alert-success {
  background: rgba(173, 255, 47, 0.1);
  border: 1px solid greenyellow;
  color: greenyellow;
}
</style>
