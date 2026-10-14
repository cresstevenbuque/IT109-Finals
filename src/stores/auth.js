/**
 * Auth Store — manages authentication state, login, register, logout.
 * Uses Supabase Auth and syncs the profile from the profiles table.
 * @module stores/auth
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/services/supabaseClient.js'

export const useAuthStore = defineStore('auth', () => {
  /** @type {import('vue').Ref<import('@supabase/supabase-js').User|null>} */
  const user = ref(null)

  /** @type {import('vue').Ref<Object|null>} Profile row from profiles table */
  const profile = ref(null)

  /** @type {import('vue').Ref<boolean>} */
  const loading = ref(true)

  /** @type {import('vue').Ref<string|null>} */
  const error = ref(null)

  const isAuthenticated = computed(() => !!user.value)
  const role = computed(() => profile.value?.role || 'resident')
  const isAdmin = computed(() => role.value === 'admin')
  const isCollector = computed(() => role.value === 'collector')
  const isResident = computed(() => role.value === 'resident')

  /**
   * Fetch the profile row for the given user ID.
   * @param {string} userId
   */
  async function fetchProfile(userId) {
    try {
      const { data, error: err } = await supabase
        .from('profiles')
        .select('*, purok:puroks(name)')
        .eq('id', userId)
        .single()

      if (err) throw err
      profile.value = data
    } catch (err) {
      console.error('Failed to fetch profile:', err.message)
      profile.value = null
    }
  }

  /**
   * Initialize auth state — call once on app mount.
   * Sets up the auth state change listener.
   */
  async function initialize() {
    loading.value = true
    try {
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        user.value = session.user
        await fetchProfile(session.user.id)
      }

      // Listen for auth changes (login, logout, token refresh)
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          user.value = session.user
          await fetchProfile(session.user.id)
        } else if (event === 'SIGNED_OUT') {
          user.value = null
          profile.value = null
        }
      })
    } catch (err) {
      console.error('Auth initialization error:', err.message)
    } finally {
      loading.value = false
    }
  }

  /**
   * Sign in with email and password.
   * @param {string} email
   * @param {string} password
   * @throws {Error} On invalid credentials
   */
  async function login(email, password) {
    error.value = null
    loading.value = true
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (err) throw err
      user.value = data.user
      await fetchProfile(data.user.id)
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Register a new user account.
   * @param {Object} params
   * @param {string} params.email
   * @param {string} params.password
   * @param {string} params.fullName
   * @param {string} [params.role='resident']
   * @param {string} [params.phone]
   */
  async function register({ email, password, fullName, role = 'resident', phone }) {
    error.value = null
    loading.value = true
    try {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
          },
        },
      })
      if (err) throw err

      // Update phone in profile if provided
      if (phone && data.user) {
        await supabase
          .from('profiles')
          .update({ phone })
          .eq('id', data.user.id)
      }

      user.value = data.user
      if (data.user) await fetchProfile(data.user.id)
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Sign out the current user.
   */
  async function logout() {
    await supabase.auth.signOut()
    user.value = null
    profile.value = null
  }

  /**
   * Update the current user's profile.
   * @param {Object} updates - Partial profile fields to update
   */
  async function updateProfile(updates) {
    if (!user.value) return
    try {
      const { error: err } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.value.id)

      if (err) throw err
      await fetchProfile(user.value.id)
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  return {
    user,
    profile,
    loading,
    error,
    isAuthenticated,
    role,
    isAdmin,
    isCollector,
    isResident,
    initialize,
    login,
    register,
    logout,
    fetchProfile,
    updateProfile,
  }
})
