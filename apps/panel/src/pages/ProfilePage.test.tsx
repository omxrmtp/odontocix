import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders } from '@/test/test-utils'
import ProfilePage from './ProfilePage'

vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({ canEdit: () => true, canRead: () => true, canView: () => true, isSuperAdmin: true }),
}))

describe('ProfilePage', () => {
  it('renders profile title', () => {
    const { getByText } = renderWithProviders(<ProfilePage />)
    expect(getByText('Perfil')).toBeInTheDocument()
  })
})
