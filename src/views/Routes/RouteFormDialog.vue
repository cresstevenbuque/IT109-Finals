<template>
  <v-dialog :modelValue="modelValue" @update:modelValue="$emit('update:modelValue', $event)" max-width="560" persistent>
    <v-card>
      <v-card-title class="text-h6">{{ isEdit ? 'Edit Route' : 'Add Route' }}</v-card-title>
      <v-card-text>
        <v-form ref="formRef" v-model="valid" @submit.prevent="handleSave">
          <v-text-field v-model="form.name" label="Route Name *" :rules="[rules.required]" class="mb-2" />
          <v-select v-model="form.purok_id" :items="puroks" label="Barangay" item-title="name" item-value="id" clearable class="mb-2" />
          <v-select v-model="form.truck_id" :items="truckOptions" label="Assign Truck" item-title="plate_no" item-value="id" clearable class="mb-2" />
          <v-select v-model="form.collector_id" :items="collectorOptions" label="Assign Collector" item-title="full_name" item-value="id" clearable class="mb-2" />

          <div class="mb-2">
            <label class="text-body-2 text-medium-emphasis">Route Color</label>
            <div class="d-flex ga-2 mt-1">
              <v-avatar
                v-for="c in colorOptions" :key="c"
                :color="c" size="32"
                :class="{ 'ring': form.color === c }"
                style="cursor: pointer; border: 2px solid transparent;"
                @click="form.color = c"
              >
                <v-icon v-if="form.color === c" size="16" color="white">mdi-check</v-icon>
              </v-avatar>
            </div>
          </div>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">Cancel</v-btn>
        <v-btn color="primary" variant="flat" :loading="saving" :disabled="!valid" @click="handleSave">{{ isEdit ? 'Update' : 'Create' }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { createRoute, updateRoute } from '@/services/routeService.js'
import { fetchTrucks } from '@/services/truckService.js'
import { fetchCollectors } from '@/services/residentService.js'
import { useSnackbar } from '@/composables/useSnackbar.js'

const props = defineProps({ modelValue: Boolean, route: Object, puroks: Array })
const emit = defineEmits(['update:modelValue', 'saved'])
const { showSnackbar } = useSnackbar()

const formRef = ref(null)
const valid = ref(false)
const saving = ref(false)
const isEdit = computed(() => !!props.route?.id)

const truckOptions = ref([])
const collectorOptions = ref([])
const colorOptions = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#795548', '#607D8B']

const form = ref({ name: '', purok_id: null, truck_id: null, collector_id: null, color: '#4CAF50' })
const rules = { required: (v) => !!v || 'Required' }

watch(() => props.route, (val) => {
  form.value = val
    ? { name: val.name, purok_id: val.purok_id, truck_id: val.truck_id, collector_id: val.collector_id, color: val.color || '#4CAF50' }
    : { name: '', purok_id: null, truck_id: null, collector_id: null, color: '#4CAF50' }
}, { immediate: true })

async function handleSave() {
  const { valid: ok } = await formRef.value.validate()
  if (!ok) return
  saving.value = true
  try {
    if (isEdit.value) { await updateRoute(props.route.id, form.value); showSnackbar('Route updated') }
    else { await createRoute(form.value); showSnackbar('Route created') }
    emit('saved')
  } catch (err) { showSnackbar(err.message, 'error') }
  finally { saving.value = false }
}

onMounted(async () => {
  try {
    const { data } = await fetchTrucks({ perPage: 100 })
    truckOptions.value = data
  } catch (_) {}
  try { collectorOptions.value = await fetchCollectors() } catch (_) {}
})
</script>

<style scoped>
.ring { border-color: currentColor !important; box-shadow: 0 0 0 3px rgba(0,0,0,0.15); }
</style>
