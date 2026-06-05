<template lang="pug">
div.confirm-page
  div.confirm-card
    h2.confirm-title 🎤 Email Confirmation

    div(v-if="pending")
      p.text-center ⏳ Confirming your account…

    div.alert.alert-error(v-else-if="error")
      | {{ error }}
      div.mt-3
        a(href="/speaker/register") Register again

    div.alert.alert-success(v-else)
      | Your account is confirmed! You can now
      |  
      a(href="/speaker/login") log in.
</template>

<script setup lang="ts">
const route = useRoute()
const pending = ref(true)
const error = ref('')

onMounted(async () => {
  const token = route.query.token as string | undefined
  if (!token) {
    error.value = 'No confirmation token found in the URL.'
    pending.value = false
    return
  }
  try {
    await $fetch(`/api/speaker/confirm?token=${token}`)
    pending.value = false
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? 'Confirmation failed — the link may have expired.'
    pending.value = false
  }
})
</script>

<style scoped lang="scss">
.confirm-page {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 60px 16px;
  min-height: 100vh;
  box-sizing: border-box;
}

.confirm-card {
  background: #111;
  border: 1px solid greenyellow;
  border-radius: 8px;
  padding: 32px 28px;
  width: 100%;
  max-width: 420px;
  font-family: 'Courier New', Courier, monospace;
}

.confirm-title {
  color: greenyellow;
  font-size: 1.3em;
  text-align: center;
  margin: 0 0 24px;
}

.text-center { text-align: center; color: #aaa; }

.mt-3 { margin-top: 12px; }

.alert {
  border-radius: 4px;
  font-size: 0.9em;
  padding: 14px 16px;
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

  a {
    color: greenyellow;
    text-decoration: underline;
    font-size: 0.85em;
  }
}
</style>
