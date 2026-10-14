<template>
  <div>
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">Puroks</h1>
        <p class="text-medium-emphasis mt-1">Manage barangay zones and subdivisions</p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">
        Add Purok
      </v-btn>
    </div>

    <!-- Search Bar -->
    <v-card class="mb-4 pa-4">
      <v-text-field
        v-model="search"
        prepend-inner-icon="mdi-magnify"
        label="Search puroks..."
        clearable
        hide-details
        @update:modelValue="debouncedFetch"
      />
    </v-card>

    <!-- Data Table -->
    <v-card>
      <v-data-table-server
        :headers="headers"
        :items="puroks"
        :items-length="totalCount"
        :loading="loading"
        :page="page"
        :items-per-page="perPage"
        @update:page="page = $event; loadPuroks()"
        @update:items-per-page="perPage = $event; page = 1; loadPuroks()"
      >
        <!-- Coordinates column -->
        <template #item.center_lat="{ item }">
          <span v-if="item.center_lat && item.center_lng" class="text-caption">
            {{ item.center_lat?.toFixed(4) }}, {{ item.center_lng?.toFixed(4) }}
          </span>
          <v-chip v-else size="x-small" color="warning" variant="tonal">Not set</v-chip>
        </template>

        <!-- Actions column -->
        <template #item.actions="{ item }">
          <v-btn icon size="small" variant="text" color="primary" @click="openEdit(item)">
            <v-icon size="small">mdi-pencil</v-icon>
          </v-btn>
          <v-btn icon size="small" variant="text" color="error" @click="handleDelete(item)">
            <v-icon size="small">mdi-delete</v-icon>
          </v-btn>
        </template>

        <!-- Empty state -->
        <template #no-data>
          <div class="text-center py-8">
            <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-map-marker-radius</v-icon>
            <p class="text-h6 text-medium-emphasis">No puroks found</p>
            <p class="text-body-2 text-medium-emphasis mb-4">Get started by adding your first purok</p>
            <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">Add Purok</v-btn>
          </div>
        </template>
      </v-data-table-server>
    </v-card>

    <!-- Create/Edit Dialog -->
    <PurokFormDialog
      v-model="dialogOpen"
      :purok="selectedPurok"
      @saved="onSaved"
    />
  </div>
</template>

<script setup>
/**
 * Purok list view — full CRUD with search, pagination, and table.
 */
import { ref, onMounted } from 'vue'
import { fetchPuroks, deletePurok } from '@/services/purokService.js'
import { useSnackbar } from '@/composables/useSnackbar.js'
import { useConfirmDialog } from '@/composables/useConfirmDialog.js'
import PurokFormDialog from '@/views/Puroks/PurokFormDialog.vue'

const { showSnackbar } = useSnackbar()
const { confirm } = useConfirmDialog()

const puroks = ref([])
const totalCount = ref(0)
const loading = ref(false)
const search = ref('')
const page = ref(1)
const perPage = ref(10)

const dialogOpen = ref(false)
const selectedPurok = ref(null)

const headers = [
  { title: 'Name', key: 'name', sortable: false },
  { title: 'Description', key: 'description', sortable: false },
  { title: 'Coordinates', key: 'center_lat', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end', width: '120px' },
]

/** Debounce helper for search */
let searchTimeout
function debouncedFetch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    page.value = 1
    loadPuroks()
  }, 400)
}

async function loadPuroks() {
  loading.value = true
  try {
    const result = await fetchPuroks({
      search: search.value,
      page: page.value,
      perPage: perPage.value,
    })
    puroks.value = result.data
    totalCount.value = result.count
  } catch (err) {
    showSnackbar(err.message, 'error')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  selectedPurok.value = null
  dialogOpen.value = true
}

function openEdit(purok) {
  selectedPurok.value = { ...purok }
  dialogOpen.value = true
}

async function handleDelete(purok) {
  const ok = await confirm({
    title: 'Delete Purok',
    message: `Are you sure you want to delete "${purok.name}"? This will unlink any associated routes and residents.`,
  })
  if (!ok) return

  try {
    await deletePurok(purok.id)
    showSnackbar('Purok deleted successfully')
    loadPuroks()
  } catch (err) {
    showSnackbar(err.message, 'error')
  }
}

function onSaved() {
  dialogOpen.value = false
  loadPuroks()
}

onMounted(loadPuroks)
</script>
