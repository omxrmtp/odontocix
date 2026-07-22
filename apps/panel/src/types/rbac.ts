export type Permission = string

export interface Role {
  id: number
  name: string
  guard_name?: string
  permissions?: { id: number; name: string; guard_name: string }[]
}

export interface RoleFormPermissions {
  [module: string]: {
    ver?: boolean
    editar?: boolean
  }
}

export interface ModulePermissions {
  module: string
  permissions: string[]
}

export interface UserWithRoles {
  id: number
  name: string
  email: string
  is_active: boolean
  roles?: { id: number; name: string }[]
  tenant_id?: string | null
}
