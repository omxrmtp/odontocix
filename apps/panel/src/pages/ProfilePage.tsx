import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { profileApi } from '@/lib/endpoints'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { showFirstError } from '@/lib/validation'
import { usePermission } from '@/hooks/usePermission'

function ProfileForm() {
  const { data, isPending } = useQuery({ queryKey: ['profile'], queryFn: () => profileApi.show() })
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    if (data?.user) {
      setName(data.user.name ?? '')
      setEmail(data.user.email ?? '')
    }
  }, [data])

  const mutation = useMutation({
    mutationFn: (d: { name: string; email: string }) => profileApi.update(d),
    onSuccess: () => toast.success('Perfil actualizado'),
    onError: () => toast.error('Error al actualizar perfil'),
  })

  return (
    <Card>
      <CardHeader><CardTitle>Mi Perfil</CardTitle><CardDescription>Actualiza tu información personal</CardDescription></CardHeader>
      <CardContent>
        {isPending ? (
          <div className="space-y-3">
            <div className="h-8 bg-muted animate-pulse rounded" />
            <div className="h-8 bg-muted animate-pulse rounded" />
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); mutation.mutate({ name, email }) }} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
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

function PasswordForm() {
  const [form, setForm] = useState({ current_password: '', password: '', password_confirmation: '' })

  const mutation = useMutation({
    mutationFn: (d: typeof form) => profileApi.password(d),
    onSuccess: () => { toast.success('Contraseña actualizada'); setForm({ current_password: '', password: '', password_confirmation: '' }) },
    onError: () => toast.error('Error al cambiar contraseña'),
  })

  return (
    <Card>
      <CardHeader><CardTitle>Cambiar Contraseña</CardTitle><CardDescription>Actualiza tu contraseña de acceso</CardDescription></CardHeader>
      <CardContent>
        <form onSubmit={(e) => {
              e.preventDefault()
              const errs: Record<string, string> = {}
              if (form.password && form.password.length < 6) errs.password = 'La contraseña debe tener al menos 6 caracteres'
              if (form.password !== form.password_confirmation) errs.password_confirmation = 'Las contraseñas no coinciden'
              showFirstError(errs, toast)
              if (Object.keys(errs).length > 0) return
              mutation.mutate(form)
            }} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="current_password">Contraseña actual</Label>
            <Input id="current_password" type="password" value={form.current_password} onChange={(e) => setForm(f => ({ ...f, current_password: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Nueva contraseña</Label>
            <Input id="password" type="password" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password_confirmation">Confirmar contraseña</Label>
            <Input id="password_confirmation" type="password" value={form.password_confirmation} onChange={(e) => setForm(f => ({ ...f, password_confirmation: e.target.value }))} />
          </div>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Cambiando...' : 'Cambiar contraseña'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function TenantForm() {
  const { data, isPending } = useQuery({ queryKey: ['tenant'], queryFn: () => profileApi.tenant() })
  const { canEdit } = usePermission()
  const [form, setForm] = useState({ name: '', ruc: '', phone: '', address: '', email: '' })

  useEffect(() => {
    if (data) {
      setForm({
        name: data.name ?? '',
        ruc: data.ruc ?? '',
        phone: data.phone ?? '',
        address: data.address ?? '',
        email: data.email ?? '',
      })
    }
  }, [data])

  const validateTenant = () => {
    const errs: Record<string, string> = {}
    if (!form.name?.trim()) errs.name = 'Nombre de clínica es requerido'
    return errs
  }

  const mutation = useMutation({
    mutationFn: (d: typeof form) => profileApi.updateTenant(d as Record<string, unknown>),
    onSuccess: () => toast.success('Datos de la clínica actualizados'),
    onError: () => toast.error('Error al actualizar datos de la clínica'),
  })

  return (
    <Card>
      <CardHeader><CardTitle>Datos de la Clínica</CardTitle><CardDescription>Información de tu consultorio o clínica</CardDescription></CardHeader>
      <CardContent>
        {isPending ? (
          <div className="space-y-3">
            <div className="h-8 bg-muted animate-pulse rounded" />
            <div className="h-8 bg-muted animate-pulse rounded" />
            <div className="h-8 bg-muted animate-pulse rounded" />
            <div className="h-8 bg-muted animate-pulse rounded" />
            <div className="h-8 bg-muted animate-pulse rounded" />
          </div>
        ) : canEdit('configuracion') ? (
          <form onSubmit={(e) => {
                e.preventDefault()
                const errs = validateTenant()
                showFirstError(errs, toast)
                if (Object.keys(errs).length > 0) return
                mutation.mutate(form)
              }} className="space-y-4">
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
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nombre</Label>
              <p className="text-sm">{form.name || '-'}</p>
            </div>
            <div className="space-y-1">
              <Label>RUC</Label>
              <p className="text-sm">{form.ruc || '-'}</p>
            </div>
            <div className="space-y-1">
              <Label>Teléfono</Label>
              <p className="text-sm">{form.phone || '-'}</p>
            </div>
            <div className="space-y-1">
              <Label>Dirección</Label>
              <p className="text-sm">{form.address || '-'}</p>
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <p className="text-sm">{form.email || '-'}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Perfil</h1>
      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="profile">Mi Perfil</TabsTrigger>
          <TabsTrigger value="password">Contraseña</TabsTrigger>
          <TabsTrigger value="tenant">Clínica</TabsTrigger>
        </TabsList>
        <TabsContent value="profile"><ProfileForm /></TabsContent>
        <TabsContent value="password"><PasswordForm /></TabsContent>
        <TabsContent value="tenant"><TenantForm /></TabsContent>
      </Tabs>
    </div>
  )
}
