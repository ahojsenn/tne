<template lang="pug">
div.forgot-page
  div.forgot-card
    h2.forgot-title 🔑 Reset Password
    p.forgot-subtitle Enter your email and we'll send you a reset link

    div.alert.alert-success(v-if="success")
      | If that email is registered, you'll receive a reset link shortly. Check your inbox.

    form(v-if="!success" @submit.prevent="submit")
      div.field-group
        label(for="email") Email
        input#email(v-model="form.email" type="email" autocomplete="email" :class="{ error: errors.email }")
        span.field-error(v-if="errors.email") {{ errors.email }}

      div.alert.alert-error(v-if="serverError") {{ serverError }}

      button.submit-btn(type="submit" :disabled="loading")
        span(v-if="loading") ⏳ Sending…
        span(v-else) Send reset link

    div.links
      a(href="/speaker/login") Back to login
</template>

<script setup lang="ts">
const form = reactive({ email: '' })
const errors = reactive({ email: '' })
const loading = ref(false)
const serverError = ref('')
const success = ref(false)

function validate(): boolean {
  errors.email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? '' : 'Valid email is required'
  return !errors.email
}

async function submit() {
  serverError.value = ''
  if (!validate()) return
  loading.value = true
  try {
    await $fetch('/api/speaker/forgot-password', { method: 'POST', body: { email: form.email } })
    success.value = true
  } catch (e: any) {
    serverError.value = e?.data?.statusMessage ?? 'Something went wrong — please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.forgot-page {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 60px 16px;
  min-height: 100vh;
  box-sizing: border-box;
}

.forgot-card {
  background: #111;
  border: 1px solid greenyellow;
  border-radius: 8px;
  padding: 32px 28px;
  width: 100%;
  max-width: 420px;
  font-family: 'Courier New', Courier, monospace;
}

.forgot-title {
  color: greenyellow;
  font-size: 1.3em;
  text-align: center;
  margin: 0 0 6px;
}

.forgot-subtitle {
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
