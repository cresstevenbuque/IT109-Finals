/**
 * Composable: Global snackbar notifications.
 * Provides a reactive snackbar state and show/hide methods.
 * @module composables/useSnackbar
 */
import { reactive } from 'vue'

/** Shared reactive state across the entire app */
const state = reactive({
  show: false,
  message: '',
  color: 'success',
  timeout: 4000,
})

/**
 * @returns {{ snackbar: typeof state, showSnackbar: Function, hideSnackbar: Function }}
 */
export function useSnackbar() {
  /**
   * Display a snackbar notification.
   * @param {string} message - Text to display
   * @param {'success'|'error'|'warning'|'info'} [color='success'] - Vuetify color
   * @param {number} [timeout=4000] - Auto-hide duration in ms
   */
  function showSnackbar(message, color = 'success', timeout = 4000) {
    state.message = message
    state.color = color
    state.timeout = timeout
    state.show = true
  }

  function hideSnackbar() {
    state.show = false
  }

  return { snackbar: state, showSnackbar, hideSnackbar }
}
