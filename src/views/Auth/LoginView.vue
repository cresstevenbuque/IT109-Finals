<template>
  <v-app>
    <v-main class="login-bg d-flex align-center justify-center" style="min-height: 100vh;">
      <v-container fluid class="d-flex align-center justify-center" style="min-height: 100vh;">
        <v-card
          max-width="440"
          width="100%"
          class="pa-6 mx-auto"
          elevation="8"
          rounded="xl"
        >
          <!-- Logo / Header -->
          <div class="text-center mb-6">
            <v-avatar color="primary" size="64" class="mb-3">
              <v-icon color="white" size="36">mdi-recycle</v-icon>
            </v-avatar>
            <h1 class="text-h5 font-weight-bold text-primary">BasuraTrack</h1>
            <p class="text-body-2 text-medium-emphasis mt-1">
              Barangay Garbage Collection Scheduler
            </p>
          </div>

          <!-- Login Form -->
          <v-form ref="formRef" v-model="valid" @submit.prevent="handleLogin" lazy-validation>
            <v-text-field
              v-model="email"
              label="Email Address"
              type="email"
              prepend-inner-icon="mdi-email-outline"
              :rules="[rules.required, rules.email]"
              :disabled="loading"
              class="mb-2"
            />

            <v-text-field
              v-model="password"
              label="Password"
              :type="showPassword ? 'text' : 'password'"
              prepend-inner-icon="mdi-lock-outline"
              :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="showPassword = !showPassword"
              :rules="[rules.required]"
              :disabled="loading"
              class="mb-2"
            />

            <!-- Error alert -->
            <v-alert
              v-if="errorMessage"
              type="error"
              variant="tonal"
              density="compact"
              class="mb-4"
              closable
              @click:close="errorMessage = ''"
            >
              {{ errorMessage }}
            </v-alert>

            <v-btn
              type="submit"
              color="primary"
              size="large"
              block
              :loading="loading"
              :disabled="!valid"
              class="mb-4"
            >
              Sign In
            </v-btn>
          </v-form>

          <v-divider class="mb-4" />

          <p class="text-center text-body-2">
            Don't have an account?
            <router-link to="/register" class="text-primary font-weight-medium text-decoration-none">
              Register here
            </router-link>
          </p>
        </v-card>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
/**
 * Login page — email/password authentication via Supabase Auth.
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { useSnackbar } from '@/composables/useSnackbar.js'

const router = useRouter()
const authStore = useAuthStore()
const { showSnackbar } = useSnackbar()

const formRef = ref(null)
const valid = ref(false)
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const errorMessage = ref('')

const rules = {
  required: (v) => !!v || 'This field is required',
  email: (v) => /.+@.+\..+/.test(v) || 'Enter a valid email',
}

async function handleLogin() {
  const { valid: isValid } = await formRef.value.validate()
  if (!isValid) return

  loading.value = true
  errorMessage.value = ''

  try {
    await authStore.login(email.value, password.value)
    showSnackbar('Welcome back!', 'success')

    // Redirect based on role
    const role = authStore.role
    if (role === 'admin') router.push('/')
    else if (role === 'collector') router.push('/collector/today')
    else router.push('/home')
  } catch (err) {
    errorMessage.value = err.message || 'Invalid credentials. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-bg {
  background: linear-gradient(135deg, #00897B 0%, #43A047 50%, #26A69A 100%);
}
</style>
