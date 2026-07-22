import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi, rolesApi, profileApi } from '@/lib/endpoints'
import { usePermission } from '@/hooks/usePermission'
import PageHeader from '@/components/app/PageHeader'
import SkeletonTable from '@/components/app/SkeletonTable'
import MobileCardList from '@/components/app/MobileCardList'
import ConfirmDialog from '@/components/app/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { Role, RoleFormPermissions, ModulePermissions, UserWithRoles } from '@/types/rbac'

const SYSTEM_ROLES = ['Super Admin', 'Admin Clinica']

function getUserRoleName(u: UserWithRoles): string {
  return u.roles?.[0]?.name ?? ''
}

function transformRolePermissions(perms: { name: string }[]): RoleFormPermissions {
  const result: RoleFormPermissions = {}
  for (const p of perms) {
    const [module, action] = p.name.split('.')
    if (!result[module]) result[module] = {}
    if (action === 'ver' || action === 'editar') {
      result[module][action] = true
    }
  }
  return result
}

function flattenPermissions(perms: RoleFormPermissions): string[] {
  const result: string[] = []
  for (const [module, actions] of Object.entries(perms)) {
    if (actions.ver) result.push(`${module}.ver`)
    if (actions.editar) result.push(`${module}.editar`)
  }
  return result
}

function useUsersQuery() {
  return useQuery({ queryKey: ['users'], queryFn: () => usersApi.list() })
}

function useRolesQuery() {
  return useQuery({ queryKey: ['roles'], queryFn: () => rolesApi.list() })
}

function usePermissionsQuery() {
  return useQuery({ queryKey: ['permissions'], queryFn: () => rolesApi.permissions() })
}

