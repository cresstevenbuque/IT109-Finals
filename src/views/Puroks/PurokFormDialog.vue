<template>
  <v-dialog :modelValue="modelValue" @update:modelValue="$emit('update:modelValue', $event)" max-width="560" persistent>
    <v-card>
      <v-card-title class="text-h6">
        {{ isEdit ? 'Edit Purok' : 'Add Purok' }}
      </v-card-title>

      <v-card-text>
        <v-form ref="formRef" v-model="valid" @submit.prevent="handleSave">
          <v-text-field
            v-model="form.name"
            label="Purok Name *"
            :rules="[rules.required]"
            class="mb-2"
          />
          <v-textarea
            v-model="form.description"
            label="Description"
            rows="3"
            class="mb-2"
          />

          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model.number="form.center_lat"
                label="Center Latitude"
                type="number"
                step="0.0001"
                hint="e.g. 8.9475"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model.number="form.center_lng"
                label="Center Longitude"
                type="number"
                step="0.0001"
                hint="e.g. 125.5406"
              />
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">Cancel</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="saving"
          :disabled="!valid"
          @click="handleSave"
        >
          {{ isEdit ? 'Update' : 'Create' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
/**
 * Purok create/edit form dialog.
 */
import { ref, computed, watch } from 'vue'
import { createPurok, updatePurok } from '@/services/purokService.js'
import { useSnackbar } from '@/composables/useSnackbar.js'

const props = defineProps({
  modelValue: Boolean,
  purok: Object,
})

const emit = defineEmits(['update:modelValue', 'saved'])

const { showSnackbar } = useSnackbar()
const formRef = ref(null)
const valid = ref(false)
const saving = ref(false)

const isEdit = computed(() => !!props.purok?.id)

const form = ref({
  name: '',
  description: '',
  center_lat: null,
  center_lng: null,
})

const rules = {
  required: (v) => !!v || 'This field is required',
}

// Populate form when editing
watch(() => props.purok, (val) => {
  if (val) {
    form.value = {
      name: val.name || '',
      description: val.description || '',
      center_lat: val.center_lat || null,
      center_lng: val.center_lng || null,
    }
  } else {
    form.value = { name: '', description: '', center_lat: null, center_lng: null }
  }
}, { immediate: true })

async function handleSave() {
  const { valid: isValid } = await formRef.value.validate()
  if (!isValid) return

  saving.value = true
  try {
    if (isEdit.value) {
      await updatePurok(props.purok.id, form.value)
      showSnackbar('Purok updated successfully')
    } else {
      await createPurok(form.value)
      showSnackbar('Purok created successfully')
    }
    emit('saved')
  } catch (err) {
    showSnackbar(err.message, 'error')
  } finally {
    saving.value = false
  }
}
</script>
