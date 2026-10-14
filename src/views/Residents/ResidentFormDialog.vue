<template>
  <v-dialog :modelValue="modelValue" @update:modelValue="$emit('update:modelValue', $event)" max-width="600" persistent>
    <v-card>
      <v-card-title class="text-h6">Edit Resident</v-card-title>
      <v-card-text>
        <v-form ref="formRef" v-model="valid" @submit.prevent="handleSave">
          <v-text-field v-model="form.full_name" label="Full Name *" :rules="[rules.required]" class="mb-2" />
          <v-text-field v-model="form.phone" label="Phone" class="mb-2" />
          <v-select v-model="form.purok_id" :items="puroks" label="Purok" item-title="name" item-value="id" clearable class="mb-2" />
          <v-text-field v-model="form.address" label="Address" hint="Enter address then click Geocode, or place pin on map" persistent-hint class="mb-1" />

          <v-btn variant="tonal" color="info" size="small" :loading="geocoding" @click="handleGeocode" class="mb-4">
            <v-icon start size="small">mdi-map-search</v-icon> Geocode Address
          </v-btn>

          <v-alert v-if="geocodeError" type="warning" density="compact" variant="tonal" class="mb-3">
            {{ geocodeError }} — Place the pin manually on the map below.
          </v-alert>

          <!-- Mini map for pin placement -->
          <div class="mb-3" style="height: 250px; border-radius: 12px; overflow: hidden;">
            <div id="resident-pin-map" style="height: 100%; width: 100%;"></div>
          </div>

          <v-row>
            <v-col cols="6"><v-text-field v-model.number="form.lat" label="Latitude" type="number" step="0.0001" readonly /></v-col>
            <v-col cols="6"><v-text-field v-model.number="form.lng" label="Longitude" type="number" step="0.0001" readonly /></v-col>
          </v-row>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">Cancel</v-btn>
        <v-btn color="primary" variant="flat" :loading="saving" :disabled="!valid" @click="handleSave">Update</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch, nextTick, onUnmounted } from 'vue'
import { updateResident } from '@/services/residentService.js'
import { geocodeAddress } from '@/services/geocodingService.js'
import { useSnackbar } from '@/composables/useSnackbar.js'
import L from 'leaflet'

const props = defineProps({ modelValue: Boolean, resident: Object, puroks: Array })
const emit = defineEmits(['update:modelValue', 'saved'])
const { showSnackbar } = useSnackbar()

const formRef = ref(null)
const valid = ref(false)
const saving = ref(false)
const geocoding = ref(false)
const geocodeError = ref('')
const rules = { required: (v) => !!v || 'Required' }

const form = ref({ full_name: '', phone: '', address: '', purok_id: null, lat: null, lng: null })

let map = null
let marker = null

watch(() => props.resident, (val) => {
  form.value = val
    ? { full_name: val.full_name || '', phone: val.phone || '', address: val.address || '', purok_id: val.purok_id, lat: val.lat, lng: val.lng }
    : { full_name: '', phone: '', address: '', purok_id: null, lat: null, lng: null }
  geocodeError.value = ''
}, { immediate: true })

watch(() => props.modelValue, async (open) => {
  if (open) {
    await nextTick()
    await nextTick()
    setTimeout(initMap, 200)
  } else {
    if (map) { map.remove(); map = null }
  }
})

function initMap() {
  const el = document.getElementById('resident-pin-map')
  if (!el || map) return

  const lat = form.value.lat || 8.9475
  const lng = form.value.lng || 125.5406

  map = L.map(el).setView([lat, lng], 15)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap', maxZoom: 19,
  }).addTo(map)

  if (form.value.lat && form.value.lng) {
    marker = L.marker([form.value.lat, form.value.lng], { draggable: true }).addTo(map)
    marker.on('dragend', (e) => {
      form.value.lat = e.target.getLatLng().lat
      form.value.lng = e.target.getLatLng().lng
    })
  }

  map.on('click', (e) => {
    form.value.lat = e.latlng.lat
    form.value.lng = e.latlng.lng
    if (marker) map.removeLayer(marker)
    marker = L.marker([e.latlng.lat, e.latlng.lng], { draggable: true }).addTo(map)
    marker.on('dragend', (ev) => {
      form.value.lat = ev.target.getLatLng().lat
      form.value.lng = ev.target.getLatLng().lng
    })
  })
}

async function handleGeocode() {
  if (!form.value.address) { geocodeError.value = 'Enter an address first'; return }
  geocoding.value = true
  geocodeError.value = ''
  try {
    const result = await geocodeAddress(form.value.address)
    if (!result) { geocodeError.value = 'Address not found'; return }
    form.value.lat = result.lat
    form.value.lng = result.lng
    if (map) {
      map.setView([result.lat, result.lng], 16)
      if (marker) map.removeLayer(marker)
      marker = L.marker([result.lat, result.lng], { draggable: true }).addTo(map)
      marker.on('dragend', (e) => {
        form.value.lat = e.target.getLatLng().lat
        form.value.lng = e.target.getLatLng().lng
      })
    }
    showSnackbar('Address geocoded successfully', 'info')
  } catch (err) { geocodeError.value = err.message }
  finally { geocoding.value = false }
}

async function handleSave() {
  const { valid: ok } = await formRef.value.validate()
  if (!ok) return
  saving.value = true
  try {
    await updateResident(props.resident.id, form.value)
    showSnackbar('Resident updated')
    emit('saved')
  } catch (err) { showSnackbar(err.message, 'error') }
  finally { saving.value = false }
}

onUnmounted(() => { if (map) { map.remove(); map = null } })
</script>
