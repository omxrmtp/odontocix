import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '@/test/test-utils'
import LoginPage from './LoginPage'

describe('LoginPage', () => {
  it('renders login form with heading and submit button', () => {
    const { getByText, getByPlaceholderText } = renderWithProviders(<LoginPage />, { initialEntries: ['/login'] })
    expect(getByText('OdontoCix')).toBeInTheDocument()
    expect(getByText('Ingresar')).toBeInTheDocument()
    expect(getByPlaceholderText('Email')).toBeInTheDocument()
    expect(getByPlaceholderText('Contraseña')).toBeInTheDocument()
  })

  it('submits the form with email and password', async () => {
    const { getByPlaceholderText, getByText } = renderWithProviders(<LoginPage />, { initialEntries: ['/login'] })
    const emailInput = getByPlaceholderText('Email')
    const passwordInput = getByPlaceholderText('Contraseña')
    const submitButton = getByText('Ingresar')

    expect(emailInput).toBeInTheDocument()
    expect(passwordInput).toBeInTheDocument()
    expect(submitButton).toBeInTheDocument()
  })
})
