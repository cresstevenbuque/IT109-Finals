<template>
  <v-app>
    <v-main class="register-bg d-flex align-center justify-center" style="min-height: 100vh;">
      <v-container fluid class="d-flex align-center justify-center" style="min-height: 100vh;">
        <v-card
          max-width="480"
          width="100%"
          class="pa-6 mx-auto"
          elevation="8"
          rounded="xl"
        >
          <!-- Header -->
          <div class="text-center mb-5">
            <v-avatar color="primary" size="56" class="mb-3">
              <v-icon color="white" size="32">mdi-account-plus</v-icon>
            </v-avatar>
            <h1 class="text-h5 font-weight-bold text-primary">Create Account</h1>
            <p class="text-body-2 text-medium-emphasis mt-1">
              Join BasuraTrack to stay updated with your collection schedule
            </p>
          </div>

          <!-- Register Form -->
          <v-form ref="formRef" v-model="valid" @submit.prevent="handleRegister" lazy-validation>
            <v-text-field
              v-model="fullName"
              label="Full Name"
              prepend-inner-icon="mdi-account-outline"
              :rules="[rules.required]"
              :disabled="loading"
              class="mb-1"
            />

            <v-text-field
              v-model="email"
              label="Email Address"
              type="email"
              prepend-inner-icon="mdi-email-outline"
              :rules="[rules.required, rules.email]"
              :disabled="loading"
              class="mb-1"
            />

            <v-text-field
              v-model="phone"
              label="Phone Number (e.g. 09171234567)"
              prepend-inner-icon="mdi-phone-outline"
              :rules="[rules.phone]"
              :disabled="loading"
              class="mb-1"
            />

            <v-text-field
              v-model="password"
              label="Password"
              :type="showPassword ? 'text' : 'password'"
              prepend-inner-icon="mdi-lock-outline"
              :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="showPassword = !showPassword"
              :rules="[rules.required, rules.minLength]"
              :disabled="loading"
              class="mb-1"
            />

            <v-text-field
              v-model="confirmPassword"
              label="Confirm Password"
              :type="showPassword ? 'text' : 'password'"
              prepend-inner-icon="mdi-lock-check-outline"
              :rules="[rules.required, rules.matchPassword]"
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
              Create Account
            </v-btn>
          </v-form>

          <v-divider class="mb-4" />

          <p class="text-center text-body-2">
            Already have an account?
            <router-link to="/login" class="text-primary font-weight-medium text-decoration-none">
              Sign in
            </router-link>
          </p>
        </v-card>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
/**
 * Registration page — creates a new resident account via Supabase Auth.
 * The signup trigger in the DB auto-creates the profile row.
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
const fullName = ref('')
const email = ref('')
const phone = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const loading = ref(false)
const errorMessage = ref('')

const rules = {
  required: (v) => !!v || 'This field is required',
  email: (v) => /.+@.+\..+/.test(v) || 'Enter a valid email',
  minLength: (v) => (v && v.length >= 6) || 'Password must be at least 6 characters',
  matchPassword: (v) => v === password.value || 'Passwords do not match',
  phone: (v) => !v || /^(09|\+639)\d{9}$/.test(v) || 'Enter a valid PH phone number',
}

async function handleRegister() {
  const { valid: isValid } = await formRef.value.validate()
  if (!isValid) return

  loading.value = true
  errorMessage.value = ''

  try {
    await authStore.register({
      email: email.value,
      password: password.value,
      fullName: fullName.value,
      role: 'resident',
      phone: phone.value || null,
    })

    showSnackbar('Account created successfully! Welcome to BasuraTrack.', 'success')
    router.push('/home')
  } catch (err) {
    errorMessage.value = err.message || 'Registration failed. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-bg {
  background: linear-gradient(135deg, #00695C 0%, #2E7D32 50%, #00897B 100%);
}
</style>
