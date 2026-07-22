import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/test-utils'
import EmptyState from './EmptyState'

describe('EmptyState', () => {
  it('renders title', () => {
    renderWithProviders(<EmptyState title="No hay datos" />)
    expect(screen.getByText('No hay datos')).toBeInTheDocument()
  })

  it('renders description', () => {
    renderWithProviders(
      <EmptyState title="No hay datos" description="No se encontraron registros" />,
    )
    expect(screen.getByText('No se encontraron registros')).toBeInTheDocument()
  })

  it('renders custom icon', () => {
    renderWithProviders(
      <EmptyState title="No hay datos" icon={<span data-testid="custom-icon">Icon</span>} />,
    )
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })

  it('renders default icon when no custom icon is provided', () => {
    const { container } = renderWithProviders(<EmptyState title="No hay datos" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders action', () => {
    renderWithProviders(
      <EmptyState title="No hay datos" action={<button>Agregar</button>} />,
    )
    expect(screen.getByText('Agregar')).toBeInTheDocument()
  })
})
