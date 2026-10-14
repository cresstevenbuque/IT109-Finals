<template>
  <v-dialog :modelValue="modelValue" @update:modelValue="$emit('update:modelValue', $event)" max-width="560" persistent>
    <v-card>
      <v-card-title class="text-h6">{{ isEdit ? 'Edit Announcement' : 'New Announcement' }}</v-card-title>
      <v-card-text>
        <v-form ref="formRef" v-model="valid" @submit.prevent="handleSave">
          <v-text-field v-model="form.title" label="Title *" :rules="[rules.required]" class="mb-2" />
          <v-textarea v-model="form.body" label="Message *" rows="4" :rules="[rules.required]" class="mb-2" />
          <v-select v-model="form.purok_id" :items="puroks" label="Target Purok (blank = all)" item-title="name" item-value="id" clearable class="mb-2" />
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
import { createAnnouncement, updateAnnouncement } from '@/services/announcementService.js'
import { useAuthStore } from '@/stores/auth.js'
import { useSnackbar } from '@/composables/useSnackbar.js'

const props = defineProps({ modelValue: Boolean, announcement: Object, puroks: Array })
const emit = defineEmits(['update:modelValue', 'saved'])
const authStore = useAuthStore()
const { showSnackbar } = useSnackbar()

const formRef = ref(null)
const valid = ref(false)
const saving = ref(false)
const isEdit = computed(() => !!props.announcement?.id)

const form = ref({ title: '', body: '', purok_id: null })
const rules = { required: (v) => !!v || 'Required' }

watch(() => props.announcement, (val) => {
  form.value = val ? { title: val.title, body: val.body, purok_id: val.purok_id } : { title: '', body: '', purok_id: null }
}, { immediate: true })

async function handleSave() {
  const { valid: ok } = await formRef.value.validate()
  if (!ok) return
  saving.value = true
  try {
    if (isEdit.value) { await updateAnnouncement(props.announcement.id, form.value); showSnackbar('Announcement updated') }
    else { await createAnnouncement({ ...form.value, created_by: authStore.user?.id }); showSnackbar('Announcement created') }
    emit('saved')
  } catch (err) { showSnackbar(err.message, 'error') }
  finally { saving.value = false }
}
</script>
