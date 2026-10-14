<template>
  <v-dialog :modelValue="modelValue" @update:modelValue="$emit('update:modelValue', $event)" max-width="620" persistent>
    <v-card>
      <v-card-title class="text-h6">{{ isEdit ? (isAdmin ? 'Update Report' : 'Edit Report') : 'Report Missed Pickup' }}</v-card-title>
      <v-card-text>
        <v-form ref="formRef" v-model="valid" @submit.prevent="handleSave">
          <!-- Resident fields -->
          <template v-if="!isAdmin || !isEdit">
            <v-textarea v-model="form.description" label="Description *" rows="3" :rules="[rules.required]" class="mb-2" placeholder="Describe what happened..." />

            <!-- Photo upload -->
            <v-file-input
              v-model="photoFile"
              label="Photo (optional)"
              accept="image/*"
              prepend-icon="mdi-camera"
              variant="outlined"
              density="comfortable"
              class="mb-3"
            />

            <!-- Pin map -->
            <p class="text-body-2 text-medium-emphasis mb-1">Click map to pin the location:</p>
            <div style="height: 220px; border-radius: 12px; overflow: hidden;" class="mb-3">
              <div id="missed-pin-map" style="height: 100%; width: 100%;"></div>
            </div>
          </template>

          <!-- Admin fields -->
          <template v-if="isAdmin && isEdit">
            <v-alert variant="tonal" density="compact" class="mb-3">
              <strong>{{ report?.resident?.full_name }}</strong> reported:
              <br />{{ report?.description }}
            </v-alert>

            <v-select v-model="form.status" label="Status *" :items="['open', 'in_progress', 'resolved']" :rules="[rules.required]" class="mb-2" />
            <v-textarea v-model="form.admin_response" label="Admin Response" rows="3" placeholder="Provide feedback to the resident..." />
          </template>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">Cancel</v-btn>
        <v-btn color="primary" variant="flat" :loading="saving" :disabled="!valid" @click="handleSave">
          {{ isEdit ? 'Update' : 'Submit Report' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import { createMissedPickup, updateMissedPickup } from '@/services/missedPickupService.js'
import { uploadPhoto } from '@/services/storageService.js'
import { useAuthStore } from '@/stores/auth.js'
import { useSnackbar } from '@/composables/useSnackbar.js'
import L from 'leaflet'

const props = defineProps({ modelValue: Boolean, report: Object, isAdmin: Boolean })
const emit = defineEmits(['update:modelValue', 'saved'])
const authStore = useAuthStore()
const { showSnackbar } = useSnackbar()

const formRef = ref(null)
const valid = ref(false)
const saving = ref(false)
const photoFile = ref(null)
const isEdit = computed(() => !!props.report?.id)
const rules = { required: (v) => !!v || 'Required' }

const form = ref({ description: '', lat: null, lng: null, status: 'open', admin_response: '' })

let map = null
let marker = null

watch(() => props.report, (val) => {
  if (val) {
    form.value = {
      description: val.description || '',
      lat: val.lat, lng: val.lng,
      status: val.status || 'open',
      admin_response: val.admin_response || '',
    }
  } else {
    form.value = { description: '', lat: null, lng: null, status: 'open', admin_response: '' }
  }
}, { immediate: true })

watch(() => props.modelValue, async (open) => {
  if (open && (!props.isAdmin || !isEdit.value)) {
    await nextTick(); await nextTick()
    setTimeout(initMap, 200)
  } else if (!open && map) {
    map.remove(); map = null
  }
})

function initMap() {
  const el = document.getElementById('missed-pin-map')
  if (!el || map) return
  const lat = form.value.lat || authStore.profile?.lat || 8.9475
  const lng = form.value.lng || authStore.profile?.lng || 125.5406
  map = L.map(el).setView([lat, lng], 15)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap', maxZoom: 19 }).addTo(map)
  if (form.value.lat && form.value.lng) {
    marker = L.marker([form.value.lat, form.value.lng], { draggable: true }).addTo(map)
    marker.on('dragend', (e) => { form.value.lat = e.target.getLatLng().lat; form.value.lng = e.target.getLatLng().lng })
  }
  map.on('click', (e) => {
    form.value.lat = e.latlng.lat; form.value.lng = e.latlng.lng
    if (marker) map.removeLayer(marker)
    marker = L.marker([e.latlng.lat, e.latlng.lng], { draggable: true }).addTo(map)
    marker.on('dragend', (ev) => { form.value.lat = ev.target.getLatLng().lat; form.value.lng = ev.target.getLatLng().lng })
  })
}

async function handleSave() {
  const { valid: ok } = await formRef.value.validate()
  if (!ok) return
  saving.value = true
  try {
    if (isEdit.value) {
      const updates = props.isAdmin
        ? { status: form.value.status, admin_response: form.value.admin_response }
        : { description: form.value.description, lat: form.value.lat, lng: form.value.lng }
      await updateMissedPickup(props.report.id, updates)
      showSnackbar('Report updated')
    } else {
      let photo_url = null
      if (photoFile.value) {
        photo_url = await uploadPhoto(photoFile.value)
      }
      await createMissedPickup({
        resident_id: authStore.user.id,
        purok_id: authStore.profile?.purok_id || null,
        description: form.value.description,
        lat: form.value.lat, lng: form.value.lng,
        photo_url,
      })
      showSnackbar('Report submitted')
    }
    emit('saved')
  } catch (err) { showSnackbar(err.message, 'error') }
  finally { saving.value = false }
}

onUnmounted(() => { if (map) { map.remove(); map = null } })
</script>
