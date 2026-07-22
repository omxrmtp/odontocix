import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders } from '@/test/test-utils'
import InventoryPage from './InventoryPage'

vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({ canEdit: () => true, canRead: () => true, canView: () => true, isSuperAdmin: true }),
}))

describe('InventoryPage', () => {
  it('renders title', () => {
    const { getByText } = renderWithProviders(<InventoryPage />)
    expect(getByText('Inventario')).toBeInTheDocument()
  })
})
