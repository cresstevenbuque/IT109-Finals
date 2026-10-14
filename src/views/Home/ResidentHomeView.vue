<template>
  <div>
    <div class="mb-6">
      <h1 class="text-h4 font-weight-bold">My Collection Schedule</h1>
      <p class="text-medium-emphasis mt-1">Welcome, {{ authStore.profile?.full_name || 'Resident' }}!</p>
    </div>

    <v-row>
      <!-- Next Pickup Card -->
      <v-col cols="12" md="6">
        <v-card class="pa-5" :style="nextSchedule ? { borderTop: `4px solid ${getWasteType(nextSchedule.waste_type).color}` } : {}">
          <h3 class="text-subtitle-1 font-weight-bold mb-3">
            <v-icon start>mdi-truck</v-icon> Next Pickup
          </h3>

          <div v-if="!nextSchedule" class="text-center py-6">
            <v-icon size="48" color="grey-lighten-1">mdi-calendar-question</v-icon>
            <p class="text-body-2 text-medium-emphasis mt-2">No upcoming schedule found</p>
            <p class="text-caption text-medium-emphasis">Make sure your purok is set in your profile</p>
          </div>

          <div v-else>
            <div class="d-flex align-center mb-3">
              <v-avatar :color="getWasteType(nextSchedule.waste_type).color" size="48" class="mr-4">
                <v-icon color="white" size="24">{{ getWasteType(nextSchedule.waste_type).icon }}</v-icon>
              </v-avatar>
              <div>
                <p class="text-h6 font-weight-bold">{{ nextDayLabel }}</p>
                <p class="text-body-2">{{ nextSchedule.start_time?.slice(0,5) }} – {{ nextSchedule.end_time?.slice(0,5) }}</p>
              </div>
            </div>

            <v-chip :color="getWasteType(nextSchedule.waste_type).color" variant="flat" class="mr-2 mb-2">
              <v-icon start size="small">{{ getWasteType(nextSchedule.waste_type).icon }}</v-icon>
              {{ getWasteType(nextSchedule.waste_type).label }}
            </v-chip>

            <v-chip variant="tonal" class="mb-2">
              <v-icon start size="small">mdi-routes</v-icon>
              {{ nextSchedule.route?.name || 'Route' }}
            </v-chip>
          </div>
        </v-card>

        <!-- Weekly schedule -->
        <v-card class="pa-4 mt-4">
          <h3 class="text-subtitle-1 font-weight-bold mb-3">
            <v-icon start>mdi-calendar-week</v-icon> This Week
          </h3>
          <v-list v-if="weekSchedules.length > 0" density="compact">
            <v-list-item v-for="s in weekSchedules" :key="s.id" :style="{ borderLeft: `4px solid ${getWasteType(s.waste_type).color}` }" class="mb-1 rounded-lg">
              <v-list-item-title class="text-body-2">
                {{ dayNames[s.day_of_week] }} {{ s.start_time?.slice(0,5) }} – {{ s.end_time?.slice(0,5) }}
              </v-list-item-title>
              <v-list-item-subtitle>
                <v-chip :color="getWasteType(s.waste_type).color" size="x-small" variant="flat">{{ getWasteType(s.waste_type).label }}</v-chip>
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
          <p v-else class="text-body-2 text-medium-emphasis text-center py-4">No schedules for your purok</p>
        </v-card>
      </v-col>

      <!-- Map + Announcements -->
      <v-col cols="12" md="6">
        <v-card style="height: 300px; overflow: hidden;" class="mb-4">
          <div id="resident-home-map" style="height: 100%; width: 100%;"></div>
        </v-card>

        <v-card class="pa-4">
          <h3 class="text-subtitle-1 font-weight-bold mb-3">
            <v-icon start>mdi-bullhorn</v-icon> Latest Announcements
          </h3>
          <div v-if="announcements.length === 0" class="text-center py-4">
            <p class="text-body-2 text-medium-emphasis">No announcements</p>
          </div>
          <v-list v-else density="compact">
            <v-list-item v-for="a in announcements" :key="a.id" class="mb-1">
              <v-list-item-title class="text-body-2 font-weight-medium">{{ a.title }}</v-list-item-title>
              <v-list-item-subtitle class="text-caption" style="white-space: normal;">{{ a.body?.slice(0, 120) }}{{ a.body?.length > 120 ? '...' : '' }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
/**
 * Resident Home — next pickup, weekly schedule, purok map, and latest announcements.
 */
import { ref, computed, onMounted, nextTick, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth.js'
import { fetchSchedules } from '@/services/scheduleService.js'
import { fetchAnnouncements } from '@/services/announcementService.js'
import { fetchRouteWithStops } from '@/services/routeService.js'
import { useWasteTypeColors } from '@/composables/useWasteTypeColors.js'
import L from 'leaflet'

const authStore = useAuthStore()
const { getWasteType } = useWasteTypeColors()

const weekSchedules = ref([])
const announcements = ref([])
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

let map = null

const nextSchedule = computed(() => {
  const now = new Date()
  const today = now.getDay()
  const sorted = [...weekSchedules.value].sort((a, b) => {
    const aDiff = (a.day_of_week - today + 7) % 7 || 7
    const bDiff = (b.day_of_week - today + 7) % 7 || 7
    return aDiff - bDiff
  })
  // Find the next schedule (today or later in the week)
  return sorted.find(s => {
    const diff = (s.day_of_week - today + 7) % 7
    return diff > 0 || (diff === 0 && s.start_time > now.toTimeString().slice(0, 5))
  }) || sorted[0] || null
})

const nextDayLabel = computed(() => {
  if (!nextSchedule.value) return ''
  const today = new Date().getDay()
  const diff = (nextSchedule.value.day_of_week - today + 7) % 7
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return dayNames[nextSchedule.value.day_of_week]
})

async function initMap() {
  await nextTick()
  const el = document.getElementById('resident-home-map')
  if (!el || map) return

  const lat = authStore.profile?.lat || 8.9475
  const lng = authStore.profile?.lng || 125.5406

  map = L.map(el).setView([lat, lng], 15)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap', maxZoom: 19,
  }).addTo(map)

  // Show resident pin
  if (authStore.profile?.lat && authStore.profile?.lng) {
    L.marker([authStore.profile.lat, authStore.profile.lng])
      .addTo(map)
      .bindPopup('Your location')
  }

  // Try to load the route for the resident's purok
  if (weekSchedules.value.length > 0 && weekSchedules.value[0].route_id) {
    try {
      const route = await fetchRouteWithStops(weekSchedules.value[0].route_id)
      if (route?.route_stops?.length > 0) {
        const latlngs = route.route_stops.map(s => [s.lat, s.lng])
        L.polyline(latlngs, { color: route.color || '#4CAF50', weight: 4 }).addTo(map)
        route.route_stops.forEach(s => {
          L.circleMarker([s.lat, s.lng], { radius: 6, color: route.color || '#4CAF50', fillOpacity: 0.8 })
            .addTo(map)
            .bindTooltip(s.label)
        })
        map.fitBounds(L.latLngBounds(latlngs).pad(0.3))
      }
    } catch (_) {}
  }
}

onMounted(async () => {
  try {
    // Load schedules for the resident's purok
    const { data } = await fetchSchedules({ perPage: 50 })
    // Filter by purok if possible
    weekSchedules.value = data.filter(s => {
      if (!authStore.profile?.purok_id) return true
      return s.route?.purok_id === authStore.profile.purok_id
    })
  } catch (_) {}

  try {
    const { data } = await fetchAnnouncements({ perPage: 5 })
    announcements.value = data
  } catch (_) {}

  setTimeout(initMap, 300)
})

onUnmounted(() => { if (map) { map.remove(); map = null } })
</script>
