import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '@/test/test-utils'
import PatientsPage from './PatientsPage'

describe('PatientsPage', () => {
  it('renders title and new patient button', () => {
    const { getByText } = renderWithProviders(<PatientsPage />)
    expect(getByText('Pacientes')).toBeInTheDocument()
    expect(getByText('Nuevo paciente')).toBeInTheDocument()
  })
})
