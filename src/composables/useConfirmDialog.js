/**
 * Composable: Confirm dialog state management.
 * Used with ConfirmDialog.vue component.
 * @module composables/useConfirmDialog
 */
import { reactive } from 'vue'

const state = reactive({
  show: false,
  title: '',
  message: '',
  confirmText: 'Delete',
  confirmColor: 'error',
  resolve: null,
})

/**
 * @returns {{ confirmDialog: typeof state, confirm: Function, handleConfirm: Function, handleCancel: Function }}
 */
export function useConfirmDialog() {
  /**
   * Show a confirm dialog and return a promise that resolves to true/false.
   * @param {Object} options
   * @param {string} options.title
   * @param {string} options.message
   * @param {string} [options.confirmText='Delete']
   * @param {string} [options.confirmColor='error']
   * @returns {Promise<boolean>}
   */
  function confirm({ title, message, confirmText = 'Delete', confirmColor = 'error' }) {
    state.title = title
    state.message = message
    state.confirmText = confirmText
    state.confirmColor = confirmColor
    state.show = true
    return new Promise((resolve) => {
      state.resolve = resolve
    })
  }

  function handleConfirm() {
    state.show = false
    if (state.resolve) state.resolve(true)
  }

  function handleCancel() {
    state.show = false
    if (state.resolve) state.resolve(false)
  }

  return { confirmDialog: state, confirm, handleConfirm, handleCancel }
}
