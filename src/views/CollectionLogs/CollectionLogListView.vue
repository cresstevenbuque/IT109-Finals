<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">Collection Logs</h1>
        <p class="text-medium-emphasis mt-1">Track daily garbage collection status</p>
      </div>
      <v-btn v-if="isAdmin" color="primary" prepend-icon="mdi-plus" @click="openCreate">Add Log</v-btn>
    </div>

    <v-card class="mb-4 pa-4">
      <v-row>
        <v-col cols="12" md="4">
          <v-select v-model="statusFilter" :items="['', 'completed', 'delayed', 'skipped']" label="Status" clearable hide-details @update:modelValue="loadLogs">
            <template #selection="{ item }">
              <v-chip v-if="item.value" :color="statusColor(item.value)" size="small" variant="flat">{{ item.value }}</v-chip>
            </template>
          </v-select>
        </v-col>
        <v-col cols="12" md="4">
          <v-text-field v-model="dateFrom" label="From Date" type="date" hide-details @update:modelValue="loadLogs" />
        </v-col>
        <v-col cols="12" md="4">
          <v-text-field v-model="dateTo" label="To Date" type="date" hide-details @update:modelValue="loadLogs" />
        </v-col>
      </v-row>
    </v-card>

    <v-card>
      <v-data-table-server
        :headers="headers"
        :items="logs"
        :items-length="totalCount"
        :loading="loading"
        :page="page"
        :items-per-page="perPage"
        @update:page="page = $event; loadLogs()"
        @update:items-per-page="perPage = $event; page = 1; loadLogs()"
      >
        <template #item.collection_date="{ item }">
          {{ new Date(item.collection_date).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' }) }}
        </template>
        <template #item.schedule="{ item }">
          <div>{{ item.schedule?.route?.name || '—' }}</div>
          <div class="text-caption text-medium-emphasis">{{ item.schedule?.route?.purok?.name || '' }}</div>
        </template>
        <template #item.waste_type="{ item }">
          <v-chip :color="getWasteType(item.schedule?.waste_type).color" size="x-small" variant="flat">
            <v-icon start size="x-small">{{ getWasteType(item.schedule?.waste_type).icon }}</v-icon>
            {{ getWasteType(item.schedule?.waste_type).label }}
          </v-chip>
        </template>
        <template #item.status="{ item }">
          <v-chip :color="statusColor(item.status)" size="small" variant="flat">{{ item.status }}</v-chip>
        </template>
        <template #item.logger="{ item }">
          {{ item.logger?.full_name || '—' }}
        </template>
        <template #item.actions="{ item }">
          <v-btn v-if="isAdmin" icon size="small" variant="text" color="primary" @click="openEdit(item)"><v-icon size="small">mdi-pencil</v-icon></v-btn>
          <v-btn v-if="isAdmin" icon size="small" variant="text" color="error" @click="handleDelete(item)"><v-icon size="small">mdi-delete</v-icon></v-btn>
        </template>
        <template #no-data>
          <div class="text-center py-8">
            <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-clipboard-list</v-icon>
            <p class="text-h6 text-medium-emphasis">No collection logs found</p>
          </div>
        </template>
      </v-data-table-server>
    </v-card>

    <CollectionLogFormDialog v-model="dialogOpen" :log="selectedLog" @saved="onSaved" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { fetchCollectionLogs, deleteCollectionLog } from '@/services/collectionLogService.js'
import { useAuthStore } from '@/stores/auth.js'
import { useSnackbar } from '@/composables/useSnackbar.js'
import { useConfirmDialog } from '@/composables/useConfirmDialog.js'
import { useWasteTypeColors } from '@/composables/useWasteTypeColors.js'
import CollectionLogFormDialog from '@/views/CollectionLogs/CollectionLogFormDialog.vue'

const authStore = useAuthStore()
const { showSnackbar } = useSnackbar()
const { confirm } = useConfirmDialog()
const { getWasteType } = useWasteTypeColors()

const isAdmin = computed(() => authStore.isAdmin)
const logs = ref([])
const totalCount = ref(0)
const loading = ref(false)
const statusFilter = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const page = ref(1)
const perPage = ref(10)
const dialogOpen = ref(false)
const selectedLog = ref(null)

const headers = [
  { title: 'Date', key: 'collection_date', sortable: false },
  { title: 'Route / Purok', key: 'schedule', sortable: false },
  { title: 'Waste Type', key: 'waste_type', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Notes', key: 'notes', sortable: false },
  { title: 'Logged By', key: 'logger', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end', width: '120px' },
]

function statusColor(s) {
  return { completed: 'success', delayed: 'warning', skipped: 'error' }[s] || 'grey'
}

async function loadLogs() {
  loading.value = true
  try {
    const result = await fetchCollectionLogs({ status: statusFilter.value, dateFrom: dateFrom.value, dateTo: dateTo.value, page: page.value, perPage: perPage.value })
    logs.value = result.data
    totalCount.value = result.count
  } catch (err) { showSnackbar(err.message, 'error') }
  finally { loading.value = false }
}

function openCreate() { selectedLog.value = null; dialogOpen.value = true }
function openEdit(l) { selectedLog.value = { ...l }; dialogOpen.value = true }

async function handleDelete(l) {
  const ok = await confirm({ title: 'Delete Log', message: 'Delete this collection log entry?' })
  if (!ok) return
  try { await deleteCollectionLog(l.id); showSnackbar('Log deleted'); loadLogs() }
  catch (err) { showSnackbar(err.message, 'error') }
}

function onSaved() { dialogOpen.value = false; loadLogs() }
onMounted(loadLogs)
</script>
