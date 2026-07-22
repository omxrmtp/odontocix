import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '@/test/test-utils'
import PaymentsPage from './PaymentsPage'

describe('PaymentsPage', () => {
  it('renders title and register payment button', () => {
    const { getByText } = renderWithProviders(<PaymentsPage />)
    expect(getByText('Pagos')).toBeInTheDocument()
    expect(getByText('Registrar pago')).toBeInTheDocument()
  })
})
