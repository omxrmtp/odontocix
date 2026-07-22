export type BudgetStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired'
export type DiscountType = 'percentage' | 'fixed'

export interface BudgetItem {
  id?: number
  treatment_id?: number | null
  description: string
  quantity: number
  unit_price: number
}

export interface Budget {
  id: number
  patient_id: number
  total: number | string
  discount_type: DiscountType
  discount_value: number | string
  valid_until?: string | null
  notes?: string | null
  status: BudgetStatus
  items?: BudgetItem[]
  items_count?: number
  patient?: {
    first_name?: string
    first_last_name?: string
  } | null
  created_at?: string
  updated_at?: string
}

export interface BudgetFormData {
  patient_id: number
  items: Array<{
    treatment_id?: number | null
    description: string
    quantity: number
    unit_price: number
  }>
  discount_type: DiscountType
  discount_value: number
  valid_until?: string | null
  notes?: string | null
}
