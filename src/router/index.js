/**
 * Vue Router — route definitions with role-based guards.
 * Uses meta.requiresAuth and meta.roles for access control.
 * @module router/index
 */
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'

const routes = [
  // ─── Auth (public) ─────────────────────────────────────
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Auth/LoginView.vue'),
    meta: { guest: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/Auth/RegisterView.vue'),
    meta: { guest: true },
  },

  // ─── Dashboard ──────────────────────────────────────────
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard/DashboardView.vue'),
    meta: { requiresAuth: true, roles: ['admin'] },
  },

  // ─── Resident Home ─────────────────────────────────────
  {
    path: '/home',
    name: 'ResidentHome',
    component: () => import('@/views/Home/ResidentHomeView.vue'),
    meta: { requiresAuth: true, roles: ['resident'] },
  },

  // ─── Puroks ─────────────────────────────────────────────
  {
    path: '/puroks',
    name: 'Puroks',
    component: () => import('@/views/Puroks/PurokListView.vue'),
    meta: { requiresAuth: true, roles: ['admin'] },
  },

  // ─── Trucks ─────────────────────────────────────────────
  {
    path: '/trucks',
    name: 'Trucks',
    component: () => import('@/views/Trucks/TruckListView.vue'),
    meta: { requiresAuth: true, roles: ['admin'] },
  },

  // ─── Routes ─────────────────────────────────────────────
  {
    path: '/routes',
    name: 'Routes',
    component: () => import('@/views/Routes/RouteListView.vue'),
    meta: { requiresAuth: true, roles: ['admin'] },
  },
  {
    path: '/routes/:id/map',
    name: 'RouteMap',
    component: () => import('@/views/Routes/RouteMapView.vue'),
    meta: { requiresAuth: true, roles: ['admin'] },
    props: true,
  },

  // ─── Schedules ──────────────────────────────────────────
  {
    path: '/schedules',
    name: 'Schedules',
    component: () => import('@/views/Schedules/ScheduleListView.vue'),
    meta: { requiresAuth: true, roles: ['admin'] },
  },

  // ─── Residents ──────────────────────────────────────────
  {
    path: '/residents',
    name: 'Residents',
    component: () => import('@/views/Residents/ResidentListView.vue'),
    meta: { requiresAuth: true, roles: ['admin'] },
  },

  // ─── Collection Logs ────────────────────────────────────
  {
    path: '/collection-logs',
    name: 'CollectionLogs',
    component: () => import('@/views/CollectionLogs/CollectionLogListView.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'collector'] },
  },
  {
    path: '/collector/today',
    name: 'CollectorToday',
    component: () => import('@/views/CollectionLogs/CollectorTodayView.vue'),
    meta: { requiresAuth: true, roles: ['collector'] },
  },

  // ─── Missed Pickup Reports ──────────────────────────────
  {
    path: '/missed-pickups',
    name: 'MissedPickups',
    component: () => import('@/views/MissedPickups/MissedPickupListView.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'resident'] },
  },

  // ─── Announcements ─────────────────────────────────────
  {
    path: '/announcements',
    name: 'Announcements',
    component: () => import('@/views/Announcements/AnnouncementListView.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'resident'] },
  },

  // ─── Integrations Log ──────────────────────────────────
  {
    path: '/integrations',
    name: 'Integrations',
    component: () => import('@/views/Integrations/IntegrationLogView.vue'),
    meta: { requiresAuth: true, roles: ['admin'] },
  },

  // ─── Catch-all ──────────────────────────────────────────
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

/**
 * Global navigation guard.
 * - Redirects unauthenticated users to /login.
 * - Redirects authenticated users away from guest-only pages.
 * - Checks role-based access for protected routes.
 */
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // Wait for auth initialization on first load
  if (authStore.loading) {
    await authStore.initialize()
  }

  const isAuth = authStore.isAuthenticated
  const userRole = authStore.role

  // Guest-only pages (login, register)
  if (to.meta.guest && isAuth) {
    // Redirect logged-in users to their default page
    if (userRole === 'admin') return next('/')
    if (userRole === 'collector') return next('/collector/today')
    return next('/home')
  }

  // Protected pages
  if (to.meta.requiresAuth && !isAuth) {
    return next('/login')
  }

  // Role-based access
  if (to.meta.roles && !to.meta.roles.includes(userRole)) {
    // Redirect to role-appropriate page
    if (userRole === 'admin') return next('/')
    if (userRole === 'collector') return next('/collector/today')
    return next('/home')
  }

  next()
})

export default router
