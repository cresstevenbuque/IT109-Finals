<template>
  <div>
    <div class="mb-6">
      <h1 class="text-h4 font-weight-bold">Dashboard</h1>
      <p class="text-medium-emphasis mt-1">
        {{ new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}
      </p>
    </div>

    <!-- Stat Cards -->
    <v-row class="mb-4">
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4" color="primary" variant="flat">
          <div class="d-flex align-center">
            <v-avatar color="white" size="48" class="mr-3"><v-icon color="primary">mdi-calendar-today</v-icon></v-avatar>
            <div>
              <p class="text-h4 font-weight-bold text-white">{{ todaySchedules.length }}</p>
              <p class="text-caption text-white" style="opacity: 0.8;">Today's Collections</p>
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4" color="success" variant="flat">
          <div class="d-flex align-center">
            <v-avatar color="white" size="48" class="mr-3"><v-icon color="success">mdi-check-circle</v-icon></v-avatar>
            <div>
              <p class="text-h4 font-weight-bold text-white">{{ stats.completed }}</p>
              <p class="text-caption text-white" style="opacity: 0.8;">Completed Today</p>
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4" color="warning" variant="flat">
          <div class="d-flex align-center">
            <v-avatar color="white" size="48" class="mr-3"><v-icon color="warning">mdi-clock-alert</v-icon></v-avatar>
            <div>
              <p class="text-h4 font-weight-bold text-white">{{ stats.delayed + stats.skipped }}</p>
              <p class="text-caption text-white" style="opacity: 0.8;">Delayed / Skipped</p>
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4" color="error" variant="flat">
          <div class="d-flex align-center">
            <v-avatar color="white" size="48" class="mr-3"><v-icon color="error">mdi-alert-circle</v-icon></v-avatar>
            <div>
              <p class="text-h4 font-weight-bold text-white">{{ openReports }}</p>
              <p class="text-caption text-white" style="opacity: 0.8;">Open Reports</p>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <!-- Chart -->
      <v-col cols="12" md="7">
        <v-card class="pa-4">
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Collection Completion Rate by Purok</h3>
          <div style="height: 300px;">
            <Bar v-if="chartReady" :data="chartData" :options="chartOptions" />
          </div>
        </v-card>
      </v-col>

      <!-- Today's schedule -->
      <v-col cols="12" md="5">
        <v-card class="pa-4">
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Today's Schedule</h3>
          <div v-if="todaySchedules.length === 0" class="text-center py-6">
            <v-icon size="48" color="grey-lighten-1">mdi-calendar-blank</v-icon>
            <p class="text-body-2 text-medium-emphasis mt-2">No collections today</p>
          </div>
          <v-list v-else density="compact">
            <v-list-item v-for="s in todaySchedules" :key="s.id" class="mb-1 rounded-lg" :style="{ borderLeft: `4px solid ${getWasteType(s.waste_type).color}` }">
              <template #prepend>
                <v-icon :color="getWasteType(s.waste_type).color" size="small" class="mr-2">{{ getWasteType(s.waste_type).icon }}</v-icon>
              </template>
              <v-list-item-title class="text-body-2 font-weight-medium">{{ s.route?.name || 'Route' }}</v-list-item-title>
              <v-list-item-subtitle class="text-caption">
                {{ s.start_time?.slice(0,5) }} – {{ s.end_time?.slice(0,5) }} • {{ s.route?.purok?.name || '' }}
              </v-list-item-subtitle>
              <template #append>
                <v-chip :color="getWasteType(s.waste_type).color" size="x-small" variant="flat">{{ getWasteType(s.waste_type).label }}</v-chip>
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
/**
 * Admin Dashboard — summary cards, completion chart, and today's schedule.
 */
import { ref, reactive, onMounted } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'
import { fetchTodaySchedules } from '@/services/scheduleService.js'
import { fetchDashboardStats } from '@/services/collectionLogService.js'
import { fetchMissedPickups } from '@/services/missedPickupService.js'
import { fetchPuroks } from '@/services/purokService.js'
import { fetchCollectionLogs } from '@/services/collectionLogService.js'
import { useWasteTypeColors } from '@/composables/useWasteTypeColors.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const { getWasteType } = useWasteTypeColors()

const todaySchedules = ref([])
const stats = reactive({ total: 0, completed: 0, delayed: 0, skipped: 0 })
const openReports = ref(0)
const chartReady = ref(false)
const chartData = ref({ labels: [], datasets: [] })

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' } },
  scales: { y: { beginAtZero: true, max: 100, ticks: { callback: (v) => v + '%' } } },
}

onMounted(async () => {
  try {
    // Today's schedules
    todaySchedules.value = await fetchTodaySchedules()

    // Today's log stats
    const s = await fetchDashboardStats()
    Object.assign(stats, s)

    // Open reports count
    const rp = await fetchMissedPickups({ status: 'open', perPage: 1 })
    openReports.value = rp.count

    // Chart: completion rate per purok (last 30 days)
    const { data: puroks } = await fetchPuroks({ perPage: 100 })
    const { data: allLogs } = await fetchCollectionLogs({ perPage: 500 })

    const labels = puroks.map(p => p.name)
    const completed = []
    const delayed = []

    for (const purok of puroks) {
      const purokLogs = allLogs.filter(l => l.schedule?.route?.purok?.name === purok.name)
      const total = purokLogs.length || 1
      completed.push(Math.round((purokLogs.filter(l => l.status === 'completed').length / total) * 100))
      delayed.push(Math.round((purokLogs.filter(l => l.status === 'delayed' || l.status === 'skipped').length / total) * 100))
    }

    chartData.value = {
      labels,
      datasets: [
        { label: 'Completed %', data: completed, backgroundColor: '#4CAF50' },
        { label: 'Delayed/Skipped %', data: delayed, backgroundColor: '#FF9800' },
      ],
    }
    chartReady.value = true
  } catch (err) {
    console.error('Dashboard load error:', err)
  }
})
</script>
