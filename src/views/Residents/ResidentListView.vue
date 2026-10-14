<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">Residents</h1>
        <p class="text-medium-emphasis mt-1">Manage resident profiles and purok assignments</p>
      </div>
      <v-btn variant="tonal" color="primary" prepend-icon="mdi-download" @click="exportCSV">Export CSV</v-btn>
    </div>

    <v-card class="mb-4 pa-4">
      <v-row>
        <v-col cols="12" md="6">
          <v-text-field v-model="search" prepend-inner-icon="mdi-magnify" label="Search residents..." clearable hide-details @update:modelValue="debouncedFetch" />
        </v-col>
        <v-col cols="12" md="6">
          <v-select v-model="purokFilter" :items="purokOptions" label="Filter by Purok" clearable hide-details item-title="name" item-value="id" @update:modelValue="loadResidents" />
        </v-col>
      </v-row>
    </v-card>

    <v-card>
      <v-data-table-server
        :headers="headers"
        :items="residents"
        :items-length="totalCount"
        :loading="loading"
        :page="page"
        :items-per-page="perPage"
        @update:page="page = $event; loadResidents()"
        @update:items-per-page="perPage = $event; page = 1; loadResidents()"
      >
        <template #item.purok="{ item }">
          {{ item.purok?.name || '—' }}
        </template>
        <template #item.phone="{ item }">
          {{ item.phone || '—' }}
        </template>
        <template #item.coords="{ item }">
          <v-chip v-if="item.lat && item.lng" size="x-small" color="success" variant="tonal">
            <v-icon start size="x-small">mdi-map-marker</v-icon>Pinned
          </v-chip>
          <span v-else class="text-caption text-medium-emphasis">Not set</span>
        </template>
        <template #item.actions="{ item }">
          <v-btn icon size="small" variant="text" color="primary" @click="openEdit(item)"><v-icon size="small">mdi-pencil</v-icon></v-btn>
        </template>
        <template #no-data>
          <div class="text-center py-8">
            <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-account-group</v-icon>
            <p class="text-h6 text-medium-emphasis">No residents found</p>
          </div>
        </template>
      </v-data-table-server>
    </v-card>

    <ResidentFormDialog v-model="dialogOpen" :resident="selectedResident" :puroks="purokOptions" @saved="onSaved" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { fetchResidents } from '@/services/residentService.js'
import { fetchPuroks } from '@/services/purokService.js'
import { useSnackbar } from '@/composables/useSnackbar.js'
import Papa from 'papaparse'
import ResidentFormDialog from '@/views/Residents/ResidentFormDialog.vue'

const { showSnackbar } = useSnackbar()
const residents = ref([])
const totalCount = ref(0)
const loading = ref(false)
const search = ref('')
const purokFilter = ref(null)
const page = ref(1)
const perPage = ref(10)
const dialogOpen = ref(false)
const selectedResident = ref(null)
const purokOptions = ref([])

const headers = [
  { title: 'Full Name', key: 'full_name', sortable: false },
  { title: 'Phone', key: 'phone', sortable: false },
  { title: 'Address', key: 'address', sortable: false },
  { title: 'Purok', key: 'purok', sortable: false },
  { title: 'Location', key: 'coords', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end', width: '80px' },
]

let searchTimeout
function debouncedFetch() { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => { page.value = 1; loadResidents() }, 400) }

async function loadResidents() {
  loading.value = true
  try {
    const result = await fetchResidents({ search: search.value, purokId: purokFilter.value || '', page: page.value, perPage: perPage.value })
    residents.value = result.data
    totalCount.value = result.count
  } catch (err) { showSnackbar(err.message, 'error') }
  finally { loading.value = false }
}

function openEdit(r) { selectedResident.value = { ...r }; dialogOpen.value = true }
function onSaved() { dialogOpen.value = false; loadResidents() }

function exportCSV() {
  const csv = Papa.unparse(residents.value.map(r => ({
    Name: r.full_name, Phone: r.phone || '', Address: r.address || '',
    Purok: r.purok?.name || '', Lat: r.lat || '', Lng: r.lng || '',
  })))
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'residents.csv'; a.click()
  URL.revokeObjectURL(url)
  showSnackbar('CSV exported')
}

onMounted(async () => {
  loadResidents()
  try { const { data } = await fetchPuroks({ perPage: 100 }); purokOptions.value = data } catch (_) {}
})
</script>
