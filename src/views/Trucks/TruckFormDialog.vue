<template>
  <v-dialog :modelValue="modelValue" @update:modelValue="$emit('update:modelValue', $event)" max-width="480" persistent>
    <v-card>
      <v-card-title class="text-h6">{{ isEdit ? 'Edit Truck' : 'Add Truck' }}</v-card-title>
      <v-card-text>
        <v-form ref="formRef" v-model="valid" @submit.prevent="handleSave">
          <v-text-field v-model="form.plate_no" label="Plate Number *" :rules="[rules.required]" class="mb-2" />
          <v-text-field v-model="form.capacity" label="Capacity" hint="e.g. 6 cubic meters" class="mb-2" />
          <v-select v-model="form.status" label="Status *" :items="['active', 'maintenance']" :rules="[rules.required]" />
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
import { ref, computed, watch } from 'vue'
import { createTruck, updateTruck } from '@/services/truckService.js'
import { useSnackbar } from '@/composables/useSnackbar.js'

const props = defineProps({ modelValue: Boolean, truck: Object })
const emit = defineEmits(['update:modelValue', 'saved'])
const { showSnackbar } = useSnackbar()

const formRef = ref(null)
const valid = ref(false)
const saving = ref(false)
const isEdit = computed(() => !!props.truck?.id)

const form = ref({ plate_no: '', capacity: '', status: 'active' })
const rules = { required: (v) => !!v || 'Required' }

watch(() => props.truck, (val) => {
  form.value = val ? { plate_no: val.plate_no, capacity: val.capacity, status: val.status } : { plate_no: '', capacity: '', status: 'active' }
}, { immediate: true })

async function handleSave() {
  const { valid: ok } = await formRef.value.validate()
  if (!ok) return
  saving.value = true
  try {
    if (isEdit.value) { await updateTruck(props.truck.id, form.value); showSnackbar('Truck updated') }
    else { await createTruck(form.value); showSnackbar('Truck created') }
    emit('saved')
  } catch (err) { showSnackbar(err.message, 'error') }
  finally { saving.value = false }
}
</script>
