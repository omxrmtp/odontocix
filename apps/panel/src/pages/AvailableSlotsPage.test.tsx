import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '@/test/test-utils'
import AvailableSlotsPage from './AvailableSlotsPage'

describe('AvailableSlotsPage', () => {
  it('renders availability title', () => {
    const { getByText } = renderWithProviders(<AvailableSlotsPage />)
    expect(getByText('Disponibilidad')).toBeInTheDocument()
  })
})
