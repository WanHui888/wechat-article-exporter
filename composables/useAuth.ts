import { ref, computed } from 'vue'
import type { User } from '~/types'
import { apiLogin, apiRegister, apiLogout, apiGetMe, apiUpdateProfile, apiChangePassword } from '~/apis/auth'

const user = ref<User | null>(null)
const token = ref<string | null>(null)
const loading = ref(false)

export function useAuth() {
  const isLoggedIn = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  async function login(username: string, password: string) {
    loading.value = true
    try {
      const result = await apiLogin(username, password)
      user.value = result.user
      token.value = result.token
      localStorage.setItem('auth_token', result.token)
      return result
    } finally {
      loading.value = false
    }
  }

  async function register(username: string, password: string, email?: string, nickname?: string) {
    loading.value = true
    try {
      const result = await apiRegister(username, password, email, nickname)
      user.value = result.user
      token.value = result.token
      localStorage.setItem('auth_token', result.token)
      return result
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      await apiLogout()
    } catch {
      // ignore
    }
    user.value = null
    token.value = null
    localStorage.removeItem('auth_token')
    navigateTo('/login')
  }

  async function fetchUser() {
    const savedToken = localStorage.getItem('auth_token')
    if (!savedToken) return null

    token.value = savedToken
    try {
      user.value = await apiGetMe()
      return user.value
    } catch {
      localStorage.removeItem('auth_token')
      token.value = null
      return null
    }
  }

  async function updateProfile(data: { nickname?: string; email?: string; avatar?: string }) {
    const updated = await apiUpdateProfile(data)
    user.value = updated
    return updated
  }

  async function changePassword(oldPassword: string, newPassword: string) {
    await apiChangePassword(oldPassword, newPassword)
  }

  function getAuthHeaders(): Record<string, string> {
    const t = token.value || localStorage.getItem('auth_token')
    if (t) {
      return { Authorization: `Bearer ${t}` }
    }
    return {}
  }

  return {
    user,
    token,
    loading,
    isLoggedIn,
    isAdmin,
    login,
    register,
    logout,
    fetchUser,
    updateProfile,
    changePassword,
    getAuthHeaders,
  }
}
