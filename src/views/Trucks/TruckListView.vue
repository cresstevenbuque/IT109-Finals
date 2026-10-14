<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">Trucks & Crew</h1>
        <p class="text-medium-emphasis mt-1">Manage garbage trucks and assign collectors</p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">Add Truck</v-btn>
    </div>

    <!-- Filters -->
    <v-card class="mb-4 pa-4">
      <v-row>
        <v-col cols="12" md="6">
          <v-text-field v-model="search" prepend-inner-icon="mdi-magnify" label="Search by plate no..." clearable hide-details @update:modelValue="debouncedFetch" />
        </v-col>
        <v-col cols="12" md="6">
          <v-select v-model="statusFilter" :items="['', 'active', 'maintenance']" label="Status" clearable hide-details @update:modelValue="loadTrucks">
            <template #selection="{ item }">
              <v-chip v-if="item.value" :color="item.value === 'active' ? 'success' : 'warning'" size="small" variant="flat">{{ item.value }}</v-chip>
            </template>
          </v-select>
        </v-col>
      </v-row>
    </v-card>

    <v-card>
      <v-data-table-server
        :headers="headers"
        :items="trucks"
        :items-length="totalCount"
        :loading="loading"
        :page="page"
        :items-per-page="perPage"
        @update:page="page = $event; loadTrucks()"
        @update:items-per-page="perPage = $event; page = 1; loadTrucks()"
      >
        <template #item.status="{ item }">
          <v-chip :color="item.status === 'active' ? 'success' : 'warning'" size="small" variant="flat">
            {{ item.status }}
          </v-chip>
        </template>

        <template #item.actions="{ item }">
          <v-btn icon size="small" variant="text" color="primary" @click="openEdit(item)">
            <v-icon size="small">mdi-pencil</v-icon>
          </v-btn>
          <v-btn icon size="small" variant="text" color="error" @click="handleDelete(item)">
            <v-icon size="small">mdi-delete</v-icon>
          </v-btn>
        </template>

        <template #no-data>
          <div class="text-center py-8">
            <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-truck</v-icon>
            <p class="text-h6 text-medium-emphasis">No trucks found</p>
            <v-btn color="primary" prepend-icon="mdi-plus" class="mt-4" @click="openCreate">Add Truck</v-btn>
          </div>
        </template>
      </v-data-table-server>
    </v-card>

    <TruckFormDialog v-model="dialogOpen" :truck="selectedTruck" @saved="onSaved" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { fetchTrucks, deleteTruck } from '@/services/truckService.js'
import { useSnackbar } from '@/composables/useSnackbar.js'
import { useConfirmDialog } from '@/composables/useConfirmDialog.js'
import TruckFormDialog from '@/views/Trucks/TruckFormDialog.vue'

const { showSnackbar } = useSnackbar()
const { confirm } = useConfirmDialog()

const trucks = ref([])
const totalCount = ref(0)
const loading = ref(false)
const search = ref('')
const statusFilter = ref('')
const page = ref(1)
const perPage = ref(10)
const dialogOpen = ref(false)
const selectedTruck = ref(null)

const headers = [
  { title: 'Plate No.', key: 'plate_no', sortable: false },
  { title: 'Capacity', key: 'capacity', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end', width: '120px' },
]

let searchTimeout
function debouncedFetch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => { page.value = 1; loadTrucks() }, 400)
}

async function loadTrucks() {
  loading.value = true
  try {
    const result = await fetchTrucks({ search: search.value, status: statusFilter.value, page: page.value, perPage: perPage.value })
    trucks.value = result.data
    totalCount.value = result.count
  } catch (err) { showSnackbar(err.message, 'error') }
  finally { loading.value = false }
}

function openCreate() { selectedTruck.value = null; dialogOpen.value = true }
function openEdit(t) { selectedTruck.value = { ...t }; dialogOpen.value = true }

async function handleDelete(t) {
  const ok = await confirm({ title: 'Delete Truck', message: `Delete truck "${t.plate_no}"? This will unlink any assigned routes.` })
  if (!ok) return
  try { await deleteTruck(t.id); showSnackbar('Truck deleted'); loadTrucks() }
  catch (err) { showSnackbar(err.message, 'error') }
}

function onSaved() { dialogOpen.value = false; loadTrucks() }
onMounted(loadTrucks)
</script>
