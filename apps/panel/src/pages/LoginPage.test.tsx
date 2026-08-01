import { describe, it, expect, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/test-utils'
import LoginPage from './LoginPage'

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  demoLogin: vi.fn(),
  logout: vi.fn(),
  getUser: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  login: mocks.login,
  demoLogin: mocks.demoLogin,
  logout: mocks.logout,
  getUser: mocks.getUser,
}))

describe('LoginPage', () => {
  it('renders login form with heading, submit and demo button', () => {
    const { getByText, getByPlaceholderText } = renderWithProviders(<LoginPage />, { initialEntries: ['/login'] })
    expect(getByText('OdontoCix')).toBeInTheDocument()
    expect(getByText('Ingresar')).toBeInTheDocument()
    expect(getByText('Probar demo')).toBeInTheDocument()
    expect(getByPlaceholderText('Email')).toBeInTheDocument()
    expect(getByPlaceholderText('Contraseña')).toBeInTheDocument()
  })

  it('submits the form with email and password', async () => {
    mocks.login.mockResolvedValue({ id: 1, name: 'Admin', email: 'admin@test.com', is_demo: false, roles: [], permissions: [] })
    const { getByPlaceholderText, getByText } = renderWithProviders(<LoginPage />, { initialEntries: ['/login'] })
    const emailInput = getByPlaceholderText('Email')
    const passwordInput = getByPlaceholderText('Contraseña')

    fireEvent.change(emailInput, { target: { value: 'admin@test.com' } })
    fireEvent.change(passwordInput, { target: { value: 'secret' } })
    fireEvent.click(getByText('Ingresar'))

    await waitFor(() => expect(mocks.login).toHaveBeenCalledWith('admin@test.com', 'secret'))
  })

  it('logs into the demo when clicking the demo button', async () => {
    mocks.demoLogin.mockResolvedValue({ id: 1, name: 'Demo', email: 'demo@odontocix.com', is_demo: true, roles: [], permissions: [] })
    const { getByText } = renderWithProviders(<LoginPage />, { initialEntries: ['/login'] })

    fireEvent.click(getByText('Probar demo'))

    await waitFor(() => expect(mocks.demoLogin).toHaveBeenCalled())
  })
})
