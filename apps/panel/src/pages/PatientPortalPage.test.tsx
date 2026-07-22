import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders } from '@/test/test-utils'
import PatientPortalPage from './PatientPortalPage'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ token: 'test-token' }),
  }
})

vi.mock('@/lib/endpoints', () => ({
  portalApi: {
    patient: () => Promise.resolve({
      id: 1,
      first_name: 'Juan',
      second_name: 'Carlos',
      first_last_name: 'Pérez',
      second_last_name: 'García',
      phone: '987654321',
      email: 'juan@test.com',
      dni: '12345678',
      tenant_name: 'Clínica Dental Test',
      tenant_phone: '999888777',
    }),
    appointments: () => Promise.resolve([]),
    history: () => Promise.resolve({ clinical_records: [], treatments: [] }),
    budgets: () => Promise.resolve([]),
  },
  downloadPortalHistoryPdf: () => Promise.resolve(new Blob(['pdf'])),
}))

describe('PatientPortalPage', () => {
  it('renders patient portal with name and tenant', async () => {
    const { getByText, findByText } = renderWithProviders(<PatientPortalPage />)
    expect(await findByText('Juan Carlos Pérez García')).toBeInTheDocument()
    expect(getByText('Clínica Dental Test')).toBeInTheDocument()
    expect(getByText('DNI: 12345678')).toBeInTheDocument()
  })

  it('shows quick action buttons', async () => {
    const { getByText, findByText } = renderWithProviders(<PatientPortalPage />)
    expect(await findByText('Confirmar cita')).toBeInTheDocument()
    expect(getByText('Descargar historia')).toBeInTheDocument()
  })
})