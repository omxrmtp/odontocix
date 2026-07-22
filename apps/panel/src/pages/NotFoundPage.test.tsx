import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '@/test/test-utils'
import NotFoundPage from './NotFoundPage'

describe('NotFoundPage', () => {
  it('renders 404 and back button', () => {
    const { getByText } = renderWithProviders(<NotFoundPage />)
    expect(getByText('404')).toBeInTheDocument()
    expect(getByText('Volver al dashboard')).toBeInTheDocument()
  })
})
