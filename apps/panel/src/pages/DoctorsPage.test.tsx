import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '@/test/test-utils'
import DoctorsPage from './DoctorsPage'

describe('DoctorsPage', () => {
  it('renders title and new doctor button', () => {
    const { getByText } = renderWithProviders(<DoctorsPage />)
    expect(getByText('Doctores')).toBeInTheDocument()
    expect(getByText('Nuevo doctor')).toBeInTheDocument()
  })
})
