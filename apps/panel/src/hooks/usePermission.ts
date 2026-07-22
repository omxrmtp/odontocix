import { useAuth } from '@/contexts/AuthContext'

export function usePermission() {
  const { user } = useAuth()

  const roles = user?.roles?.map((r: any) => r.name) ?? []
  const isSuperAdmin = roles.includes('Super Admin')

  const can = (permission: string): boolean => {
    if (isSuperAdmin) return true
    if (!user?.permissions) return false
    return user.permissions.includes(permission)
  }

  const canView = (module: string) => can(`${module}.ver`)
  const canRead = (module: string) => canView(module) // backward compat: .leer removed
  const canEdit = (module: string) => can(`${module}.editar`)

  return {
    can,
    canView,
    canRead,
    canEdit,
    roles,
    isSuperAdmin,
  }
}
