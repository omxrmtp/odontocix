export interface Treatment {
  id: number
  name: string
  description?: string | null
  base_price?: number | string | null
  estimated_duration_min?: number | null
  created_at?: string
  updated_at?: string
}

export interface TreatmentFormData {
  name: string
  description?: string
  base_price?: number | null
  estimated_duration_min?: number | null
}
