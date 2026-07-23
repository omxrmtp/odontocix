import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { budgetsApi, patientsApi, treatmentsApi, downloadBudgetPdf } from '@/lib/endpoints'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { onlyDigits, onlyDecimal, cleanInput, showFirstError } from '@/lib/validation'
import MobileCardList from '@/components/app/MobileCardList'
import ConfirmDialog from '@/components/app/ConfirmDialog'
import SkeletonTable from '@/components/app/SkeletonTable'
import { usePermission } from '@/hooks/usePermission'

export default function BudgetsPage() {
  const queryClient = useQueryClient()
  const { canEdit } = usePermission()
  const canEditBudgets = canEdit('presupuestos')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [form, setForm] = useState<any>({
    patient_id: '', items: [], discount_type: 'percentage', discount_value: 0,
    valid_until: '', notes: '', financing: {},
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: budgets, isPending: loadingBudgets } = useQuery({ queryKey: ['budgets', search], queryFn: () => budgetsApi.list({ search }) })
  const { data: patients, isPending: loadingPatients } = useQuery({ queryKey: ['patients-list'], queryFn: () => patientsApi.list({ per_page: '100' }) })
  const { data: treatments, isPending: loadingTreatments } = useQuery({ queryKey: ['treatments-list'], queryFn: () => treatmentsApi.list() })

  const createMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => budgetsApi.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['budgets'] }); setDialogOpen(false); toast.success('Presupuesto creado') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error'),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => budgetsApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['budgets'] }); setDialogOpen(false); toast.success('Presupuesto actualizado') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: number) => budgetsApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['budgets'] }); toast.success('Presupuesto eliminado') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error'),
  })

  const subtotal = form.items.reduce((s: number, i: any) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0)
  const discountAmount = form.discount_type === 'percentage' ? subtotal * (Number(form.discount_value) / 100) : Number(form.discount_value)
  const total = Math.max(0, subtotal - discountAmount)

  const openNew = () => {
    setEditId(null)
    setForm({ patient_id: '', items: [{ treatment_id: '', description: '', quantity: 1, unit_price: 0 }], discount_type: 'percentage', discount_value: 0, valid_until: '', notes: '', financing: {} })
    setDialogOpen(true)
  }

  const openEdit = (b: any) => {
    setEditId(b.id)
    setForm({
      patient_id: String(b.patient_id),
      items: b.items?.map((i: any) => ({ ...i, treatment_id: String(i.treatment_id ?? '') })) ?? [],
      discount_type: b.discount_type ?? 'percentage',
      discount_value: b.discount_value ?? 0,
      valid_until: b.valid_until ?? '',
      notes: b.notes ?? '',
      financing: b.financing ?? {},
    })
    setDialogOpen(true)
  }

  const handleSave = () => {
    const newErrors: Record<string, string> = {}
    if (!form.patient_id) newErrors.patient_id = 'Seleccione un paciente'
    if (!form.items || form.items.length === 0) newErrors.items = 'Agregue al menos un item'
    setErrors(newErrors)
    showFirstError(newErrors, toast)
    if (Object.keys(newErrors).length > 0) return
    const data = {
      patient_id: Number(form.patient_id),
      items: form.items.map((i: any) => ({ treatment_id: i.treatment_id ? Number(i.treatment_id) : null, description: i.description, quantity: Number(i.quantity), unit_price: Number(i.unit_price) })),
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      valid_until: form.valid_until || null,
      notes: form.notes || null,
    }
    if (editId) updateMutation.mutate({ id: editId, data })
    else createMutation.mutate(data)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-3xl font-bold flex-shrink-0">Presupuestos</h1>
        <div className="flex items-center gap-2">
          <Input placeholder="Buscar presupuesto..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-64" />
          {canEditBudgets && <Button onClick={openNew}>Nuevo presupuesto</Button>}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paciente</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Descuento</TableHead>
                <TableHead>Válido hasta</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-44">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingBudgets ? (
                <SkeletonTable columns={5} rows={3} />
              ) : (budgets?.data ?? []).length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No hay presupuestos</TableCell></TableRow>
              ) : (
                (budgets?.data ?? []).map((b: any) => (
                  <TableRow key={b.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>{b.patient?.first_name} {b.patient?.first_last_name}</TableCell>
                    <TableCell>S/ {Number(b.total).toFixed(2)}</TableCell>
                    <TableCell>{b.discount_type === 'percentage' ? `${b.discount_value}%` : `S/ ${b.discount_value}`}</TableCell>
                    <TableCell>{b.valid_until ?? '-'}</TableCell>
                    <TableCell>{b.status}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => downloadBudgetPdf(b.id).then(blob => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `presupuesto-${b.id}.pdf`; a.click(); URL.revokeObjectURL(url); }).catch((e) => toast.error(e?.message ?? 'Error al descargar PDF'))}>PDF</Button>
                        <Button variant="outline" size="sm" onClick={() => openEdit(b)}>Ver</Button>
                        {canEditBudgets && <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(b.id)}>Eliminar</Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>

          <MobileCardList
            items={budgets?.data ?? []}
            keyFn={(b: any) => b.id}
            renderCard={(b: any) => (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{b.patient?.first_name} {b.patient?.first_last_name}</span>
                  <span className="font-mono text-xs text-muted-foreground">S/ {Number(b.total ?? 0).toFixed(2)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  <span>Estado: {b.status ?? '-'}</span>
                  <span className="ml-2">Items: {b.items_count ?? 0}</span>
                </div>
                <div className="flex gap-1 pt-1">
                  <Button variant="outline" size="sm" onClick={() => downloadBudgetPdf(b.id).then(blob => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `presupuesto-${b.id}.pdf`; a.click(); URL.revokeObjectURL(url); }).catch((e) => toast.error(e?.message ?? 'Error al descargar PDF'))}>PDF</Button>
                  {canEditBudgets && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => openEdit(b)}>Editar</Button>
                      <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(b.id)}>Eliminar</Button>
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
        title="Eliminar presupuesto"
        description="¿Estás seguro de eliminar este presupuesto? Esta acción no se puede deshacer."
        onConfirm={() => { if (confirmDelete !== null) { deleteMutation.mutate(confirmDelete); setConfirmDelete(null) } }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editId ? (canEditBudgets ? 'Editar presupuesto' : 'Ver presupuesto') : 'Nuevo presupuesto'}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-1">
              <Label>Paciente</Label>
              <Select value={form.patient_id} onValueChange={(v) => setForm((f: any) => ({ ...f, patient_id: v }))} disabled={!canEditBudgets}>
                <SelectTrigger className={errors.patient_id ? 'border-red-500' : ''}><SelectValue placeholder="Seleccionar paciente" /></SelectTrigger>
                <SelectContent>
                  {(patients?.data ?? []).map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.first_name} {p.first_last_name} - {p.dni}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className={`flex items-center justify-between ${errors.items ? 'border border-red-500 rounded p-2' : ''}`}><Label>Items</Label>{canEditBudgets && <Button type="button" variant="outline" size="sm" onClick={() => setForm((f: any) => ({ ...f, items: [...f.items, { treatment_id: '', description: '', quantity: 1, unit_price: 0 }] }))}>+ Item</Button>}</div>
              {form.items.map((item: any, idx: number) => (
                <div key={idx} className="flex gap-2 items-start border p-2 rounded">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Tratamiento</Label>
                    <Select value={item.treatment_id} onValueChange={(v) => {
                      const tr = (treatments ?? []).find((t: any) => String(t.id) === v)
                      const items = [...form.items]
                      items[idx] = { ...items[idx], treatment_id: v, description: tr?.name ?? items[idx].description, unit_price: tr?.base_price ?? items[idx].unit_price }
                      setForm((f: any) => ({ ...f, items }))
                    }} disabled={!canEditBudgets}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="Tratamiento" /></SelectTrigger>
                      <SelectContent>
                        {(treatments ?? []).map((t: any) => (
                          <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">Descripción</Label>
                    <Input className="h-8" value={item.description} onChange={(e) => { const items = [...form.items]; items[idx] = { ...items[idx], description: e.target.value }; setForm((f: any) => ({ ...f, items })) }} disabled={!canEditBudgets} />
                  </div>
                  <div className="space-y-1 w-16">
                    <Label className="text-xs">Cant.</Label>
                    <Input className="h-8" type="number" min={1} value={item.quantity} onKeyDown={onlyDigits} onChange={(e) => { const items = [...form.items]; items[idx] = { ...items[idx], quantity: Number(e.target.value) }; setForm((f: any) => ({ ...f, items })) }} disabled={!canEditBudgets} />
                  </div>
                  <div className="space-y-1 w-24">
                    <Label className="text-xs">P. Unit.</Label>
                    <Input className="h-8" type="number" min={0} step={0.01} value={item.unit_price} onKeyDown={onlyDecimal} onChange={(e) => { const items = [...form.items]; items[idx] = { ...items[idx], unit_price: Number(e.target.value) }; setForm((f: any) => ({ ...f, items })) }} disabled={!canEditBudgets} />
                  </div>
                  {canEditBudgets && <Button type="button" variant="ghost" size="sm" className="mt-5" onClick={() => setForm((f: any) => ({ ...f, items: f.items.filter((_: any, i: number) => i !== idx) }))}>✕</Button>}
                </div>
              ))}
            </div>

            <div className="flex gap-4 items-end">
              <div className="space-y-1 w-32">
                <Label>Descuento tipo</Label>
                <Select value={form.discount_type} onValueChange={(v) => setForm((f: any) => ({ ...f, discount_type: v }))} disabled={!canEditBudgets}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">%</SelectItem>
                    <SelectItem value="fixed">S/ fijo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 w-24">
                <Label>Valor</Label>
                <Input type="number" min={0} step={0.01} value={form.discount_value} onKeyDown={onlyDecimal} onChange={(e) => setForm((f: any) => ({ ...f, discount_value: e.target.value }))} disabled={!canEditBudgets} />
              </div>
            </div>

            <div className="text-right space-y-1 text-sm">
              <p>Subtotal: S/ {subtotal.toFixed(2)}</p>
              <p>Descuento: {form.discount_type === 'percentage' ? `${form.discount_value}%` : `S/ ${Number(form.discount_value).toFixed(2)}`}</p>
              <p className="text-lg font-bold">Total: S/ {total.toFixed(2)}</p>
            </div>

            <div className="space-y-1">
              <Label>Válido hasta</Label>
              <Input type="date" value={form.valid_until} onChange={(e) => setForm((f: any) => ({ ...f, valid_until: e.target.value }))} disabled={!canEditBudgets} />
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((f: any) => ({ ...f, notes: e.target.value }))} disabled={!canEditBudgets} />
            </div>
          </div>
          <DialogFooter>
            {canEditBudgets && <Button onClick={handleSave}>Guardar</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
