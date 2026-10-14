<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">Schedules</h1>
        <p class="text-medium-emphasis mt-1">Weekly collection schedule by waste type</p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">Add Schedule</v-btn>
    </div>

    <!-- Filters -->
    <v-card class="mb-4 pa-4">
      <v-row align="center">
        <v-col cols="12" md="6">
          <v-select v-model="wasteFilter" :items="wasteOptions" label="Waste Type" clearable hide-details @update:modelValue="loadSchedules">
            <template #item="{ item, props: p }">
              <v-list-item v-bind="p">
                <template #prepend>
                  <v-icon :color="getWasteType(item.value).color" size="small">{{ getWasteType(item.value).icon }}</v-icon>
                </template>
              </v-list-item>
            </template>
          </v-select>
        </v-col>
        <v-col cols="12" md="6">
          <v-btn-toggle v-model="viewMode" density="compact" mandatory class="mt-1">
            <v-btn value="calendar" size="small"><v-icon>mdi-calendar</v-icon></v-btn>
            <v-btn value="table" size="small"><v-icon>mdi-table</v-icon></v-btn>
          </v-btn-toggle>
        </v-col>
      </v-row>
    </v-card>

    <!-- Table View -->
    <v-card v-if="viewMode === 'table'">
      <v-data-table-server
        :headers="headers"
        :items="schedules"
        :items-length="totalCount"
        :loading="loading"
        :page="page"
        :items-per-page="perPage"
        @update:page="page = $event; loadSchedules()"
        @update:items-per-page="perPage = $event; page = 1; loadSchedules()"
      >
        <template #item.waste_type="{ item }">
          <v-chip :color="getWasteType(item.waste_type).color" size="small" variant="flat">
            <v-icon start size="small">{{ getWasteType(item.waste_type).icon }}</v-icon>
            {{ getWasteType(item.waste_type).label }}
          </v-chip>
        </template>

        <template #item.day_of_week="{ item }">
          {{ dayNames[item.day_of_week] }}
        </template>

        <template #item.route="{ item }">
          {{ item.route?.name || '—' }}
          <span v-if="item.route?.purok?.name" class="text-caption text-medium-emphasis ml-1">({{ item.route.purok.name }})</span>
        </template>

        <template #item.time="{ item }">
          {{ item.start_time?.slice(0,5) }} – {{ item.end_time?.slice(0,5) }}
        </template>

        <template #item.active="{ item }">
          <v-chip :color="item.active ? 'success' : 'grey'" size="x-small" variant="flat">
            {{ item.active ? 'Active' : 'Inactive' }}
          </v-chip>
        </template>

        <template #item.actions="{ item }">
          <v-btn icon size="small" variant="text" color="primary" @click="openEdit(item)"><v-icon size="small">mdi-pencil</v-icon></v-btn>
          <v-btn icon size="small" variant="text" color="error" @click="handleDelete(item)"><v-icon size="small">mdi-delete</v-icon></v-btn>
        </template>

        <template #no-data>
          <div class="text-center py-8">
            <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-calendar-clock</v-icon>
            <p class="text-h6 text-medium-emphasis">No schedules found</p>
            <v-btn color="primary" prepend-icon="mdi-plus" class="mt-4" @click="openCreate">Add Schedule</v-btn>
          </div>
        </template>
      </v-data-table-server>
    </v-card>

    <!-- Calendar View -->
    <v-card v-else class="pa-4">
      <div class="schedule-calendar">
        <div v-for="day in 7" :key="day" class="calendar-day">
          <h3 class="text-subtitle-2 font-weight-bold mb-2 text-center">{{ dayNames[day % 7] }}</h3>
          <div v-for="s in schedulesByDay[day % 7]" :key="s.id" class="calendar-item pa-2 mb-2 rounded-lg" :style="{ borderLeft: `4px solid ${getWasteType(s.waste_type).color}` }" @click="openEdit(s)">
            <div class="d-flex align-center mb-1">
              <v-icon :color="getWasteType(s.waste_type).color" size="x-small" class="mr-1">{{ getWasteType(s.waste_type).icon }}</v-icon>
              <span class="text-caption font-weight-medium">{{ getWasteType(s.waste_type).label }}</span>
            </div>
            <div class="text-caption">{{ s.route?.name || 'No route' }}</div>
            <div class="text-caption text-medium-emphasis">{{ s.start_time?.slice(0,5) }} – {{ s.end_time?.slice(0,5) }}</div>
          </div>
          <div v-if="!schedulesByDay[day % 7]?.length" class="text-caption text-center text-medium-emphasis pa-4">No schedules</div>
        </div>
      </div>
    </v-card>

    <ScheduleFormDialog v-model="dialogOpen" :schedule="selectedSchedule" @saved="onSaved" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { fetchSchedules, deleteSchedule } from '@/services/scheduleService.js'
