<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">Routes & Stops</h1>
        <p class="text-medium-emphasis mt-1">Manage collection routes and their stops on the map</p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">Add Route</v-btn>
    </div>

    <v-card class="mb-4 pa-4">
      <v-row>
        <v-col cols="12" md="6">
          <v-text-field v-model="search" prepend-inner-icon="mdi-magnify" label="Search routes..." clearable hide-details @update:modelValue="debouncedFetch" />
        </v-col>
        <v-col cols="12" md="6">
          <v-select v-model="purokFilter" :items="purokOptions" label="Filter by Purok" clearable hide-details item-title="name" item-value="id" @update:modelValue="loadRoutes" />
        </v-col>
      </v-row>
    </v-card>

    <v-card>
      <v-data-table-server
        :headers="headers"
        :items="routes"
        :items-length="totalCount"
        :loading="loading"
        :page="page"
        :items-per-page="perPage"
        @update:page="page = $event; loadRoutes()"
        @update:items-per-page="perPage = $event; page = 1; loadRoutes()"
      >
        <template #item.color="{ item }">
          <v-avatar :color="item.color" size="24" class="mr-2" />
        </template>

        <template #item.purok="{ item }">
          {{ item.purok?.name || '—' }}
        </template>

        <template #item.truck="{ item }">
          {{ item.truck?.plate_no || '—' }}
        </template>

        <template #item.collector="{ item }">
          {{ item.collector?.full_name || '—' }}
        </template>

        <template #item.actions="{ item }">
          <v-btn icon size="small" variant="text" color="info" :to="`/routes/${item.id}/map`" title="Edit on Map">
            <v-icon size="small">mdi-map</v-icon>
          </v-btn>
          <v-btn icon size="small" variant="text" color="primary" @click="openEdit(item)">
            <v-icon size="small">mdi-pencil</v-icon>
          </v-btn>
          <v-btn icon size="small" variant="text" color="error" @click="handleDelete(item)">
            <v-icon size="small">mdi-delete</v-icon>
          </v-btn>
        </template>

        <template #no-data>
          <div class="text-center py-8">
            <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-routes</v-icon>
            <p class="text-h6 text-medium-emphasis">No routes found</p>
            <v-btn color="primary" prepend-icon="mdi-plus" class="mt-4" @click="openCreate">Add Route</v-btn>
          </div>
        </template>
      </v-data-table-server>
    </v-card>

    <RouteFormDialog v-model="dialogOpen" :route="selectedRoute" :puroks="purokOptions" @saved="onSaved" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { fetchRoutes, deleteRoute } from '@/services/routeService.js'
import { fetchPuroks } from '@/services/purokService.js'
import { useSnackbar } from '@/composables/useSnackbar.js'
import { useConfirmDialog } from '@/composables/useConfirmDialog.js'
import RouteFormDialog from '@/views/Routes/RouteFormDialog.vue'

const { showSnackbar } = useSnackbar()
const { confirm } = useConfirmDialog()

const routes = ref([])
const totalCount = ref(0)
const loading = ref(false)
const search = ref('')
const purokFilter = ref(null)
const page = ref(1)
const perPage = ref(10)
const dialogOpen = ref(false)
const selectedRoute = ref(null)
const purokOptions = ref([])

const headers = [
  { title: '', key: 'color', sortable: false, width: '40px' },
  { title: 'Route Name', key: 'name', sortable: false },
  { title: 'Purok', key: 'purok', sortable: false },
  { title: 'Truck', key: 'truck', sortable: false },
  { title: 'Collector', key: 'collector', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end', width: '160px' },
]

let searchTimeout
function debouncedFetch() { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => { page.value = 1; loadRoutes() }, 400) }

async function loadRoutes() {
  loading.value = true
  try {
    const result = await fetchRoutes({ search: search.value, purokId: purokFilter.value || '', page: page.value, perPage: perPage.value })
    routes.value = result.data
    totalCount.value = result.count
  } catch (err) { showSnackbar(err.message, 'error') }
  finally { loading.value = false }
}

async function loadPuroks() {
  try {
    const { data } = await fetchPuroks({ perPage: 100 })
    purokOptions.value = data
  } catch (err) { console.error(err) }
}

function openCreate() { selectedRoute.value = null; dialogOpen.value = true }
function openEdit(r) { selectedRoute.value = { ...r }; dialogOpen.value = true }

async function handleDelete(r) {
  const ok = await confirm({ title: 'Delete Route', message: `Delete route "${r.name}"? All stops and schedules for this route will also be deleted.` })
  if (!ok) return
  try { await deleteRoute(r.id); showSnackbar('Route deleted'); loadRoutes() }
  catch (err) { showSnackbar(err.message, 'error') }
}

function onSaved() { dialogOpen.value = false; loadRoutes() }

onMounted(() => { loadRoutes(); loadPuroks() })
</script>
