import api from './api'

export interface User {
  id: number
  name: string
  email: string
  tenant_id: string | null
  roles: string[]
}

export async function login(email: string, password: string): Promise<User> {
  await api.get('/sanctum/csrf-cookie')
  await api.post('/auth/login', { email, password })
  return getUser()
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout')
}

export async function getUser(): Promise<User> {
  const { data } = await api.get<User>('/user')
  return data
}

export async function registerClinic(data: Record<string, unknown>): Promise<User> {
  await api.get('/sanctum/csrf-cookie')
  const { data: user } = await api.post<User>('/auth/register', data)
  return user
}
