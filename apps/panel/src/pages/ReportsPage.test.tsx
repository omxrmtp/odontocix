import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders } from '@/test/test-utils'
import ReportsPage from './ReportsPage'

vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({ canEdit: () => true, canRead: () => true, canView: () => true, isSuperAdmin: true }),
}))

describe('ReportsPage', () => {
  it('renders title and tabs', () => {
    const { getByText } = renderWithProviders(<ReportsPage />)
    expect(getByText('Reportes')).toBeInTheDocument()
    expect(getByText('Ingresos')).toBeInTheDocument()
    expect(getByText('Tratamientos')).toBeInTheDocument()
    expect(getByText('Doctores')).toBeInTheDocument()
    expect(getByText('Pacientes')).toBeInTheDocument()
  })
})
