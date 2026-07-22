export interface ClinicalRecord {
  id: number
  patient_id: number
  doctor_id?: number | null
  record_date?: string | null
  reason?: string | null
  diagnosis?: string | null
  notes?: string | null
  doctor?: {
    first_name?: string
    first_last_name?: string
  } | null
  created_at?: string
  updated_at?: string
}

export interface RecordFormData {
  doctor_id?: number | null
  record_date?: string
  reason?: string
  diagnosis?: string
  notes?: string
}
