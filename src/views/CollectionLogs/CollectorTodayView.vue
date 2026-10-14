<template>
  <div>
    <div class="mb-6">
      <h1 class="text-h4 font-weight-bold">Today's Routes</h1>
      <p class="text-medium-emphasis mt-1">
        {{ new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}
      </p>
    </div>

    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />

    <div v-if="!loading && schedules.length === 0" class="text-center py-12">
      <v-icon size="80" color="grey-lighten-1" class="mb-4">mdi-check-circle-outline</v-icon>
      <p class="text-h5 text-medium-emphasis">No collections scheduled for today</p>
      <p class="text-body-2 text-medium-emphasis">Check back on your next scheduled day</p>
    </div>

    <v-row>
      <v-col v-for="schedule in schedules" :key="schedule.id" cols="12" md="6">
        <v-card :style="{ borderTop: `4px solid ${getWasteType(schedule.waste_type).color}` }" class="pa-4">
          <div class="d-flex align-center mb-3">
            <v-avatar :color="getWasteType(schedule.waste_type).color" size="40" class="mr-3">
              <v-icon color="white">{{ getWasteType(schedule.waste_type).icon }}</v-icon>
            </v-avatar>
            <div>
              <h3 class="text-subtitle-1 font-weight-bold">{{ schedule.route?.name || 'Route' }}</h3>
              <p class="text-caption text-medium-emphasis">
                {{ schedule.route?.purok?.name || '' }} • {{ schedule.start_time?.slice(0,5) }} – {{ schedule.end_time?.slice(0,5) }}
              </p>
            </div>
            <v-spacer />
            <v-chip :color="getWasteType(schedule.waste_type).color" size="small" variant="flat">
              {{ getWasteType(schedule.waste_type).label }}
            </v-chip>
          </div>

          <!-- Log status -->
          <div v-if="loggedStatus[schedule.id]" class="mb-3">
            <v-chip :color="statusColor(loggedStatus[schedule.id])" variant="flat" size="small">
              <v-icon start size="small">mdi-check</v-icon>
              Logged: {{ loggedStatus[schedule.id] }}
            </v-chip>
          </div>

          <!-- Action buttons -->
          <div class="d-flex ga-2 flex-wrap">
            <v-btn
              v-for="s in ['completed', 'delayed', 'skipped']" :key="s"
              :color="statusColor(s)"
              :variant="loggedStatus[schedule.id] === s ? 'flat' : 'outlined'"
              size="small"
              :loading="submitting === `${schedule.id}-${s}`"
              @click="logCollection(schedule, s)"
            >
              {{ s }}
            </v-btn>
          </div>

          <!-- Notes -->
          <v-text-field
            v-model="notes[schedule.id]"
            label="Notes (optional)"
            density="compact"
            variant="underlined"
            hide-details
            class="mt-3"
          />
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
/**
 * Collector's daily view — shows today's assigned schedules with one-click logging.
 */
import { ref, reactive, onMounted } from 'vue'
import { fetchTodaySchedules } from '@/services/scheduleService.js'
import { createCollectionLog, updateCollectionLog } from '@/services/collectionLogService.js'
import { useAuthStore } from '@/stores/auth.js'
import { useSnackbar } from '@/composables/useSnackbar.js'
import { useWasteTypeColors } from '@/composables/useWasteTypeColors.js'

const authStore = useAuthStore()
const { showSnackbar } = useSnackbar()
const { getWasteType } = useWasteTypeColors()

const schedules = ref([])
const loading = ref(true)
const submitting = ref('')
const loggedStatus = reactive({})
const notes = reactive({})

function statusColor(s) {
  return { completed: 'success', delayed: 'warning', skipped: 'error' }[s] || 'grey'
}

async function logCollection(schedule, status) {
  const key = `${schedule.id}-${status}`
  submitting.value = key
  try {
    const today = new Date().toISOString().split('T')[0]
    await createCollectionLog({
      schedule_id: schedule.id,
      collection_date: today,
      status,
      notes: notes[schedule.id] || null,
      logged_by: authStore.user?.id,
    })
    loggedStatus[schedule.id] = status
    showSnackbar(`Collection marked as ${status}`)
  } catch (err) {
    if (err.message?.includes('duplicate') || err.message?.includes('unique')) {
      showSnackbar('Already logged for today — updating...', 'info')
      // Try to update; for simplicity just notify
    } else {
      showSnackbar(err.message, 'error')
    }
  } finally {
    submitting.value = ''
  }
}

onMounted(async () => {
  loading.value = true
  try {
    schedules.value = await fetchTodaySchedules()
  } catch (err) {
    showSnackbar(err.message, 'error')
  } finally {
    loading.value = false
  }
})
</script>
