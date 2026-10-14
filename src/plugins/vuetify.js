/**
 * Vuetify 3 plugin configuration.
 * Green/teal Material Design theme with dark mode support.
 * @module plugins/vuetify
 */
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const basuraLightTheme = {
  dark: false,
  colors: {
    background: '#F5F7FA',
    surface: '#FFFFFF',
    'surface-variant': '#F0F4F8',
    primary: '#00897B',       // Teal 600
    'primary-darken-1': '#00695C',
    secondary: '#43A047',     // Green 600
    'secondary-darken-1': '#2E7D32',
    accent: '#26A69A',        // Teal 400
    error: '#E53935',
    warning: '#FF9800',
    info: '#2196F3',
    success: '#4CAF50',
    // Waste type semantic colors
    biodegradable: '#4CAF50',
    'non-biodegradable': '#FF9800',
    recyclable: '#2196F3',
    residual: '#F44336',
  },
}

const basuraDarkTheme = {
  dark: true,
  colors: {
    background: '#121212',
    surface: '#1E1E1E',
    'surface-variant': '#2C2C2C',
    primary: '#4DB6AC',       // Teal 300
    'primary-darken-1': '#00897B',
    secondary: '#66BB6A',     // Green 400
    'secondary-darken-1': '#43A047',
    accent: '#80CBC4',        // Teal 200
    error: '#EF5350',
    warning: '#FFA726',
    info: '#42A5F5',
    success: '#66BB6A',
    biodegradable: '#66BB6A',
    'non-biodegradable': '#FFA726',
    recyclable: '#42A5F5',
    residual: '#EF5350',
  },
}

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'basuraLight',
    themes: {
      basuraLight: basuraLightTheme,
      basuraDark: basuraDarkTheme,
    },
  },
  defaults: {
    VBtn: { rounded: 'lg' },
    VCard: { rounded: 'lg', elevation: 2 },
    VTextField: { variant: 'outlined', density: 'comfortable' },
    VSelect: { variant: 'outlined', density: 'comfortable' },
    VTextarea: { variant: 'outlined', density: 'comfortable' },
    VDataTable: { density: 'comfortable' },
  },
})
