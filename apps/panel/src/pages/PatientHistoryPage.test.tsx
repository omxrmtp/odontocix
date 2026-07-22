import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '@/test/test-utils'
import PatientHistoryPage from './PatientHistoryPage'

describe('PatientHistoryPage', () => {
  it('renders loading state initially', () => {
    const { container } = renderWithProviders(<PatientHistoryPage />, { initialEntries: ['/pacientes/1/historial'] })
    expect(container.querySelector('.animate-pulse')).toBeTruthy()
  })
})
