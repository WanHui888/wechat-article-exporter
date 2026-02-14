import type { AuthResponse, User } from '~/types'

const API_BASE = '/api/auth'

function getAuthHeaders(): Record<string, string> {
  if (import.meta.server) return {}
  const token = localStorage.getItem('auth_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function apiLogin(username: string, password: string): Promise<AuthResponse> {
  const { data } = await $fetch<{ success: boolean; data: AuthResponse }>(`${API_BASE}/login`, {
    method: 'POST',
    body: { username, password },
  })
  return data
}

export async function apiRegister(username: string, password: string, email?: string, nickname?: string): Promise<AuthResponse> {
  const { data } = await $fetch<{ success: boolean; data: AuthResponse }>(`${API_BASE}/register`, {
    method: 'POST',
    body: { username, password, email, nickname },
  })
  return data
}

export async function apiLogout(): Promise<void> {
  await $fetch(`${API_BASE}/logout`, { method: 'POST', headers: getAuthHeaders() })
}

export async function apiGetMe(): Promise<User> {
  const { data } = await $fetch<{ success: boolean; data: User }>(`${API_BASE}/me`, {
    headers: getAuthHeaders(),
  })
  return data
}

export async function apiUpdateProfile(data: { nickname?: string; email?: string; avatar?: string }): Promise<User> {
  const resp = await $fetch<{ success: boolean; data: User }>(`${API_BASE}/profile`, {
    method: 'PUT',
    body: data,
    headers: getAuthHeaders(),
  })
  return resp.data
}

export async function apiChangePassword(oldPassword: string, newPassword: string): Promise<void> {
  await $fetch(`${API_BASE}/password`, {
    method: 'PUT',
    body: { oldPassword, newPassword },
    headers: getAuthHeaders(),
  })
}
