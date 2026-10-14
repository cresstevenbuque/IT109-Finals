<template>
  <div>
    <!-- Top App Bar -->
    <v-app-bar color="primary" density="comfortable" elevation="2">
      <v-app-bar-nav-icon @click="drawer = !drawer" />

      <v-toolbar-title class="font-weight-bold">
        <v-icon class="mr-1" size="small">mdi-recycle</v-icon>
        BasuraTrack
      </v-toolbar-title>

      <v-spacer />

      <!-- Dark mode toggle -->
      <v-btn icon @click="toggleTheme" :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'">
        <v-icon>{{ isDark ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
      </v-btn>

      <!-- User menu -->
      <v-menu offset-y>
        <template #activator="{ props }">
          <v-btn icon v-bind="props">
            <v-avatar color="secondary" size="36">
              <span class="text-white text-body-2 font-weight-bold">
                {{ initials }}
              </span>
            </v-avatar>
          </v-btn>
        </template>
        <v-list density="compact" min-width="200">
          <v-list-item>
            <v-list-item-title class="font-weight-medium">
              {{ authStore.profile?.full_name || 'User' }}
            </v-list-item-title>
            <v-list-item-subtitle>
              {{ authStore.user?.email }}
            </v-list-item-subtitle>
          </v-list-item>
          <v-divider />
          <v-list-item>
            <v-chip size="small" :color="roleColor" variant="flat">
              {{ authStore.role }}
            </v-chip>
          </v-list-item>
          <v-divider />
          <v-list-item @click="handleLogout" prepend-icon="mdi-logout" title="Sign Out" />
        </v-list>
      </v-menu>
    </v-app-bar>

    <!-- Navigation Drawer -->
    <NavDrawer v-model="drawer" />

    <!-- Main content area -->
    <v-main>
      <v-container fluid class="pa-4 pa-md-6">
        <slot />
      </v-container>
    </v-main>
  </div>
</template>

<script setup>
/**
 * App Shell — top bar with user menu + responsive nav drawer.
 */
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { useAuthStore } from '@/stores/auth.js'
import NavDrawer from '@/components/layout/NavDrawer.vue'

const authStore = useAuthStore()
const router = useRouter()
const theme = useTheme()

const drawer = ref(true)

const isDark = computed(() => theme.global.current.value.dark)

const initials = computed(() => {
  const name = authStore.profile?.full_name || ''
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'
})

const roleColor = computed(() => {
  const map = { admin: 'primary', collector: 'secondary', resident: 'accent' }
  return map[authStore.role] || 'grey'
})

function toggleTheme() {
  theme.global.name.value = isDark.value ? 'basuraLight' : 'basuraDark'
}

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>
