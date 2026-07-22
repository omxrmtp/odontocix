import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders } from '@/test/test-utils'
import ConsentFormsPage from './ConsentFormsPage'

vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({ canEdit: () => true, canRead: () => true, canView: () => true, isSuperAdmin: true }),
}))

describe('ConsentFormsPage', () => {
  it('renders title and new consent button', () => {
    const { getByText } = renderWithProviders(<ConsentFormsPage />)
    expect(getByText('Consentimientos')).toBeInTheDocument()
    expect(getByText('Nuevo consentimiento')).toBeInTheDocument()
  })
})
