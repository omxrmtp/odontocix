import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '@/test/test-utils'
import SettingsPage from './SettingsPage'

describe('SettingsPage', () => {
  it('renders title and tabs', () => {
    const { getByText } = renderWithProviders(<SettingsPage />)
    expect(getByText('Configuración')).toBeInTheDocument()
    expect(getByText('Usuarios')).toBeInTheDocument()
    expect(getByText('Roles y Permisos')).toBeInTheDocument()
    expect(getByText('Datos de la Clínica')).toBeInTheDocument()
  })
})
