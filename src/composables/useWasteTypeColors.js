/**
 * Composable: Waste type color mapping.
 * Provides consistent color-coding across the entire application.
 * @module composables/useWasteTypeColors
 */

/** @type {Record<string, { color: string, icon: string, label: string }>} */
const WASTE_TYPES = {
  biodegradable: {
    color: '#4CAF50',
    icon: 'mdi-leaf',
    label: 'Biodegradable',
  },
  non_biodegradable: {
    color: '#FF9800',
    icon: 'mdi-package-variant-closed',
    label: 'Non-Biodegradable',
  },
  recyclable: {
    color: '#2196F3',
    icon: 'mdi-recycle',
    label: 'Recyclable',
  },
  residual: {
    color: '#F44336',
    icon: 'mdi-trash-can',
    label: 'Residual',
  },
}

export function useWasteTypeColors() {
  /**
   * @param {string} wasteType - One of the waste type keys
   * @returns {{ color: string, icon: string, label: string }}
   */
  function getWasteType(wasteType) {
    return WASTE_TYPES[wasteType] || { color: '#9E9E9E', icon: 'mdi-help', label: wasteType }
  }

  /** @returns {string[]} All waste type keys */
  function getWasteTypeKeys() {
    return Object.keys(WASTE_TYPES)
  }

  return { WASTE_TYPES, getWasteType, getWasteTypeKeys }
}
