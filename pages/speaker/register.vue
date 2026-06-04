<template lang="pug">
v-container.fill-height(fluid)
  v-row(align="center" justify="center")
    v-col(cols="12" sm="8" md="5" lg="4")
      v-card.pa-6(elevation="8" rounded="lg")
        v-card-title.text-h5.text-center.mb-2 🎤 Speaker Registration
        v-card-subtitle.text-center.mb-4 Create your Tomatoes &amp; Eggs speaker account

        v-alert(v-if="successMessage" type="success" variant="tonal" class="mb-4") {{ successMessage }}

        v-form(v-if="!successMessage" @submit.prevent="submit")
          v-text-field(
            v-model="form.displayName"
            label="Display name"
            prepend-inner-icon="mdi-account"
            variant="outlined"
            :error-messages="errors.displayName"
            class="mb-2"
          )
          v-text-field(
            v-model="form.email"
            label="Email"
            type="email"
            prepend-inner-icon="mdi-email"
            variant="outlined"
            :error-messages="errors.email"
            class="mb-2"
          )
          v-text-field(
            v-model="form.password"
            label="Password"
            :type="showPassword ? 'text' : 'password'"
            prepend-inner-icon="mdi-lock"
            :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="showPassword = !showPassword"
            variant="outlined"
            :error-messages="errors.password"
            class="mb-2"
          )
          v-text-field(
            v-model="form.confirmPassword"
            label="Confirm password"
            :type="showPassword ? 'text' : 'password'"
            prepend-inner-icon="mdi-lock-check"
            variant="outlined"
            :error-messages="errors.confirmPassword"
            class="mb-4"
          )

          v-alert(v-if="serverError" type="error" variant="tonal" class="mb-4") {{ serverError }}

          v-btn(
            type="submit"
            color="primary"
            size="large"
            block
            :loading="loading"
          ) Register
</template>

<script setup lang="ts">
const form = reactive({ displayName: '', email: '', password: '', confirmPassword: '' })
const errors = reactive({ displayName: '', email: '', password: '', confirmPassword: '' })
const loading = ref(false)
const serverError = ref('')
const successMessage = ref('')
const showPassword = ref(false)

function validate(): boolean {
  errors.displayName = form.displayName.trim() ? '' : 'Display name is required'
  errors.email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? '' : 'Valid email is required'
  errors.password = form.password.length >= 8 ? '' : 'Password must be at least 8 characters'
  errors.confirmPassword = form.password === form.confirmPassword ? '' : 'Passwords do not match'
  return !Object.values(errors).some(Boolean)
}

async function submit() {
  serverError.value = ''
  if (!validate()) return
  loading.value = true
  try {
    await $fetch('/api/speaker/register', {
      method: 'POST',
      body: { ...form },
    })
    successMessage.value = 'Check your inbox! We sent you a confirmation email. Click the link to activate your account.'
  } catch (e: any) {
    serverError.value = e?.data?.statusMessage ?? 'Something went wrong — please try again.'
  } finally {
    loading.value = false
  }
}
</script>
