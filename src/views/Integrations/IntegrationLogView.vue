<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">API Integrations</h1>
        <p class="text-medium-emphasis mt-1">Audit log of all third-party API calls for demo and debugging</p>
      </div>
      <v-btn variant="tonal" color="primary" prepend-icon="mdi-refresh" @click="loadLogs">Refresh</v-btn>
    </div>

    <v-card class="mb-4 pa-4">
      <v-row>
        <v-col cols="12" md="4">
          <v-select v-model="serviceFilter" :items="['', 'semaphore', 'nominatim', 'openweather', 'resend']" label="Service" clearable hide-details @update:modelValue="loadLogs" />
        </v-col>
        <v-col cols="12" md="4">
          <v-select v-model="statusFilter" :items="['', 'success', 'error', 'pending']" label="Status" clearable hide-details @update:modelValue="loadLogs">
            <template #selection="{ item }">
              <v-chip v-if="item.value" :color="logStatusColor(item.value)" size="small" variant="flat">{{ item.value }}</v-chip>
            </template>
          </v-select>
        </v-col>
        <v-col cols="12" md="4" class="d-flex align-center">
          <v-chip class="mr-2" color="success" variant="tonal" size="small">{{ stats.success }} success</v-chip>
          <v-chip class="mr-2" color="error" variant="tonal" size="small">{{ stats.error }} errors</v-chip>
          <v-chip color="warning" variant="tonal" size="small">{{ stats.pending }} pending</v-chip>
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
        <template #item.service="{ item }">
          <v-chip :color="serviceColor(item.service)" size="small" variant="tonal">
            <v-icon start size="x-small">{{ serviceIcon(item.service) }}</v-icon>
            {{ item.service }}
          </v-chip>
        </template>
        <template #item.status="{ item }">
          <v-chip :color="logStatusColor(item.status)" size="small" variant="flat">{{ item.status }}</v-chip>
        </template>
        <template #item.created_at="{ item }">
          {{ new Date(item.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
        </template>
        <template #item.request_payload="{ item }">
          <v-btn size="x-small" variant="text" @click="showPayload('Request', item.request_payload)">View</v-btn>
        </template>
        <template #item.response_payload="{ item }">
          <v-btn size="x-small" variant="text" @click="showPayload('Response', item.response_payload)">View</v-btn>
        </template>
        <template #item.error="{ item }">
          <span v-if="item.error" class="text-error text-caption">{{ item.error }}</span>
          <span v-else class="text-caption text-medium-emphasis">—</span>
        </template>
      </v-data-table-server>
    </v-card>

    <!-- JSON Viewer Dialog -->
    <v-dialog v-model="payloadDialog" max-width="600">
      <v-card>
        <v-card-title>{{ payloadTitle }}</v-card-title>
        <v-card-text>
          <pre class="text-caption pa-3 rounded-lg" style="background: rgba(0,0,0,0.05); overflow-x: auto; max-height: 400px;">{{ payloadJson }}</pre>
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn @click="payloadDialog = false">Close</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { fetchIntegrationLogs } from '@/services/integrationLogService.js'
import { useSnackbar } from '@/composables/useSnackbar.js'

const { showSnackbar } = useSnackbar()

const logs = ref([])
const totalCount = ref(0)
const loading = ref(false)
const serviceFilter = ref('')
const statusFilter = ref('')
const page = ref(1)
const perPage = ref(15)
const payloadDialog = ref(false)
const payloadTitle = ref('')
const payloadJson = ref('')
const stats = reactive({ success: 0, error: 0, pending: 0 })

const headers = [
  { title: 'Time', key: 'created_at', sortable: false, width: '140px' },
  { title: 'Service', key: 'service', sortable: false },
  { title: 'Action', key: 'action', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Request', key: 'request_payload', sortable: false },
  { title: 'Response', key: 'response_payload', sortable: false },
  { title: 'Error', key: 'error', sortable: false },
]

function logStatusColor(s) { return { success: 'success', error: 'error', pending: 'warning' }[s] || 'grey' }
function serviceColor(s) { return { semaphore: 'blue', nominatim: 'green', openweather: 'orange', resend: 'purple' }[s] || 'grey' }
function serviceIcon(s) { return { semaphore: 'mdi-message-text', nominatim: 'mdi-map-search', openweather: 'mdi-weather-cloudy', resend: 'mdi-email' }[s] || 'mdi-api' }

function showPayload(title, payload) {
  payloadTitle.value = title
  payloadJson.value = JSON.stringify(payload, null, 2)
  payloadDialog.value = true
}

async function loadLogs() {
  loading.value = true
  try {
    const result = await fetchIntegrationLogs({ service: serviceFilter.value, status: statusFilter.value, page: page.value, perPage: perPage.value })
    logs.value = result.data
    totalCount.value = result.count
    stats.success = result.data.filter(l => l.status === 'success').length
    stats.error = result.data.filter(l => l.status === 'error').length
    stats.pending = result.data.filter(l => l.status === 'pending').length
  } catch (err) { showSnackbar(err.message, 'error') }
  finally { loading.value = false }
}

onMounted(loadLogs)
</script>
