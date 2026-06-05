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

      div.confirm-dialog(v-if="showDeleteConfirm")
        p.confirm-text ⚠️ Are you sure? This cannot be undone.
        div.confirm-actions
          button.delete-btn(@click="deleteAccount" :disabled="!!actionLoading")
            span(v-if="actionLoading === 'delete'") ⏳ Deleting…
            span(v-else) Yes, delete my account
          button.cancel-btn(@click="showDeleteConfirm = false") Cancel

      div.actions(v-else)
        button.logout-btn(@click="logout" :disabled="!!actionLoading")
          span(v-if="actionLoading === 'logout'") ⏳ Logging out…
          span(v-else) Logout
        button.delete-btn(@click="showDeleteConfirm = true" :disabled="!!actionLoading") 🗑 Delete Account
</template>

<script setup lang="ts">
const speaker = ref<{ email: string; displayName: string } | null>(null)
const pending = ref(true)
const serverError = ref('')
const actionLoading = ref<'logout' | 'delete' | ''>('')
const showDeleteConfirm = ref(false)

onMounted(async () => {
  try {
    speaker.value = await $fetch('/api/speaker/me')
  } catch {
    await navigateTo('/speaker/login')
  } finally {
    pending.value = false
  }
})

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
  font-size: 1em;
  padding: 12px;
  width: 100%;
  margin-top: 8px;
  transition: opacity 0.15s;

  &:hover { border-color: greenyellow; color: greenyellow; }
}

.confirm-dialog {
  border: 1px solid #f44;
  border-radius: 6px;
  padding: 16px;
  background: rgba(255, 60, 60, 0.08);
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
</style>
