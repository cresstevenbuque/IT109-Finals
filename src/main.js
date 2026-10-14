/**
 * Application entry point.
 * Mounts Vue app with Pinia, Vuetify, and Vue Router.
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import vuetify from '@/plugins/vuetify.js'
import router from '@/router/index.js'
import App from '@/App.vue'

// Leaflet CSS
import 'leaflet/dist/leaflet.css'

const app = createApp(App)

app.use(createPinia())
app.use(vuetify)
app.use(router)

app.mount('#app')
