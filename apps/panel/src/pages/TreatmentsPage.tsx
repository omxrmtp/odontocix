import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { treatmentsApi } from '@/lib/endpoints'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import MobileCardList from '@/components/app/MobileCardList'
import ConfirmDialog from '@/components/app/ConfirmDialog'
import SkeletonTable from '@/components/app/SkeletonTable'
import { usePermission } from '@/hooks/usePermission'

export default function TreatmentsPage() {
  const queryClient = useQueryClient()
  const { canEdit } = usePermission()
  const canEditTreatments = canEdit('tratamientos')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', description: '', base_price: '', estimated_duration_min: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data, isPending } = useQuery({
    queryKey: ['treatments'],
    queryFn: () => treatmentsApi.list(),
  })

  const createMutation = useMutation({
    mutationFn: (d: any) => treatmentsApi.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['treatments'] }); setDialogOpen(false); toast.success('Tratamiento creado') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al crear tratamiento'),
  })
  const updateMutation = useMutation({
    mutationFn: (d: any) => treatmentsApi.update(d.id, d.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['treatments'] }); setDialogOpen(false); toast.success('Tratamiento actualizado') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al actualizar'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: number) => treatmentsApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['treatments'] }); toast.success('Tratamiento eliminado') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al eliminar'),
  })

  const openNew = () => {
    setEditId(null)
    setForm({ name: '', description: '', base_price: '', estimated_duration_min: '' })
    setDialogOpen(true)
  }
  const openEdit = (t: any) => {
    setEditId(t.id)
    setForm({ name: t.name, description: t.description ?? '', base_price: t.base_price ?? '', estimated_duration_min: t.estimated_duration_min ?? '' })
    setDialogOpen(true)
  }
  const handleSave = () => {
    setErrors({})
    if (!form.name.trim()) { setErrors(e => ({ ...e, name: 'Nombre es requerido' })); return toast.error('Nombre es requerido') }
    const data = { ...form, base_price: form.base_price ? Number(form.base_price) : null, estimated_duration_min: form.estimated_duration_min ? Number(form.estimated_duration_min) : null }
    if (editId) updateMutation.mutate({ id: editId, data })
    else createMutation.mutate(data)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-3xl font-bold">Tratamientos</h1>
        {canEditTreatments && <Button onClick={openNew}>Nuevo tratamiento</Button>}
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Precio base</TableHead>
                <TableHead className="text-right">Duración (min)</TableHead>
                <TableHead className="w-32">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <TableRow><TableCell colSpan={5}><SkeletonTable columns={4} rows={3} /></TableCell></TableRow>
              ) : (data ?? []).length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No hay tratamientos registrados</TableCell></TableRow>
              ) : (
                (data ?? []).map((t: any) => (
                  <TableRow key={t.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="max-w-[250px] truncate text-muted-foreground">{t.description ?? '-'}</TableCell>
                    <TableCell className="text-right font-mono">{t.base_price ? `S/ ${Number(t.base_price).toFixed(2)}` : '-'}</TableCell>
                    <TableCell className="text-right">{t.estimated_duration_min ?? '-'}</TableCell>
                    <TableCell>
                      {canEditTreatments && (
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" onClick={() => openEdit(t)}>Editar</Button>
                          <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(t.id)}>Eliminar</Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <MobileCardList
            items={data ?? []}
            keyFn={(t: any) => t.id}
            renderCard={(t: any) => (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{t.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{t.base_price ? `S/ ${Number(t.base_price).toFixed(2)}` : '-'}</span>
                </div>
                <div className="text-xs text-muted-foreground truncate">{t.description ?? '-'}</div>
                {canEditTreatments && (
                  <div className="flex gap-1 pt-1">
                    <Button variant="outline" size="sm" onClick={() => openEdit(t)}>Editar</Button>
                    <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(t.id)}>Eliminar</Button>
                  </div>
                )}
              </>
            )}
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => { if (!o) setConfirmDelete(null) }}
        title="Eliminar tratamiento"
        description="¿Estás seguro de eliminar este tratamiento? Esta acción no se puede deshacer."
        onConfirm={() => { if (confirmDelete !== null) { deleteMutation.mutate(confirmDelete); setConfirmDelete(null) } }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
          <DialogHeader><DialogTitle>{editId ? (canEditTreatments ? 'Editar tratamiento' : 'Ver tratamiento') : 'Nuevo tratamiento'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Nombre</Label><Input value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); if (errors.name) setErrors(p => { const n = { ...p }; delete n.name; return n }) }} className={errors.name ? 'border-red-500' : ''} required disabled={!canEditTreatments} /></div>
            <div className="space-y-1"><Label>Descripción</Label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canEditTreatments} /></div>
            <div className="space-y-1"><Label>Precio base</Label><Input type="number" step="0.01" value={form.base_price} onChange={e => setForm(f => ({ ...f, base_price: e.target.value }))} disabled={!canEditTreatments} /></div>
            <div className="space-y-1"><Label>Duración estimada (minutos)</Label><Input type="number" value={form.estimated_duration_min} onChange={e => setForm(f => ({ ...f, estimated_duration_min: e.target.value }))} disabled={!canEditTreatments} /></div>
          </div>
          <DialogFooter>{canEditTreatments && <Button onClick={handleSave}>Guardar</Button>}</DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
