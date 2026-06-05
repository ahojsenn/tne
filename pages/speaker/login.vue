<template lang="pug">
div.login-page
  div.login-card
    h2.login-title 🎤 Speaker Login
    p.login-subtitle Welcome back to Tomatoes &amp; Eggs

    form(@submit.prevent="submit")
      div.field-group
        label(for="email") Email
        input#email(v-model="form.email" type="email" autocomplete="email" :class="{ error: errors.email }")
        span.field-error(v-if="errors.email") {{ errors.email }}

      div.field-group
        label(for="password") Password
        div.password-wrap
          input#password(v-model="form.password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" :class="{ error: errors.password }")
          button.toggle-pw(type="button" @click="showPassword = !showPassword") {{ showPassword ? '🙈' : '👁' }}
        span.field-error(v-if="errors.password") {{ errors.password }}

      div.alert.alert-error(v-if="serverError") {{ serverError }}

      button.submit-btn(type="submit" :disabled="loading")
        span(v-if="loading") ⏳ Logging in…
        span(v-else) Login

    div.links
      a(href="/speaker/register") Don't have an account? Register
</template>

<script setup lang="ts">
const form = reactive({ email: '', password: '' })
const errors = reactive({ email: '', password: '' })
const loading = ref(false)
const serverError = ref('')
const showPassword = ref(false)

onMounted(async () => {
  try {
    await $fetch('/api/speaker/me')
    await navigateTo('/speaker/dashboard')
  } catch {}
})

function validate(): boolean {
  errors.email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? '' : 'Valid email is required'
  errors.password = form.password ? '' : 'Password is required'
  return !Object.values(errors).some(Boolean)
}

async function submit() {
  serverError.value = ''
  if (!validate()) return
  loading.value = true
  try {
    await $fetch('/api/speaker/login', { method: 'POST', body: { ...form } })
    await navigateTo('/speaker/dashboard')
  } catch (e: any) {
    serverError.value = e?.data?.statusMessage ?? 'Something went wrong — please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.login-page {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 60px 16px;
  min-height: 100vh;
  box-sizing: border-box;
}

.login-card {
  background: #111;
  border: 1px solid greenyellow;
  border-radius: 8px;
  padding: 32px 28px;
  width: 100%;
  max-width: 420px;
  font-family: 'Courier New', Courier, monospace;
}

.login-title {
  color: greenyellow;
  font-size: 1.3em;
  text-align: center;
  margin: 0 0 6px;
}

.login-subtitle {
  color: #aaa;
  font-size: 0.85em;
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
  transition: opacity 0.15s;
  margin-bottom: 16px;

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
