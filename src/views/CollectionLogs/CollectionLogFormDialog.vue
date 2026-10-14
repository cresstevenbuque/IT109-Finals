<template>
  <v-dialog :modelValue="modelValue" @update:modelValue="$emit('update:modelValue', $event)" max-width="520" persistent>
    <v-card>
      <v-card-title class="text-h6">{{ isEdit ? 'Edit Collection Log' : 'Add Collection Log' }}</v-card-title>
      <v-card-text>
        <v-form ref="formRef" v-model="valid" @submit.prevent="handleSave">
          <v-select v-model="form.schedule_id" :items="scheduleOptions" label="Schedule *" item-title="label" item-value="id" :rules="[rules.required]" :disabled="isEdit" class="mb-2" />
          <v-text-field v-model="form.collection_date" label="Collection Date *" type="date" :rules="[rules.required]" class="mb-2" />
          <v-select v-model="form.status" label="Status *" :items="['completed', 'delayed', 'skipped']" :rules="[rules.required]" class="mb-2" />
          <v-textarea v-model="form.notes" label="Notes" rows="3" />
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
import { createCollectionLog, updateCollectionLog } from '@/services/collectionLogService.js'
import { fetchSchedules } from '@/services/scheduleService.js'
import { useAuthStore } from '@/stores/auth.js'
import { useSnackbar } from '@/composables/useSnackbar.js'

const props = defineProps({ modelValue: Boolean, log: Object })
const emit = defineEmits(['update:modelValue', 'saved'])
const authStore = useAuthStore()
const { showSnackbar } = useSnackbar()

const formRef = ref(null)
const valid = ref(false)
const saving = ref(false)
const scheduleOptions = ref([])
const isEdit = computed(() => !!props.log?.id)
const today = new Date().toISOString().split('T')[0]

const form = ref({ schedule_id: null, collection_date: today, status: 'completed', notes: '' })
const rules = { required: (v) => !!v || 'Required' }

watch(() => props.log, (val) => {
  form.value = val
    ? { schedule_id: val.schedule_id, collection_date: val.collection_date, status: val.status, notes: val.notes || '' }
    : { schedule_id: null, collection_date: today, status: 'completed', notes: '' }
}, { immediate: true })

async function handleSave() {
  const { valid: ok } = await formRef.value.validate()
  if (!ok) return
  saving.value = true
  try {
    const payload = { ...form.value, logged_by: authStore.user?.id }
    if (isEdit.value) { await updateCollectionLog(props.log.id, payload); showSnackbar('Log updated') }
    else { await createCollectionLog(payload); showSnackbar('Log created') }
    emit('saved')
  } catch (err) { showSnackbar(err.message, 'error') }
  finally { saving.value = false }
}

onMounted(async () => {
  try {
    const { data } = await fetchSchedules({ perPage: 100 })
    scheduleOptions.value = data.map(s => ({
      id: s.id,
      label: `${s.route?.name || 'Route'} — ${s.waste_type} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][s.day_of_week]})`,
    }))
  } catch (_) {}
})
</script>
