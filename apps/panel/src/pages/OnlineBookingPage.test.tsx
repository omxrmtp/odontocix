import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '@/test/test-utils'
import OnlineBookingPage from './OnlineBookingPage'

describe('OnlineBookingPage', () => {
  it('renders title and clinic code input without tenant_id', () => {
    const { getByText, getByPlaceholderText } = renderWithProviders(<OnlineBookingPage />, { initialEntries: ['/reservar'] })
    expect(getByText('Reservar cita')).toBeInTheDocument()
    expect(getByPlaceholderText('Código de clínica')).toBeInTheDocument()
  })

  it('renders doctor selection step when tenant_id is present', () => {
    const { getByText } = renderWithProviders(<OnlineBookingPage />, { initialEntries: ['/reservar?tenant_id=test'] })
    expect(getByText('Reservar cita')).toBeInTheDocument()
    expect(getByText('Selecciona un doctor')).toBeInTheDocument()
  })
})