function UsersTab() {
  const { can } = usePermission()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserWithRoles | null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: users, isPending } = useUsersQuery()
  const { data: roles } = useRolesQuery()

  const roleOptions = (roles ?? []).filter((r: Role) => !SYSTEM_ROLES.includes(r.name))

  const createMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => usersApi.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setDialogOpen(false)
      toast.success('Usuario creado')
      resetForm()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al crear usuario'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setDialogOpen(false)
      toast.success('Usuario actualizado')
      resetForm()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al actualizar usuario'),
  })

  const assignRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) => usersApi.assignRole(id, role),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success('Rol actualizado') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al cambiar rol'),
  })

  const toggleActiveMutation = useMutation({
    mutationFn: (id: number) => usersApi.toggleActive(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success('Estado actualizado') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al cambiar estado'),
  })

  const resetForm = () => {
    setEditUser(null)
    setForm({ name: '', email: '', password: '', role: '' })
    setErrors({})
  }

  const openNew = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (u: UserWithRoles) => {
    setEditUser(u)
    setForm({
      name: u.name ?? '',
      email: u.email ?? '',
      password: '',
      role: getUserRoleName(u),
    })
    setErrors({})
    setDialogOpen(true)
  }

  const handleSave = () => {
    setErrors({})
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Nombre es requerido'
    if (!form.email.trim()) errs.email = 'Email es requerido'
    if (!editUser && !form.password.trim()) errs.password = 'Contraseña es requerida'
    if (!form.role.trim()) errs.role = 'Rol es requerido'
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    const data = { name: form.name, email: form.email, role: form.role }
    if (!editUser) {
      createMutation.mutate({ ...data, password: form.password })
    } else {
      const updateData: Record<string, unknown> = { name: form.name, email: form.email }
      if (form.password.trim()) updateData.password = form.password
      updateMutation.mutate({ id: editUser.id, data: updateData })
      if (form.role !== getUserRoleName(editUser)) {
        assignRoleMutation.mutate({ id: editUser.id, role: form.role })
      }
    }
  }

  if (!can('configuracion.ver')) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground py-8">
          Sin permisos para ver usuarios
        </CardContent>
      </Card>
    )
  }

  const items = (users ?? []) as UserWithRoles[]

  return (
    <div className="space-y-4">
      {can('configuracion.editar') && (
        <div className="flex justify-end">
          <Button onClick={openNew}>Nuevo Usuario</Button>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                {can('configuracion.editar') && <TableHead className="w-48">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <TableRow><TableCell colSpan={can('configuracion.editar') ? 5 : 4}><SkeletonTable columns={4} rows={3} /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={can('configuracion.editar') ? 5 : 4} className="text-center text-muted-foreground py-8">No hay usuarios registrados</TableCell></TableRow>
              ) : (
                items.map((u) => (
                  <TableRow key={u.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      {can('configuracion.editar') && !SYSTEM_ROLES.includes(getUserRoleName(u)) ? (
                        <Select
                          value={getUserRoleName(u)}
                          onValueChange={(role) => assignRoleMutation.mutate({ id: u.id, role })}
                        >
                          <SelectTrigger className="h-7 w-auto min-w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {roleOptions.map((r: Role) => (
                              <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary">{getUserRoleName(u) || '-'}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.is_active ? 'default' : 'outline'}>{u.is_active ? 'Activo' : 'Inactivo'}</Badge>
                    </TableCell>
                    {can('configuracion.editar') && (
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          <Button variant="outline" size="sm" onClick={() => openEdit(u)}>Editar</Button>
                          <Button
                            variant={u.is_active ? 'destructive' : 'default'}
                            size="sm"
                            onClick={() => toggleActiveMutation.mutate(u.id)}
                          >
                            {u.is_active ? 'Desactivar' : 'Activar'}
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>

          <MobileCardList
            items={items}
            keyFn={(u) => u.id}
            renderCard={(u) => (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{u.name}</span>
                  <Badge variant={u.is_active ? 'default' : 'outline'} size="sm">{u.is_active ? 'Activo' : 'Inactivo'}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{u.email}</div>
                <div className="text-xs text-muted-foreground">Rol: {getUserRoleName(u) || '-'}</div>
                {can('configuracion.editar') && (
                  <div className="flex gap-1 pt-1 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => openEdit(u)}>Editar</Button>
                    <Button
                      variant={u.is_active ? 'destructive' : 'default'}
                      size="sm"
                      onClick={() => toggleActiveMutation.mutate(u.id)}
                    >
                      {u.is_active ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                )}
              </>
            )}
          />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
          <DialogHeader><DialogTitle>{editUser ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); if (errors.name) setErrors(p => { const n = { ...p }; delete n.name; return n }) }} className={errors.name ? 'border-red-500' : ''} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => { setForm(f => ({ ...f, email: e.target.value })); if (errors.email) setErrors(p => { const n = { ...p }; delete n.email; return n }) }} className={errors.email ? 'border-red-500' : ''} />
            </div>
            <div className="space-y-1">
              <Label>Contraseña {editUser && <span className="text-muted-foreground">(dejar en blanco para no cambiar)</span>}</Label>
              <Input type="password" value={form.password} onChange={e => { setForm(f => ({ ...f, password: e.target.value })); if (errors.password) setErrors(p => { const n = { ...p }; delete n.password; return n }) }} className={errors.password ? 'border-red-500' : ''} />
            </div>
            <div className="space-y-1">
              <Label>Rol</Label>
              <Select value={form.role} onValueChange={role => { setForm(f => ({ ...f, role })); if (errors.role) setErrors(p => { const n = { ...p }; delete n.role; return n }) }}>
                <SelectTrigger className={errors.role ? 'border-red-500' : ''}><SelectValue placeholder="Seleccionar rol" /></SelectTrigger>
                <SelectContent>
                  {roleOptions.map((r: Role) => (
                    <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface RoleItem {
  id: number
  name: string
  permissions?: { name: string }[]
}

function RolesTab() {
  const { can } = usePermission()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editRole, setEditRole] = useState<RoleItem | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [roleName, setRoleName] = useState('')
  const [rolePerms, setRolePerms] = useState<RoleFormPermissions>({})

  const { data: roles, isPending } = useRolesQuery()
  const { data: permissionsData } = usePermissionsQuery()

  const modules = useMemo(() => {
    const perms = permissionsData as ModulePermissions[] | undefined
    return (perms ?? []).map(m => m.module).sort()
  }, [permissionsData])

  const createMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => rolesApi.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setDialogOpen(false)
      toast.success('Rol creado')
      resetForm()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al crear rol'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => rolesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setDialogOpen(false)
      toast.success('Rol actualizado')
      resetForm()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al actualizar rol'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => rolesApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['roles'] }); toast.success('Rol eliminado') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al eliminar rol'),
  })

  const resetForm = () => {
    setEditRole(null)
    setRoleName('')
    setRolePerms({})
  }

  const openNew = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (r: RoleItem) => {
    setEditRole(r)
    setRoleName(r.name)
    setRolePerms(transformRolePermissions(r.permissions ?? []))
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!roleName.trim()) return toast.error('Nombre del rol es requerido')
    const data = { name: roleName.trim(), permissions: flattenPermissions(rolePerms) }
    if (editRole) updateMutation.mutate({ id: editRole.id, data })
    else createMutation.mutate(data)
  }

  const togglePerm = (module: string, action: 'ver' | 'editar') => {
    setRolePerms(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: !prev[module]?.[action],
      },
    }))
  }

  const isSystemRole = (name: string) => SYSTEM_ROLES.includes(name)

  if (!can('configuracion.editar')) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground py-8">
          Sin permisos para ver roles y permisos
        </CardContent>
      </Card>
    )
  }

  const items = (roles ?? []) as RoleItem[]

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew}>Crear Rol</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card z-10">Rol</TableHead>
                  {modules.map((m) => (
                    <TableHead key={m} className="text-center capitalize min-w-[100px]">{m}</TableHead>
                  ))}
                  <TableHead className="w-32 sticky right-0 bg-card z-10">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isPending ? (
                  <TableRow><TableCell colSpan={modules.length + 2}><SkeletonTable columns={Math.min(modules.length + 1, 5)} rows={3} /></TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={modules.length + 2} className="text-center text-muted-foreground py-8">No hay roles registrados</TableCell></TableRow>
                ) : (
                  items.map((r) => {
                    const systemRole = isSystemRole(r.name)
                    const perms = transformRolePermissions(r.permissions ?? [])
                    return (
                      <TableRow key={r.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-medium sticky left-0 bg-card z-10">{r.name}</TableCell>
                        {modules.map((m) => {
                          if (systemRole) {
                            return (
                              <TableCell key={m} className="text-center">
                                <div className="flex justify-center gap-2 text-xs text-muted-foreground">
                                  <span className="line-through opacity-50">ver</span>
                                  <span className="line-through opacity-50">editar</span>
                                </div>
                                <div className="text-xs text-green-600 font-medium mt-0.5">Todos</div>
                              </TableCell>
                            )
                          }
                          return (
                            <TableCell key={m} className="text-center">
                              <div className="flex justify-center gap-2 text-xs">
                                {(['ver', 'editar'] as const).map((action) => (
                                  <label key={action} className="flex items-center gap-0.5 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={!!perms[m]?.[action]}
                                      disabled
                                      className="h-3 w-3 accent-primary"
                                    />
                                    <span className="capitalize">{action}</span>
                                  </label>
                                ))}
                              </div>
                            </TableCell>
                          )
                        })}
                        <TableCell className="sticky right-0 bg-card z-10">
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" onClick={() => openEdit(r)} disabled={systemRole}>Editar</Button>
                            {!systemRole && (
                              <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(r.id)}>Eliminar</Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <MobileCardList
            items={items}
            keyFn={(r) => r.id}
            renderCard={(r) => {
              const systemRole = isSystemRole(r.name)
              const perms = transformRolePermissions(r.permissions ?? [])
              return (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{r.name}</span>
                    {systemRole && <Badge variant="default">Sistema</Badge>}
                  </div>
                  {!systemRole && modules.length > 0 && (
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {modules.slice(0, 4).map((m) => {
                        const active = Object.entries(perms[m] ?? {})
                          .filter(([, v]) => v)
                          .map(([k]) => k)
                        return (
                          <div key={m} className="flex justify-between">
                            <span className="capitalize">{m}:</span>
                            <span>{active.length > 0 ? active.join(', ') : '-'}</span>
                          </div>
                        )
                      })}
                      {modules.length > 4 && <div className="text-muted-foreground italic">+{modules.length - 4} módulos más</div>}
                    </div>
                  )}
                  <div className="flex gap-1 pt-1">
                    <Button variant="outline" size="sm" onClick={() => openEdit(r)} disabled={systemRole}>Editar</Button>
                    {!systemRole && (
                      <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(r.id)}>Eliminar</Button>
                    )}
                  </div>
                </>
              )
            }}
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => { if (!o) setConfirmDelete(null) }}
        title="Eliminar rol"
        description="¿Estás seguro de eliminar este rol? Los usuarios con este rol perderán sus permisos asociados."
        onConfirm={() => { if (confirmDelete !== null) { deleteMutation.mutate(confirmDelete); setConfirmDelete(null) } }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editRole ? 'Editar rol' : 'Crear rol'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nombre del rol</Label>
              <Input value={roleName} onChange={e => setRoleName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Permisos</Label>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Módulo</TableHead>
                      <TableHead className="text-center">Ver</TableHead>
                      <TableHead className="text-center">Editar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modules.map((m) => (
                      <TableRow key={m}>
                        <TableCell className="capitalize font-medium">{m}</TableCell>
                        {(['ver', 'editar'] as const).map((action) => (
                          <TableCell key={action} className="text-center">
                            <input
                              type="checkbox"
                              checked={!!rolePerms[m]?.[action]}
                              onChange={() => togglePerm(m, action)}
                              className="h-4 w-4 accent-primary cursor-pointer"
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    {modules.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-4">No hay módulos configurados</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ClinicDataTab() {
  const { can } = usePermission()
  const { data, isPending } = useQuery({ queryKey: ['tenant'], queryFn: () => profileApi.tenant() })
  const [form, setForm] = useState({ name: '', ruc: '', phone: '', address: '', email: '' })
  const [loaded, setLoaded] = useState(false)

  if (data && !loaded) {
    setForm({
      name: data.name ?? '',
      ruc: data.ruc ?? '',
      phone: data.phone ?? '',
      address: data.address ?? '',
      email: data.email ?? '',
    })
    setLoaded(true)
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.name?.trim()) errs.name = 'Nombre de clínica es requerido'
    return errs
  }

  const mutation = useMutation({
    mutationFn: (d: typeof form) => profileApi.updateTenant(d as Record<string, unknown>),
    onSuccess: () => toast.success('Datos de la clínica actualizados'),
    onError: () => toast.error('Error al actualizar datos de la clínica'),
  })

  if (!can('configuracion.editar')) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground py-8">
          Sin permisos para editar datos de la clínica
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        {isPending ? (
          <div className="space-y-3">
            <div className="h-8 bg-muted animate-pulse rounded" />
            <div className="h-8 bg-muted animate-pulse rounded" />
            <div className="h-8 bg-muted animate-pulse rounded" />
            <div className="h-8 bg-muted animate-pulse rounded" />
            <div className="h-8 bg-muted animate-pulse rounded" />
          </div>
        ) : (
          <form onSubmit={(e) => {
            e.preventDefault()
            const errs = validate()
            if (Object.keys(errs).length > 0) {
              toast.error(Object.values(errs)[0])
              return
            }
            mutation.mutate(form)
          }} className="space-y-4 max-w-lg">
            <div className="space-y-1">
              <Label htmlFor="clinic-name">Nombre</Label>
              <Input id="clinic-name" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ruc">RUC</Label>
              <Input id="ruc" value={form.ruc} onChange={(e) => setForm(f => ({ ...f, ruc: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="clinic-address">Dirección</Label>
              <Input id="clinic-address" value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="clinic-email">Email</Label>
              <Input id="clinic-email" type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Configuración" />
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="roles">Roles y Permisos</TabsTrigger>
          <TabsTrigger value="clinic">Datos de la Clínica</TabsTrigger>
        </TabsList>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="roles"><RolesTab /></TabsContent>
        <TabsContent value="clinic"><ClinicDataTab /></TabsContent>
      </Tabs>
    </div>
  )
}
