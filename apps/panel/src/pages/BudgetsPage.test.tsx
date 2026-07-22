import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '@/test/test-utils'
import BudgetsPage from './BudgetsPage'

describe('BudgetsPage', () => {
  it('renders title and new budget button', () => {
    const { getByText } = renderWithProviders(<BudgetsPage />)
    expect(getByText('Presupuestos')).toBeInTheDocument()
    expect(getByText('Nuevo presupuesto')).toBeInTheDocument()
  })
})
