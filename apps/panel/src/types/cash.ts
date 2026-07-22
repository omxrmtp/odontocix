export type CashType = 'income' | 'expense'

export interface CashTransaction {
  id: number
  type: CashType
  category: string
  amount: number | string
  description?: string | null
  created_at?: string
  updated_at?: string
}

export interface CashFormData {
  type: CashType
  category: string
  amount: number
  description?: string
}

export interface CashSummary {
  income: number | string
  expenses: number | string
  balance: number | string
  by_category?: Record<
    string,
    {
      total: number
      count: number
    }
  >
}
