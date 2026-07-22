import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '@/test/test-utils'
import PatientFormPage from './PatientFormPage'

describe('PatientFormPage', () => {
  it('renders new patient form', () => {
    const { getByText } = renderWithProviders(<PatientFormPage />)
    expect(getByText('Nuevo paciente')).toBeInTheDocument()
    expect(getByText('Guardar')).toBeInTheDocument()
  })
})
