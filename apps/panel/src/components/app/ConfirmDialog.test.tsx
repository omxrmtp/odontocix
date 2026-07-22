import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/test-utils'
import ConfirmDialog from './ConfirmDialog'

describe('ConfirmDialog', () => {
  it('renders title and description', () => {
    renderWithProviders(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Eliminar paciente"
        description="¿Está seguro de que desea eliminar?"
        onConfirm={() => {}}
      />,
    )
    expect(screen.getByText('Eliminar paciente')).toBeInTheDocument()
    expect(screen.getByText('¿Está seguro de que desea eliminar?')).toBeInTheDocument()
  })

  it('renders default button labels', () => {
    renderWithProviders(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Confirmar acción"
        description="¿Está seguro?"
        onConfirm={() => {}}
      />,
    )
    expect(screen.getByText('Cancelar')).toBeInTheDocument()
    expect(screen.getByText('Eliminar')).toBeInTheDocument()
  })

  it('renders custom button labels', () => {
    renderWithProviders(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Eliminar"
        description="¿Seguro?"
        confirmLabel="Sí, eliminar"
        cancelLabel="No"
        onConfirm={() => {}}
      />,
    )
    expect(screen.getByText('No')).toBeInTheDocument()
    expect(screen.getByText('Sí, eliminar')).toBeInTheDocument()
  })
})
