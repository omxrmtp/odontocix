import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '@/test/test-utils'
import CashPage from './CashPage'

describe('CashPage', () => {
  it('renders title and register button', () => {
    const { getByText } = renderWithProviders(<CashPage />)
    expect(getByText('Caja')).toBeInTheDocument()
  })
})
