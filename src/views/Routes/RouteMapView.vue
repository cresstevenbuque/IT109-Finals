<template>
  <div>
    <div class="d-flex align-center mb-4">
      <v-btn icon variant="text" @click="$router.push('/routes')" class="mr-2">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <div>
        <h1 class="text-h5 font-weight-bold">{{ route?.name || 'Route Map' }}</h1>
        <p class="text-caption text-medium-emphasis">Click the map to add stops. Drag rows to reorder.</p>
      </div>
    </div>

    <v-row>
      <!-- Map -->
      <v-col cols="12" md="8">
        <v-card style="height: 500px; position: relative;">
          <div id="route-map" style="height: 100%; width: 100%; z-index: 1;"></div>
        </v-card>
      </v-col>

      <!-- Stops list -->
      <v-col cols="12" md="4">
        <v-card class="pa-4">
          <h3 class="text-subtitle-1 font-weight-bold mb-3">
            Stops ({{ stops.length }})
          </h3>

          <div v-if="stops.length === 0" class="text-center py-4">
            <v-icon size="48" color="grey-lighten-1">mdi-map-marker-plus</v-icon>
            <p class="text-body-2 text-medium-emphasis mt-2">Click the map to add stops</p>
          </div>

          <v-list v-else density="compact">
            <v-list-item
              v-for="(stop, index) in stops"
              :key="stop.id || index"
              class="mb-1 rounded-lg"
              :style="{ borderLeft: `4px solid ${route?.color || '#4CAF50'}` }"
            >
              <template #prepend>
                <span class="text-caption font-weight-bold mr-2">{{ index + 1 }}</span>
              </template>

              <v-list-item-title>
                <v-text-field
                  v-model="stop.label"
                  density="compact"
                  variant="plain"
                  hide-details
                  placeholder="Stop label..."
                  @blur="saveStop(stop)"
                />
              </v-list-item-title>

              <template #append>
                <v-btn icon size="x-small" variant="text" color="error" @click="removeStop(stop, index)">
                  <v-icon size="small">mdi-close</v-icon>
                </v-btn>
              </template>
            </v-list-item>
          </v-list>

          <v-btn
            v-if="stops.length > 0"
            color="primary"
            variant="tonal"
            block
            class="mt-3"
            :loading="saving"
            @click="saveAllStops"
          >
            Save Order
          </v-btn>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
/**
 * Interactive route map editor.
 * Admin clicks to add stops, can edit labels and delete stops.
 * Draws colored polyline connecting stops.
 */
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute as useVueRoute } from 'vue-router'
import { fetchRouteWithStops, createRouteStop, updateRouteStop, deleteRouteStop, reorderStops } from '@/services/routeService.js'
import { useSnackbar } from '@/composables/useSnackbar.js'
import L from 'leaflet'

const vueRoute = useVueRoute()
const { showSnackbar } = useSnackbar()

const route = ref(null)
const stops = ref([])
const saving = ref(false)

let map = null
let polyline = null
let markers = []

/** Fix Leaflet default icon path issue */
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function initMap() {
  map = L.map('route-map').setView([8.9475, 125.5406], 15)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map)

  // Click to add stop
  map.on('click', (e) => {
    addStop(e.latlng.lat, e.latlng.lng)
  })
}

function renderMarkers() {
  // Clear existing
  markers.forEach((m) => map.removeLayer(m))
  markers = []
  if (polyline) map.removeLayer(polyline)

  const color = route.value?.color || '#4CAF50'
  const latlngs = []

  stops.value.forEach((stop, i) => {
    const marker = L.marker([stop.lat, stop.lng], {
      draggable: true,
    })
      .addTo(map)
      .bindTooltip(`${i + 1}. ${stop.label || 'Stop'}`, { permanent: true, direction: 'top', offset: [0, -10] })

    marker.on('dragend', (e) => {
      const { lat, lng } = e.target.getLatLng()
      stop.lat = lat
      stop.lng = lng
      saveStop(stop)
      renderMarkers()
    })

    markers.push(marker)
    latlngs.push([stop.lat, stop.lng])
  })

  if (latlngs.length > 1) {
    polyline = L.polyline(latlngs, { color, weight: 4, opacity: 0.8 }).addTo(map)
  }

  if (latlngs.length > 0) {
    map.fitBounds(L.latLngBounds(latlngs).pad(0.2))
  }
}

async function addStop(lat, lng) {
  const newStop = {
    route_id: vueRoute.params.id,
    stop_order: stops.value.length + 1,
    label: `Stop ${stops.value.length + 1}`,
    lat,
    lng,
  }

  try {
    const saved = await createRouteStop(newStop)
    stops.value.push(saved)
    renderMarkers()
    showSnackbar('Stop added — click label to rename')
  } catch (err) {
    showSnackbar(err.message, 'error')
  }
}

async function saveStop(stop) {
  if (!stop.id) return
  try {
    await updateRouteStop(stop.id, { label: stop.label, lat: stop.lat, lng: stop.lng })
  } catch (err) {
    showSnackbar(err.message, 'error')
  }
}

async function removeStop(stop, index) {
  try {
    if (stop.id) await deleteRouteStop(stop.id)
    stops.value.splice(index, 1)
    renderMarkers()
    showSnackbar('Stop removed')
  } catch (err) {
    showSnackbar(err.message, 'error')
  }
}

async function saveAllStops() {
  saving.value = true
  try {
    await reorderStops(stops.value)
    showSnackbar('Stop order saved')
  } catch (err) {
    showSnackbar(err.message, 'error')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const data = await fetchRouteWithStops(vueRoute.params.id)
    route.value = data
    stops.value = data.route_stops || []
  } catch (err) {
    showSnackbar(err.message, 'error')
  }

  await nextTick()
  initMap()
  renderMarkers()
})

watch(stops, () => {
  if (map) renderMarkers()
}, { deep: true })

onUnmounted(() => {
  if (map) { map.remove(); map = null }
})
</script>
