<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">Missed Pickup Reports</h1>
        <p class="text-medium-emphasis mt-1">{{ isAdmin ? 'Manage resident reports' : 'Report and track missed collections' }}</p>
      </div>
      <v-btn v-if="isResident" color="primary" prepend-icon="mdi-plus" @click="openCreate">Report Missed Pickup</v-btn>
    </div>

    <v-card class="mb-4 pa-4">
      <v-select v-model="statusFilter" :items="['', 'open', 'in_progress', 'resolved']" label="Filter by Status" clearable hide-details @update:modelValue="loadReports">
        <template #selection="{ item }">
          <v-chip v-if="item.value" :color="rpStatusColor(item.value)" size="small" variant="flat">{{ item.value.replace('_', ' ') }}</v-chip>
        </template>
      </v-select>
    </v-card>

    <v-card>
      <v-data-table-server
        :headers="headers"
        :items="reports"
        :items-length="totalCount"
        :loading="loading"
        :page="page"
        :items-per-page="perPage"
        @update:page="page = $event; loadReports()"
        @update:items-per-page="perPage = $event; page = 1; loadReports()"
      >
        <template #item.report_date="{ item }">
          {{ new Date(item.report_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) }}
        </template>
        <template #item.resident="{ item }">
          {{ item.resident?.full_name || '—' }}
        </template>
        <template #item.purok="{ item }">
          {{ item.purok?.name || '—' }}
        </template>
        <template #item.status="{ item }">
          <v-chip :color="rpStatusColor(item.status)" size="small" variant="flat">{{ item.status.replace('_', ' ') }}</v-chip>
        </template>
        <template #item.photo_url="{ item }">
          <v-avatar v-if="item.photo_url" size="36" rounded="lg" class="cursor-pointer" @click="previewPhoto = item.photo_url">
            <v-img :src="item.photo_url" cover />
          </v-avatar>
          <span v-else class="text-caption text-medium-emphasis">—</span>
        </template>
        <template #item.actions="{ item }">
          <v-btn icon size="small" variant="text" color="primary" @click="openEdit(item)"><v-icon size="small">mdi-pencil</v-icon></v-btn>
          <v-btn v-if="isAdmin || (isResident && item.status === 'open')" icon size="small" variant="text" color="error" @click="handleDelete(item)"><v-icon size="small">mdi-delete</v-icon></v-btn>
        </template>
        <template #no-data>
          <div class="text-center py-8">
            <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-alert-circle-outline</v-icon>
            <p class="text-h6 text-medium-emphasis">No missed pickup reports</p>
          </div>
        </template>
      </v-data-table-server>
    </v-card>

    <!-- Photo preview -->
    <v-dialog v-model="showPreview" max-width="600">
      <v-card>
        <v-img :src="previewPhoto" max-height="500" contain />
        <v-card-actions><v-spacer /><v-btn @click="showPreview = false">Close</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <MissedPickupFormDialog v-model="dialogOpen" :report="selectedReport" :is-admin="isAdmin" @saved="onSaved" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { fetchMissedPickups, deleteMissedPickup } from '@/services/missedPickupService.js'
import { useAuthStore } from '@/stores/auth.js'
import { useSnackbar } from '@/composables/useSnackbar.js'
import { useConfirmDialog } from '@/composables/useConfirmDialog.js'
import MissedPickupFormDialog from '@/views/MissedPickups/MissedPickupFormDialog.vue'

const authStore = useAuthStore()
const { showSnackbar } = useSnackbar()
const { confirm } = useConfirmDialog()

const isAdmin = computed(() => authStore.isAdmin)
const isResident = computed(() => authStore.isResident)
const reports = ref([])
const totalCount = ref(0)
const loading = ref(false)
const statusFilter = ref('')
const page = ref(1)
const perPage = ref(10)
const dialogOpen = ref(false)
const selectedReport = ref(null)
const previewPhoto = ref('')
const showPreview = ref(false)

watch(previewPhoto, (v) => { if (v) showPreview.value = true })

const headers = [
  { title: 'Date', key: 'report_date', sortable: false },
  { title: 'Resident', key: 'resident', sortable: false },
  { title: 'Purok', key: 'purok', sortable: false },
  { title: 'Description', key: 'description', sortable: false },
  { title: 'Photo', key: 'photo_url', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end', width: '120px' },
]

function rpStatusColor(s) {
  return { open: 'error', in_progress: 'warning', resolved: 'success' }[s] || 'grey'
}

async function loadReports() {
  loading.value = true
  try {
    const opts = { status: statusFilter.value, page: page.value, perPage: perPage.value }
    if (isResident.value) opts.residentId = authStore.user?.id
    const result = await fetchMissedPickups(opts)
    reports.value = result.data
    totalCount.value = result.count
  } catch (err) { showSnackbar(err.message, 'error') }
  finally { loading.value = false }
}

function openCreate() { selectedReport.value = null; dialogOpen.value = true }
function openEdit(r) { selectedReport.value = { ...r }; dialogOpen.value = true }

async function handleDelete(r) {
  const ok = await confirm({ title: 'Delete Report', message: 'Delete this missed pickup report?' })
  if (!ok) return
  try { await deleteMissedPickup(r.id); showSnackbar('Report deleted'); loadReports() }
  catch (err) { showSnackbar(err.message, 'error') }
}

function onSaved() { dialogOpen.value = false; loadReports() }
onMounted(loadReports)
</script>
