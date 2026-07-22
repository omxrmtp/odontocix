import api, { setToken } from './api'

export interface User {
  id: number
  name: string
  email: string
  is_active: boolean
  tenant_id: string | null
  roles: { id: number; name: string }[]
  permissions: string[]
  tenant?: { id: string; name: string; ruc: string; phone: string; address: string; email: string }
}

export async function login(email: string, password: string): Promise<User> {
  const { data } = await api.post<User & { token: string }>('/auth/login', { email, password })
  setToken(data.token)
  const { token: _token, ...user } = data
  return user
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout')
  } catch {
    // ignore
  }
  setToken(null)
}

export async function getUser(): Promise<User> {
  const token = localStorage.getItem('token')
  if (!token) throw new Error('Not authenticated')
  const { data } = await api.get<User>('/user')
  return data
}

export async function registerClinic(data: Record<string, unknown>): Promise<{ user: User; token: string }> {
  const { data: res } = await api.post<User & { token: string }>('/auth/register', data)
  const { token, ...user } = res
  setToken(token)
  return { user, token }
}
