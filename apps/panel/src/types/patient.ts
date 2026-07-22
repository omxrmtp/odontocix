import type { PaginationMeta } from './common'

export interface Patient {
  id: number
  dni: string
  first_name: string
  second_name?: string | null
  first_last_name: string
  second_last_name?: string | null
  birth_date?: string | null
  gender?: 'M' | 'F' | 'O' | null
  phone?: string | null
  email?: string | null
  address?: string | null
  reference?: string | null
  observations?: string | null
  created_at?: string
  updated_at?: string
}

export interface PatientFormData {
  dni: string
  first_name: string
  second_name?: string
  first_last_name: string
  second_last_name?: string
  birth_date?: string
  gender?: string
  phone?: string
  email?: string
  address?: string
  reference?: string
  observations?: string | null
}

export interface PatientListResponse {
  data: Patient[]
  meta: PaginationMeta
}
