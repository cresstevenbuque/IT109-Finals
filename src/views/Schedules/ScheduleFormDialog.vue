<template>
  <v-dialog :modelValue="modelValue" @update:modelValue="$emit('update:modelValue', $event)" max-width="520" persistent>
    <v-card>
      <v-card-title class="text-h6">{{ isEdit ? 'Edit Schedule' : 'Add Schedule' }}</v-card-title>
      <v-card-text>
        <v-form ref="formRef" v-model="valid" @submit.prevent="handleSave">
          <v-select v-model="form.route_id" :items="routeOptions" label="Route *" item-title="name" item-value="id" :rules="[rules.required]" class="mb-2" />
          <v-select v-model="form.day_of_week" :items="dayOptions" label="Day of Week *" :rules="[rules.requiredNum]" class="mb-2" />
          <v-row>
            <v-col cols="6">
              <v-text-field v-model="form.start_time" label="Start Time *" type="time" :rules="[rules.required]" />
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="form.end_time" label="End Time *" type="time" :rules="[rules.required]" />
            </v-col>
          </v-row>
          <v-select v-model="form.waste_type" :items="wasteOptions" label="Waste Type *" :rules="[rules.required]" class="mb-2">
            <template #item="{ item, props: p }">
              <v-list-item v-bind="p">
                <template #prepend>
                  <v-icon :color="getWasteType(item.value).color" size="small">{{ getWasteType(item.value).icon }}</v-icon>
                </template>
              </v-list-item>
            </template>
          </v-select>
          <v-switch v-model="form.active" label="Active" color="primary" />
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
import { createSchedule, updateSchedule } from '@/services/scheduleService.js'
import { fetchRoutes } from '@/services/routeService.js'
import { useSnackbar } from '@/composables/useSnackbar.js'
import { useWasteTypeColors } from '@/composables/useWasteTypeColors.js'

const props = defineProps({ modelValue: Boolean, schedule: Object })
const emit = defineEmits(['update:modelValue', 'saved'])
const { showSnackbar } = useSnackbar()
const { getWasteType, getWasteTypeKeys } = useWasteTypeColors()

const formRef = ref(null)
const valid = ref(false)
const saving = ref(false)
const routeOptions = ref([])
const isEdit = computed(() => !!props.schedule?.id)

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const dayOptions = dayNames.map((d, i) => ({ title: d, value: i }))
const wasteOptions = getWasteTypeKeys().map((k) => ({ title: getWasteType(k).label, value: k }))

const form = ref({ route_id: null, day_of_week: 1, start_time: '06:00', end_time: '09:00', waste_type: 'biodegradable', active: true })
const rules = { required: (v) => !!v || 'Required', requiredNum: (v) => v !== null && v !== undefined && v !== '' || 'Required' }

watch(() => props.schedule, (val) => {
  form.value = val
    ? { route_id: val.route_id, day_of_week: val.day_of_week, start_time: val.start_time, end_time: val.end_time, waste_type: val.waste_type, active: val.active }
    : { route_id: null, day_of_week: 1, start_time: '06:00', end_time: '09:00', waste_type: 'biodegradable', active: true }
}, { immediate: true })

async function handleSave() {
  const { valid: ok } = await formRef.value.validate()
  if (!ok) return
  saving.value = true
  try {
    if (isEdit.value) { await updateSchedule(props.schedule.id, form.value); showSnackbar('Schedule updated') }
    else { await createSchedule(form.value); showSnackbar('Schedule created') }
    emit('saved')
  } catch (err) { showSnackbar(err.message, 'error') }
  finally { saving.value = false }
}

onMounted(async () => {
  try { const { data } = await fetchRoutes({ perPage: 100 }); routeOptions.value = data } catch (_) {}
})
</script>
