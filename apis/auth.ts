import type { AuthResponse, User } from '~/types'

const API_BASE = '/api/auth'

export async function apiLogin(username: string, password: string): Promise<AuthResponse> {
  const { data } = await $fetch<{ success: boolean; data: AuthResponse }>(`${API_BASE}/login`, {
    method: 'POST',
    body: { username, password },
    credentials: 'include',  // 使用 HttpOnly Cookie
  })
  return data
}

export async function apiRegister(username: string, password: string, email?: string, nickname?: string): Promise<AuthResponse> {
  const { data } = await $fetch<{ success: boolean; data: AuthResponse }>(`${API_BASE}/register`, {
    method: 'POST',
    body: { username, password, email, nickname },
    credentials: 'include',
  })
  return data
}

export async function apiLogout(): Promise<void> {
  await $fetch(`${API_BASE}/logout`, { method: 'POST', credentials: 'include' })
}

export async function apiGetMe(): Promise<User> {
  const { data } = await $fetch<{ success: boolean; data: User }>(`${API_BASE}/me`, {
    credentials: 'include',
  })
  return data
}

export async function apiUpdateProfile(data: { nickname?: string; email?: string; avatar?: string }): Promise<User> {
  const resp = await $fetch<{ success: boolean; data: User }>(`${API_BASE}/profile`, {
    method: 'PUT',
    body: data,
    credentials: 'include',
  })
  return resp.data
}

export async function apiChangePassword(oldPassword: string, newPassword: string): Promise<void> {
  await $fetch(`${API_BASE}/password`, {
    method: 'PUT',
    body: { oldPassword, newPassword },
    credentials: 'include',
  })
}