import { useSnackbar } from '@/composables/useSnackbar.js'
import { useConfirmDialog } from '@/composables/useConfirmDialog.js'
import { useWasteTypeColors } from '@/composables/useWasteTypeColors.js'
import ScheduleFormDialog from '@/views/Schedules/ScheduleFormDialog.vue'

const { showSnackbar } = useSnackbar()
const { confirm } = useConfirmDialog()
const { getWasteType, getWasteTypeKeys } = useWasteTypeColors()

const schedules = ref([])
const totalCount = ref(0)
const loading = ref(false)
const wasteFilter = ref(null)
const page = ref(1)
const perPage = ref(50)
const viewMode = ref('calendar')
const dialogOpen = ref(false)
const selectedSchedule = ref(null)

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const dayOptions = dayNames.map((d, i) => ({ title: d, value: i }))
const wasteOptions = getWasteTypeKeys().map((k) => ({ title: getWasteType(k).label, value: k }))

const headers = [
  { title: 'Day', key: 'day_of_week', sortable: false },
  { title: 'Route', key: 'route', sortable: false },
  { title: 'Time', key: 'time', sortable: false },
  { title: 'Waste Type', key: 'waste_type', sortable: false },
  { title: 'Status', key: 'active', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end', width: '120px' },
]

const schedulesByDay = computed(() => {
  const byDay = {}
  for (let i = 0; i < 7; i++) byDay[i] = []
  schedules.value.forEach((s) => { if (byDay[s.day_of_week]) byDay[s.day_of_week].push(s) })
  return byDay
})

async function loadSchedules() {
  loading.value = true
  try {
    const result = await fetchSchedules({ wasteType: wasteFilter.value || '', page: page.value, perPage: perPage.value })
    schedules.value = result.data
    totalCount.value = result.count
  } catch (err) { showSnackbar(err.message, 'error') }
  finally { loading.value = false }
}

function openCreate() { selectedSchedule.value = null; dialogOpen.value = true }
function openEdit(s) { selectedSchedule.value = { ...s }; dialogOpen.value = true }

async function handleDelete(s) {
  const ok = await confirm({ title: 'Delete Schedule', message: 'Delete this schedule entry? Associated collection logs will also be removed.' })
  if (!ok) return
  try { await deleteSchedule(s.id); showSnackbar('Schedule deleted'); loadSchedules() }
  catch (err) { showSnackbar(err.message, 'error') }
}

function onSaved() { dialogOpen.value = false; loadSchedules() }
onMounted(loadSchedules)
</script>

<style scoped>
.schedule-calendar {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}

@media (max-width: 960px) {
  .schedule-calendar {
    grid-template-columns: 1fr;
  }
}

.calendar-item {
  background: rgba(0, 0, 0, 0.03);
  cursor: pointer;
  transition: background 0.2s;
}

.calendar-item:hover {
  background: rgba(0, 0, 0, 0.08);
}
</style>
