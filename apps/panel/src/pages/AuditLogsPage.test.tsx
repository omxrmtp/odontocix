import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders } from '@/test/test-utils'
import AuditLogsPage from './AuditLogsPage'

vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({ canEdit: () => true, canRead: () => true, canView: () => true, isSuperAdmin: true }),
}))

describe('AuditLogsPage', () => {
  it('renders title and clear filters button', () => {
    const { getByText } = renderWithProviders(<AuditLogsPage />)
    expect(getByText('Log de Auditoría')).toBeInTheDocument()
    expect(getByText('Limpiar filtros')).toBeInTheDocument()
  })
})
