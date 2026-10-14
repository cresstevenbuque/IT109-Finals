<template>
  <v-navigation-drawer
    :modelValue="modelValue"
    @update:modelValue="$emit('update:modelValue', $event)"
    color="surface"
    elevation="1"
  >
    <!-- Branding -->
    <v-list-item class="py-4 px-4">
      <template #prepend>
        <v-avatar color="primary" size="42">
          <v-icon color="white">mdi-recycle</v-icon>
        </v-avatar>
      </template>
      <v-list-item-title class="text-h6 font-weight-bold text-primary">
        BasuraTrack
      </v-list-item-title>
      <v-list-item-subtitle class="text-caption">
        Collection Scheduler
      </v-list-item-subtitle>
    </v-list-item>

    <v-divider class="mb-2" />

    <!-- Navigation items, filtered by role -->
    <v-list nav density="comfortable">
      <template v-for="item in visibleItems" :key="item.to">
        <!-- Section header -->
        <v-list-subheader v-if="item.header" class="text-uppercase mt-2">
          {{ item.header }}
        </v-list-subheader>

        <v-list-item
          :to="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
          rounded="lg"
          class="mb-1"
          active-class="bg-primary text-white"
        />
      </template>
    </v-list>
  </v-navigation-drawer>
</template>

<script setup>
/**
 * Role-based navigation drawer.
 * Shows different menu items based on the authenticated user's role.
 */
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth.js'

defineProps({
  modelValue: Boolean,
})

defineEmits(['update:modelValue'])

const authStore = useAuthStore()

/** All navigation items with role-based visibility */
const navItems = [
  // Admin items
  { to: '/', icon: 'mdi-view-dashboard', title: 'Dashboard', roles: ['admin'], header: 'Overview' },

  // Resident home
  { to: '/home', icon: 'mdi-home', title: 'My Home', roles: ['resident'], header: 'My Area' },

  // Collector home
  { to: '/collector/today', icon: 'mdi-clipboard-check', title: "Today's Routes", roles: ['collector'], header: 'My Tasks' },

  // Management
  { to: '/puroks', icon: 'mdi-map-marker-radius', title: 'Puroks', roles: ['admin'], header: 'Management' },
  { to: '/trucks', icon: 'mdi-truck', title: 'Trucks & Crew', roles: ['admin'] },
  { to: '/routes', icon: 'mdi-routes', title: 'Routes & Stops', roles: ['admin'] },
  { to: '/schedules', icon: 'mdi-calendar-clock', title: 'Schedules', roles: ['admin'] },
  { to: '/residents', icon: 'mdi-account-group', title: 'Residents', roles: ['admin'] },

  // Operations
  { to: '/collection-logs', icon: 'mdi-clipboard-list', title: 'Collection Logs', roles: ['admin', 'collector'], header: 'Operations' },
  { to: '/missed-pickups', icon: 'mdi-alert-circle', title: 'Missed Pickups', roles: ['admin', 'resident'] },
  { to: '/announcements', icon: 'mdi-bullhorn', title: 'Announcements', roles: ['admin', 'resident'] },

  // System
  { to: '/integrations', icon: 'mdi-api', title: 'API Integrations', roles: ['admin'], header: 'System' },
]

const visibleItems = computed(() =>
  navItems.filter((item) => item.roles.includes(authStore.role))
)
</script>
