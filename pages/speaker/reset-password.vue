<template lang="pug">
div.reset-page
  div.reset-card
    h2.reset-title 🔑 Set New Password

    div.alert.alert-error(v-if="tokenError") {{ tokenError }}

    div.alert.alert-success(v-if="success")
      | Your password has been reset successfully.
      br
      a(href="/speaker/login") Log in with your new password

    form(v-if="!tokenError && !success" @submit.prevent="submit")
      div.field-group
        label(for="newPassword") New password
        div.password-wrap
          input#newPassword(
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
            :class="{ error: errors.password }"
          )
          button.toggle-pw(type="button" @click="showPassword = !showPassword") {{ showPassword ? '🙈' : '👁' }}
        span.field-error(v-if="errors.password") {{ errors.password }}

      div.field-group
        label(for="confirmPassword") Confirm new password
        input#confirmPassword(
          v-model="form.confirmPassword"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="new-password"
          :class="{ error: errors.confirmPassword }"
        )
        span.field-error(v-if="errors.confirmPassword") {{ errors.confirmPassword }}

      div.alert.alert-error(v-if="serverError") {{ serverError }}

      button.submit-btn(type="submit" :disabled="loading")
        span(v-if="loading") ⏳ Resetting…
        span(v-else) Reset password

    div.links(v-if="!success")
      a(href="/speaker/login") Back to login
</template>

<script setup lang="ts">
const route = useRoute()
const token = route.query.token as string | undefined

const form = reactive({ password: '', confirmPassword: '' })
const errors = reactive({ password: '', confirmPassword: '' })
const loading = ref(false)
const serverError = ref('')
const tokenError = ref('')
const success = ref(false)
const showPassword = ref(false)

onMounted(() => {
  if (!token) {
    tokenError.value = 'Invalid or missing reset token. Please request a new password reset.'
  }
})

function validate(): boolean {
  errors.password = form.password.length >= 8 ? '' : 'Password must be at least 8 characters'
  errors.confirmPassword = form.password === form.confirmPassword ? '' : 'Passwords do not match'
  return !Object.values(errors).some(Boolean)
}

async function submit() {
  serverError.value = ''
  if (!validate()) return
  loading.value = true
  try {
    await $fetch('/api/speaker/reset-password', {
      method: 'POST',
      body: { token, password: form.password, confirmPassword: form.confirmPassword },
    })
    success.value = true
    await navigateTo('/speaker/login?reset=1')
  } catch (e: any) {
    const msg = e?.data?.statusMessage ?? ''
    if (msg.includes('expired') || msg.includes('Invalid')) {
      tokenError.value = 'This reset link is invalid or has expired. Please request a new one.'
    } else {
      serverError.value = msg || 'Something went wrong — please try again.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.reset-page {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 60px 16px;
  min-height: 100vh;
  box-sizing: border-box;
}

.reset-card {
  background: #111;
  border: 1px solid greenyellow;
  border-radius: 8px;
  padding: 32px 28px;
  width: 100%;
  max-width: 420px;
  font-family: 'Courier New', Courier, monospace;
}

.reset-title {
  color: greenyellow;
  font-size: 1.3em;
  text-align: center;
  margin: 0 0 24px;
}

.field-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;

  label {
    color: greenyellow;
    font-size: 0.85em;
    margin-bottom: 4px;
  }

  input {
    background: #1e1e1e;
    border: 1px solid #555;
    border-radius: 4px;
    color: white;
    font-family: 'Courier New', Courier, monospace;
    font-size: 1em;
    padding: 10px 12px;
    outline: none;
    transition: border-color 0.15s;

    &:focus { border-color: greenyellow; }
    &.error { border-color: #f44; }
  }
}

.password-wrap {
  display: flex;
  gap: 8px;

  input { flex: 1; }
}

.toggle-pw {
  background: #1e1e1e;
  border: 1px solid #555;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  font-size: 1em;
  padding: 0 10px;
  &:hover { border-color: greenyellow; }
}

.field-error {
  color: #f66;
  font-size: 0.8em;
  margin-top: 3px;
}

.alert {
  border-radius: 4px;
  font-size: 0.9em;
  margin-bottom: 16px;
  padding: 12px 14px;
}

.alert-success {
  background: rgba(0, 200, 80, 0.15);
  border: 1px solid #0c8;
  color: #0c8;

  a { color: #0c8; }
}

.alert-error {
  background: rgba(255, 60, 60, 0.15);
  border: 1px solid #f44;
  color: #f66;
}

.submit-btn {
  background: greenyellow;
  border: none;
  border-radius: 4px;
  color: black;
  cursor: pointer;
  font-family: 'Courier New', Courier, monospace;
  font-size: 1em;
  font-weight: bold;
  padding: 12px;
  width: 100%;
  margin-bottom: 16px;
  transition: opacity 0.15s;

  &:hover:not(:disabled) { opacity: 0.85; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

.links {
  text-align: center;
  font-size: 0.85em;

  a {
    color: greenyellow;
    text-decoration: underline;
  }
}
</style>
