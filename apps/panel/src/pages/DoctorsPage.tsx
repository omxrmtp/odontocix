import { useState } from 'react'
import { onlyDigits, onlyLetters, onlyPhoneChars, cleanInput, showFirstError } from '@/lib/validation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { doctorsApi } from '@/lib/endpoints'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import MobileCardList from '@/components/app/MobileCardList'
import SkeletonTable from '@/components/app/SkeletonTable'
import ConfirmDialog from '@/components/app/ConfirmDialog'
import { usePermission } from '@/hooks/usePermission'

export default function DoctorsPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [form, setForm] = useState({
    dni: '', first_name: '', second_name: '', first_last_name: '', second_last_name: '',
    cmp: '', email: '', phone: '',
  })
  const { canEdit } = usePermission()
  const canEditDoctors = canEdit('doctores')

  const { data, isPending } = useQuery({
    queryKey: ['doctors', search],
    queryFn: () => doctorsApi.list({ search, per_page: '50' }),
  })

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => doctorsApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['doctors'] }); setDialogOpen(false); toast.success('Doctor creado') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => doctorsApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['doctors'] }); setDialogOpen(false); toast.success('Doctor actualizado') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => doctorsApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['doctors'] }); toast.success('Doctor eliminado') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error'),
  })

  const openNew = () => {
    setEditId(null)
    setErrors({})
    setForm({ dni: '', first_name: '', second_name: '', first_last_name: '', second_last_name: '', cmp: '', email: '', phone: '' })
    setDialogOpen(true)
  }

  const openEdit = (d: any) => {
    setEditId(d.id)
    setErrors({})
    setForm({
      dni: d.dni ?? '', first_name: d.first_name, second_name: d.second_name ?? '',
      first_last_name: d.first_last_name, second_last_name: d.second_last_name ?? '',
      cmp: d.cmp ?? '', email: d.email ?? '', phone: d.phone ?? '',
    })
    setDialogOpen(true)
  }

  const handleFormChange = (field: string, value: string) => {
    const filtered = (
      ['first_name', 'second_name', 'first_last_name', 'second_last_name'].includes(field) ? cleanInput(value, 'letters') :
      ['dni', 'cmp'].includes(field) ? cleanInput(value, 'digits') :
      field === 'phone' ? cleanInput(value, 'phone') :
      value
    )
    setForm(p => ({ ...p, [field]: filtered }))
    if (errors[field]) setErrors(prev => { const copy = { ...prev }; delete copy[field]; return copy })
  }

  const handleSave = () => {
    const newErrors: Record<string, string> = {}
    if (!form.first_name.trim()) newErrors.first_name = 'Nombres es requerido'
    if (!form.first_last_name.trim()) newErrors.first_last_name = 'Apellido paterno es requerido'
    if (form.dni && form.dni.length !== 8) newErrors.dni = 'DNI debe tener 8 dígitos'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Email inválido'
    if (form.cmp && !/^\d+$/.test(form.cmp)) newErrors.cmp = 'CMP solo dígitos'
    setErrors(newErrors)
    showFirstError(newErrors, toast)
    if (Object.keys(newErrors).length > 0) return

    const data = { ...form }
    if (editId) updateMutation.mutate({ id: editId, data })
    else createMutation.mutate(data)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-3xl font-bold flex-shrink-0">Doctores</h1>
        <div className="flex items-center gap-2">
          <Input placeholder="Buscar doctor..." value={search} onChange={(e) => setSearch(e.target.value)}             className="w-full sm:w-64" />
          {canEditDoctors && <Button onClick={openNew}>Nuevo doctor</Button>}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CMP</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>DNI</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-32">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <TableRow><TableCell colSpan={6}><SkeletonTable columns={5} rows={3} /></TableCell></TableRow>
              ) : (data?.data ?? []).length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No hay doctores registrados</TableCell></TableRow>
              ) : (
                (data?.data ?? []).map((d: any) => (
                  <TableRow key={d.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-mono">{d.cmp ?? '-'}</TableCell>
                    <TableCell>Dr. {d.first_name} {d.first_last_name}</TableCell>
                    <TableCell className="font-mono">{d.dni ?? '-'}</TableCell>
                    <TableCell>{d.phone ?? '-'}</TableCell>
                    <TableCell>{d.email ?? '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {canEditDoctors && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => openEdit(d)}>Editar</Button>
                            <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(d.id)}>Eliminar</Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>

          <MobileCardList
            items={data?.data ?? []}
            keyFn={(d: any) => d.id}
            renderCard={(d: any) => (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Dr. {d.first_name} {d.first_last_name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{d.cmp ?? '-'}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{d.phone ?? '-'}</span>
                  <span>{d.email ?? '-'}</span>
                </div>
                <div className="flex gap-1 pt-1">
                  {canEditDoctors && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => openEdit(d)}>Editar</Button>
                      <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(d.id)}>Eliminar</Button>
                    </>
                  )}
                </div>
              </>
            )}
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => { if (!o) setConfirmDelete(null) }}
        title="Eliminar doctor"
        description="¿Estás seguro de eliminar este doctor? Esta acción no se puede deshacer."
        onConfirm={() => { if (confirmDelete !== null) { deleteMutation.mutate(confirmDelete); setConfirmDelete(null) } }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editId ? 'Editar doctor' : 'Nuevo doctor'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1"><Label>DNI</Label><Input value={form.dni} onKeyDown={onlyDigits} onChange={(e) => handleFormChange('dni', e.target.value)} className={errors.dni ? 'border-red-500' : ''} /></div>
              <div className="space-y-1"><Label>CMP</Label><Input value={form.cmp} onKeyDown={onlyDigits} onChange={(e) => handleFormChange('cmp', e.target.value)} className={errors.cmp ? 'border-red-500' : ''} /></div>
              <div className="space-y-1"><Label>Nombres</Label><Input value={form.first_name} onKeyDown={onlyLetters} onChange={(e) => handleFormChange('first_name', e.target.value)} className={errors.first_name ? 'border-red-500' : ''} required /></div>
              <div className="space-y-1"><Label>Segundo nombre</Label><Input value={form.second_name} onKeyDown={onlyLetters} onChange={(e) => handleFormChange('second_name', e.target.value)} /></div>
              <div className="space-y-1"><Label>A. paterno</Label><Input value={form.first_last_name} onKeyDown={onlyLetters} onChange={(e) => handleFormChange('first_last_name', e.target.value)} className={errors.first_last_name ? 'border-red-500' : ''} required /></div>
              <div className="space-y-1"><Label>A. materno</Label><Input value={form.second_last_name} onKeyDown={onlyLetters} onChange={(e) => handleFormChange('second_last_name', e.target.value)} /></div>
              <div className="space-y-1"><Label>Teléfono</Label><Input type="tel" value={form.phone} onKeyDown={onlyPhoneChars} onChange={(e) => handleFormChange('phone', e.target.value)} /></div>
              <div className="space-y-1"><Label>Email</Label><Input value={form.email} onChange={(e) => handleFormChange('email', e.target.value)} className={errors.email ? 'border-red-500' : ''} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
