import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '@/test/test-utils'
import TreatmentsPage from './TreatmentsPage'

describe('TreatmentsPage', () => {
  it('renders title and new treatment button', () => {
    const { getByText } = renderWithProviders(<TreatmentsPage />)
    expect(getByText('Tratamientos')).toBeInTheDocument()
    expect(getByText('Nuevo tratamiento')).toBeInTheDocument()
  })
})
