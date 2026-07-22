import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '@/test/test-utils'
import AppointmentsPage from './AppointmentsPage'

describe('AppointmentsPage', () => {
  it('renders appointments title', () => {
    const { getByText } = renderWithProviders(<AppointmentsPage />)
    expect(getByText('Citas')).toBeInTheDocument()
  })
})
