export type PaymentMethod = 'cash' | 'card' | 'transfer'

export interface Payment {
  id: number
  budget_id: number
  amount: number | string
  payment_method: PaymentMethod
  reference?: string | null
  notes?: string | null
  paid_at?: string | null
  budget?: {
    patient?: {
      first_name?: string
      first_last_name?: string
    } | null
  } | null
  created_at?: string
  updated_at?: string
}

export interface PaymentFormData {
  budget_id: number
  amount: number
  payment_method: PaymentMethod
  reference?: string | null
  notes?: string | null
}

export interface BudgetBalance {
  total: number | string
  paid: number | string
  balance: number | string
}
