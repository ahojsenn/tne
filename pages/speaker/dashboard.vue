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

      div.hero-section
        p.hero-label 🦸 Hero Name
        p.hero-name {{ speaker.heroName ?? 'Not set' }}
        button.hero-change-btn(@click="showHeroPicker = !showHeroPicker" v-if="!showHeroPicker") Change Hero

        div.hero-picker(v-if="showHeroPicker")
          input.hero-search(
            v-model="heroSearch"
            type="text"
            placeholder="Search heroes…"
            autocomplete="off"
          )
          div.hero-list
            button.hero-item(
              v-for="hero in filteredHeroes"
              :key="hero"
              :class="{ selected: heroSelection === hero }"
              @click="heroSelection = hero"
            ) {{ hero }}
          div.picker-actions
            button.save-btn(@click="saveHero" :disabled="!heroSelection || !!actionLoading")
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

const speaker = ref<{ email: string; displayName: string; heroName: string | null } | null>(null)
const pending = ref(true)
const serverError = ref('')
const successMessage = ref('')
const actionLoading = ref<'logout' | 'delete' | 'hero' | ''>('')
const showDeleteConfirm = ref(false)
const showHeroPicker = ref(false)
const heroSearch = ref('')
const heroSelection = ref('')

const filteredHeroes = computed(() =>
  heroSearch.value.trim()
    ? superheroes.filter(h => h.toLowerCase().includes(heroSearch.value.toLowerCase()))
    : superheroes
)

onMounted(async () => {
  try {
    speaker.value = await $fetch('/api/speaker/me')
    heroSelection.value = speaker.value?.heroName ?? ''
  } catch {
    await navigateTo('/speaker/login')
  } finally {
    pending.value = false
  }
})

function cancelPicker() {
  heroSelection.value = speaker.value?.heroName ?? ''
  heroSearch.value = ''
  showHeroPicker.value = false
}

async function saveHero() {
  serverError.value = ''
  successMessage.value = ''
  actionLoading.value = 'hero'
  try {
    await $fetch('/api/speaker/hero', { method: 'PUT', body: { heroName: heroSelection.value } })
    if (speaker.value) speaker.value.heroName = heroSelection.value
    heroSearch.value = ''
    showHeroPicker.value = false
    successMessage.value = `Hero set to ${heroSelection.value}!`
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
