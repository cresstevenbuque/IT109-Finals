<template>
  <!-- Global snackbar & confirm dialog live here, above the router view -->
  <v-app>
    <!-- Show layout shell only when authenticated -->
    <AppShell v-if="authStore.isAuthenticated">
      <router-view />
    </AppShell>

    <!-- Public pages (login, register) render without the shell -->
    <router-view v-else />

    <!-- Global snackbar -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="snackbar.timeout"
      location="bottom right"
      rounded="lg"
    >
      {{ snackbar.message }}
      <template #actions>
        <v-btn variant="text" @click="hideSnackbar">Close</v-btn>
      </template>
    </v-snackbar>

    <!-- Global confirm dialog -->
    <v-dialog v-model="confirmDialog.show" max-width="440" persistent>
      <v-card>
        <v-card-title class="text-h6">{{ confirmDialog.title }}</v-card-title>
        <v-card-text>{{ confirmDialog.message }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="handleCancel">Cancel</v-btn>
          <v-btn
            :color="confirmDialog.confirmColor"
            variant="flat"
            @click="handleConfirm"
          >
            {{ confirmDialog.confirmText }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup>
/**
 * Root App component.
 * Provides the Vuetify v-app wrapper, global snackbar, and confirm dialog.
 */
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.js'
import { useSnackbar } from '@/composables/useSnackbar.js'
import { useConfirmDialog } from '@/composables/useConfirmDialog.js'
import AppShell from '@/components/layout/AppShell.vue'

const authStore = useAuthStore()
const { snackbar, hideSnackbar } = useSnackbar()
const { confirmDialog, handleConfirm, handleCancel } = useConfirmDialog()

onMounted(() => {
  authStore.initialize()
})
</script>

<style>
/* Global styles */
* {
  font-family: 'Inter', sans-serif;
}

html {
  overflow-y: auto !important;
}

/* Smooth page transitions */
.v-main {
  transition: padding 0.2s ease;
}
</style>
