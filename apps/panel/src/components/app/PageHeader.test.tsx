import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/test-utils'
import PageHeader from './PageHeader'

describe('PageHeader', () => {
  it('renders title', () => {
    renderWithProviders(<PageHeader title="Pacientes" />)
    expect(screen.getByText('Pacientes')).toBeInTheDocument()
  })

  it('renders subtitle', () => {
    renderWithProviders(<PageHeader title="Pacientes" subtitle="Gestión de pacientes" />)
    expect(screen.getByText('Gestión de pacientes')).toBeInTheDocument()
  })

  it('renders back button when backTo is provided', () => {
    renderWithProviders(<PageHeader title="Pacientes" backTo="/" />)
    expect(screen.getByText('Volver')).toBeInTheDocument()
  })

  it('does not render back button when backTo is not provided', () => {
    renderWithProviders(<PageHeader title="Pacientes" />)
    expect(screen.queryByText('Volver')).not.toBeInTheDocument()
  })

  it('renders actions', () => {
    renderWithProviders(
      <PageHeader title="Pacientes" actions={<button>Action</button>} />,
    )
    expect(screen.getByText('Action')).toBeInTheDocument()
  })
})
