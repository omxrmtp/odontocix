export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export interface Appointment {
  id: number
  patient_id: number
  doctor_id?: number | null
  start_date: string
  end_date?: string | null
  reason?: string | null
  status: AppointmentStatus
  patient?: {
    first_name?: string
    first_last_name?: string
  } | null
  doctor?: {
    first_name?: string
    first_last_name?: string
  } | null
  created_at?: string
  updated_at?: string
}

export interface AppointmentFormData {
  patient_id: number
  doctor_id?: number | null
  start_date: string
  end_date?: string | null
  reason?: string
  status: AppointmentStatus
}

export interface WhatsAppLinks {
  patient_link: string
  doctor_link: string
}
