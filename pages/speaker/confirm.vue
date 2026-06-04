<template lang="pug">
v-container.fill-height(fluid)
  v-row(align="center" justify="center")
    v-col(cols="12" sm="8" md="5" lg="4")
      v-card.pa-6(elevation="8" rounded="lg")
        v-card-title.text-h5.text-center.mb-4 🎤 Email Confirmation

        div(v-if="pending")
          v-progress-circular.d-block.mx-auto.mb-4(indeterminate color="primary")
          p.text-center Confirming your account…

        v-alert(v-else-if="error" type="error" variant="tonal")
          | {{ error }}
          div.mt-3
            v-btn(variant="text" size="small" to="/speaker/register") Register again

        div(v-else)
          v-alert(type="success" variant="tonal" class="mb-4") Your account is confirmed! You can now log in.
          v-btn(color="primary" block to="/speaker/login") Go to login
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
