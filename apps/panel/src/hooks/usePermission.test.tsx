import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePermission } from './usePermission'

const mockUseAuth = vi.hoisted(() => vi.fn())

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: mockUseAuth,
}))

function makeUser(permissions: string[], roles: string[] = []) {
  return {
    id: 1,
    name: 'Test',
    email: 'test@test.com',
    is_active: true,
    tenant_id: null,
    roles: roles.map((name, id) => ({ id, name })),
    permissions,
  }
}

describe('usePermission', () => {
  it('returns false when no user', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false })
    const { result } = renderHook(() => usePermission())
    expect(result.current.can('any')).toBe(false)
    expect(result.current.canView('pacientes')).toBe(false)
    expect(result.current.canEdit('pacientes')).toBe(false)
    expect(result.current.roles).toEqual([])
    expect(result.current.isSuperAdmin).toBe(false)
  })

  it('returns false when user has no permissions', () => {
    mockUseAuth.mockReturnValue({
      user: makeUser([]),
      loading: false,
    })
    const { result } = renderHook(() => usePermission())
    expect(result.current.can('pacientes.ver')).toBe(false)
    expect(result.current.roles).toEqual([])
    expect(result.current.isSuperAdmin).toBe(false)
  })

  it('returns true when user has the exact permission', () => {
    mockUseAuth.mockReturnValue({
      user: makeUser(['pacientes.ver', 'pacientes.editar'], ['Doctor']),
      loading: false,
    })
    const { result } = renderHook(() => usePermission())
    expect(result.current.can('pacientes.ver')).toBe(true)
    expect(result.current.can('pacientes.editar')).toBe(true)
    expect(result.current.can('doctores.ver')).toBe(false)
    expect(result.current.roles).toEqual(['Doctor'])
    expect(result.current.isSuperAdmin).toBe(false)
  })

  it('Super Admin bypasses all permissions', () => {
    mockUseAuth.mockReturnValue({
      user: makeUser([], ['Super Admin']),
      loading: false,
    })
    const { result } = renderHook(() => usePermission())
    expect(result.current.can('anything.ver')).toBe(true)
    expect(result.current.canEdit('anything')).toBe(true)
    expect(result.current.isSuperAdmin).toBe(true)
  })

  it('canView checks module.ver', () => {
    mockUseAuth.mockReturnValue({
      user: makeUser(['pacientes.ver']),
      loading: false,
    })
    const { result } = renderHook(() => usePermission())
    expect(result.current.canView('pacientes')).toBe(true)
    expect(result.current.canView('citas')).toBe(false)
  })

  it('canEdit checks module.editar', () => {
    mockUseAuth.mockReturnValue({
      user: makeUser(['pacientes.editar']),
      loading: false,
    })
    const { result } = renderHook(() => usePermission())
    expect(result.current.canEdit('pacientes')).toBe(true)
    expect(result.current.canEdit('citas')).toBe(false)
  })
})
