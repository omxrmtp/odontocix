import type { User } from '@/lib/auth'

export type { User }

export interface Tenant {
  id: number
  name: string
  ruc?: string | null
  phone?: string | null
  address?: string | null
  email?: string | null
}
