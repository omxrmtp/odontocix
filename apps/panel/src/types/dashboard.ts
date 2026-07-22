export interface DashboardStats {
  patients_today?: number
  appointments_today?: number
  income_today?: number
  pending_appointments?: number
}

export interface ChartPoint {
  date?: string
  month?: string
  count?: number
  income?: number
  expenses?: number
}

export interface LatestAppointment {
  id: number
  patient: string
  doctor: string
  date: string
  status: string
}

export interface LatestPayment {
  id: number
  patient: string
  method: string
  date: string
  amount: number | string
}

export interface TopTreatment {
  name: string
  count: number
}

export interface DashboardCharts {
  appointments_per_day?: ChartPoint[]
  income_vs_expenses?: ChartPoint[]
  latest_appointments?: LatestAppointment[]
  latest_payments?: LatestPayment[]
  top_treatments?: TopTreatment[]
}
