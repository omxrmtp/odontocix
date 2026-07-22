import type { PaginationMeta } from './common'

export interface Doctor {
  id: number
  dni?: string | null
  first_name: string
  second_name?: string | null
  first_last_name: string
  second_last_name?: string | null
  cmp?: string | null
  email?: string | null
  phone?: string | null
  created_at?: string
  updated_at?: string
}

export interface DoctorFormData {
  dni?: string
  first_name: string
  second_name?: string
  first_last_name: string
  second_last_name?: string
  cmp?: string
  email?: string
  phone?: string
}

export interface DoctorListResponse {
  data: Doctor[]
  meta: PaginationMeta
}
