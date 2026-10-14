<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">Announcements</h1>
        <p class="text-medium-emphasis mt-1">{{ isAdmin ? 'Create and broadcast announcements' : 'Latest updates from your barangay' }}</p>
      </div>
      <v-btn v-if="isAdmin" color="primary" prepend-icon="mdi-plus" @click="openCreate">New Announcement</v-btn>
    </div>

    <v-card class="mb-4 pa-4" v-if="isAdmin">
      <v-row>
        <v-col cols="12" md="6">
          <v-text-field v-model="search" prepend-inner-icon="mdi-magnify" label="Search..." clearable hide-details @update:modelValue="debouncedFetch" />
        </v-col>
        <v-col cols="12" md="6">
          <v-select v-model="purokFilter" :items="purokOptions" label="Purok" clearable hide-details item-title="name" item-value="id" @update:modelValue="loadAnnouncements" />
        </v-col>
      </v-row>
    </v-card>

    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />

    <!-- Cards layout for announcements -->
    <div v-if="announcements.length === 0 && !loading" class="text-center py-12">
      <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-bullhorn-outline</v-icon>
      <p class="text-h6 text-medium-emphasis">No announcements yet</p>
    </div>

    <v-row>
      <v-col v-for="a in announcements" :key="a.id" cols="12" md="6">
        <v-card class="pa-4">
          <div class="d-flex align-center mb-2">
            <v-avatar color="primary" size="36" class="mr-3">
              <v-icon color="white" size="small">mdi-bullhorn</v-icon>
            </v-avatar>
            <div class="flex-grow-1">
              <h3 class="text-subtitle-1 font-weight-bold">{{ a.title }}</h3>
              <p class="text-caption text-medium-emphasis">
                {{ new Date(a.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) }}
                <span v-if="a.purok?.name"> • {{ a.purok.name }}</span>
                <span v-else> • All Puroks</span>
              </p>
            </div>
            <v-chip v-if="a.sms_sent" size="x-small" color="success" variant="tonal">
              <v-icon start size="x-small">mdi-message-text</v-icon>SMS Sent
            </v-chip>
          </div>

          <p class="text-body-2 mb-3" style="white-space: pre-line;">{{ a.body }}</p>

          <div v-if="isAdmin" class="d-flex ga-2">
            <v-btn size="small" variant="tonal" color="primary" @click="openEdit(a)">
              <v-icon start size="small">mdi-pencil</v-icon>Edit
            </v-btn>
            <v-btn size="small" variant="tonal" color="error" @click="handleDelete(a)">
              <v-icon start size="small">mdi-delete</v-icon>Delete
            </v-btn>
            <v-spacer />
            <v-btn v-if="!a.sms_sent" size="small" variant="tonal" color="info" @click="sendSMS(a)">
              <v-icon start size="small">mdi-message-text</v-icon>Send SMS
            </v-btn>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Pagination -->
    <div class="d-flex justify-center mt-4" v-if="totalCount > perPage">
      <v-pagination v-model="page" :length="Math.ceil(totalCount / perPage)" rounded @update:modelValue="loadAnnouncements" />
    </div>

    <AnnouncementFormDialog v-model="dialogOpen" :announcement="selectedAnnouncement" :puroks="purokOptions" @saved="onSaved" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { fetchAnnouncements, deleteAnnouncement, updateAnnouncement } from '@/services/announcementService.js'
import { fetchPuroks } from '@/services/purokService.js'
import { useAuthStore } from '@/stores/auth.js'
import { useSnackbar } from '@/composables/useSnackbar.js'
import { useConfirmDialog } from '@/composables/useConfirmDialog.js'
import { supabase } from '@/services/supabaseClient.js'
import AnnouncementFormDialog from '@/views/Announcements/AnnouncementFormDialog.vue'

const authStore = useAuthStore()
const { showSnackbar } = useSnackbar()
const { confirm } = useConfirmDialog()

const isAdmin = computed(() => authStore.isAdmin)
const announcements = ref([])
const totalCount = ref(0)
const loading = ref(false)
const search = ref('')
const purokFilter = ref(null)
const page = ref(1)
const perPage = ref(10)
const dialogOpen = ref(false)
const selectedAnnouncement = ref(null)
const purokOptions = ref([])

let searchTimeout
function debouncedFetch() { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => { page.value = 1; loadAnnouncements() }, 400) }

async function loadAnnouncements() {
  loading.value = true
  try {
    const result = await fetchAnnouncements({ search: search.value, purokId: purokFilter.value || '', page: page.value, perPage: perPage.value })
    announcements.value = result.data
    totalCount.value = result.count
  } catch (err) { showSnackbar(err.message, 'error') }
  finally { loading.value = false }
}

function openCreate() { selectedAnnouncement.value = null; dialogOpen.value = true }
function openEdit(a) { selectedAnnouncement.value = { ...a }; dialogOpen.value = true }

async function handleDelete(a) {
  const ok = await confirm({ title: 'Delete Announcement', message: `Delete "${a.title}"?` })
  if (!ok) return
  try { await deleteAnnouncement(a.id); showSnackbar('Announcement deleted'); loadAnnouncements() }
  catch (err) { showSnackbar(err.message, 'error') }
}

async function sendSMS(a) {
  try {
    const { data, error } = await supabase.functions.invoke('send-sms', {
      body: { type: 'announcement', announcement_id: a.id, purok_id: a.purok_id, title: a.title, body: a.body },
    })
    if (error) throw error
    await updateAnnouncement(a.id, { sms_sent: true })
    a.sms_sent = true
    showSnackbar('SMS broadcast sent!', 'success')
  } catch (err) {
    showSnackbar(`SMS failed: ${err.message}`, 'error')
  }
}

function onSaved() { dialogOpen.value = false; loadAnnouncements() }

onMounted(async () => {
  loadAnnouncements()
  try { const { data } = await fetchPuroks({ perPage: 100 }); purokOptions.value = data } catch (_) {}
})
</script>
