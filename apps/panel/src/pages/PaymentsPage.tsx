import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { paymentsApi, budgetsApi, comprobantesApi, downloadPaymentReceipt } from '@/lib/endpoints'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { onlyDigits, onlyDecimal } from '@/lib/validation'
import MobileCardList from '@/components/app/MobileCardList'
import ConfirmDialog from '@/components/app/ConfirmDialog'
import SkeletonTable from '@/components/app/SkeletonTable'
import { usePermission } from '@/hooks/usePermission'

const methodLabel = (m: string) => m === 'cash' ? 'Efectivo' : m === 'transfer' ? 'Transferencia' : m === 'card' ? 'Tarjeta' : m

export default function PaymentsPage() {
  const queryClient = useQueryClient()
  const { canEdit } = usePermission()
  const canEditPayments = canEdit('pagos')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [form, setForm] = useState({ patient_id: '', budget_id: '', amount: '', method: 'cash', payment_date: new Date().toISOString().slice(0, 10), reference: '', notes: '' })
  const [balance, setBalance] = useState<any>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [emitOpen, setEmitOpen] = useState(false)
  const [emitPayment, setEmitPayment] = useState<any>(null)
  const [emitForm, setEmitForm] = useState({ tipo_doc: '03', doc_number: '', name: '', address: '', note: '' })

  const resetForm = () => {
    setForm({ patient_id: '', budget_id: '', amount: '', method: 'cash', payment_date: new Date().toISOString().slice(0, 10), reference: '', notes: '' })
    setBalance(null)
    setErrors({})
  }

  const { data: payments, isPending: loadingPayments } = useQuery({ queryKey: ['payments', search], queryFn: () => paymentsApi.list({ search }) })
  const { data: budgets, isPending: loadingBudgets } = useQuery({ queryKey: ['budgets-all'], queryFn: () => budgetsApi.list({ per_page: '100' }) })

  const createMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => paymentsApi.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payments'] }); setDialogOpen(false); resetForm(); toast.success('Pago registrado') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => paymentsApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payments'] }); toast.success('Pago eliminado') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error'),
  })

  const emitMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => comprobantesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comprobantes'] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      setEmitOpen(false)
      toast.success('Comprobante emitido')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error'),
  })

  const openEmitModal = (p: any) => {
    setEmitPayment(p)
    setEmitForm({ tipo_doc: '03', doc_number: '', name: '', address: '', note: '' })
    setEmitOpen(true)
  }

  const handleEmit = () => {
    if (!emitPayment) return
    const isFactura = emitForm.tipo_doc === '01'
    if (isFactura) {
      if (!/^\d{11}$/.test(emitForm.doc_number)) { toast.error('Ingrese un RUC válido (11 dígitos)'); return }
      if (!emitForm.name.trim()) { toast.error('Ingrese la razón social'); return }
    }
    emitMutation.mutate({
      payment_id: emitPayment.id,
      tipo_doc: emitForm.tipo_doc,
      doc_number: emitForm.doc_number || null,
      name: emitForm.name || null,
      address: emitForm.address || null,
      note: emitForm.note || null,
    })
  }

  const handleBudgetChange = async (budgetId: string) => {
    setForm(f => ({ ...f, budget_id: budgetId }))
    if (budgetId) {
      const b = await paymentsApi.budgetBalance(Number(budgetId))
      setBalance(b)
      setForm(f => ({ ...f, patient_id: b.patient_id ? String(b.patient_id) : f.patient_id }))
    } else {
      setBalance(null)
    }
  }

  const handleSave = () => {
    const newErrors: Record<string, string> = {}
    if (!form.budget_id) newErrors.budget_id = 'Seleccione un presupuesto'
    if (!form.amount || Number(form.amount) <= 0) newErrors.amount = 'Ingrese un monto válido'
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) {
      const first = Object.values(newErrors)[0]
      toast.error(first)
      return
    }
    createMutation.mutate({
      patient_id: Number(form.patient_id),
      budget_id: Number(form.budget_id),
      amount: Number(form.amount),
      method: form.method,
      payment_date: form.payment_date,
      reference: form.reference || null,
      notes: form.notes || null,
    })
  }

  const renderActions = (p: any) => (
    <div className="flex gap-1 flex-wrap">
      <Button variant="outline" size="sm" onClick={() => downloadPaymentReceipt(p.id).then(blob => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `recibo-${p.id}.pdf`; a.click(); URL.revokeObjectURL(url); }).catch((e) => toast.error(e?.message ?? 'Error al descargar recibo'))}>Recibo</Button>
      {canEditPayments && p.budget_id && <Button variant="secondary" size="sm" onClick={() => openEmitModal(p)}>Emitir</Button>}
      {canEditPayments && <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(p.id)}>Eliminar</Button>}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-3xl font-bold flex-shrink-0">Pagos</h1>
        <div className="flex items-center gap-2">
          <Input placeholder="Buscar pago..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-64" />
          {canEditPayments && <Button onClick={() => { resetForm(); setDialogOpen(true) }}>Registrar pago</Button>}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paciente</TableHead>
                <TableHead>Presupuesto</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="w-56">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingPayments ? (
                <SkeletonTable columns={5} rows={3} />
              ) : (payments?.data ?? []).length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No hay pagos registrados</TableCell></TableRow>
              ) : (
                (payments?.data ?? []).map((p: any) => (
                  <TableRow key={p.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>{p.budget?.patient?.first_name ?? '-'}</TableCell>
                    <TableCell>#{p.budget_id}</TableCell>
                    <TableCell className="font-mono">S/ {Number(p.amount).toFixed(2)}</TableCell>
                    <TableCell>{methodLabel(p.method)}</TableCell>
                    <TableCell>{p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '-'}</TableCell>
                    <TableCell>{renderActions(p)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>

          <MobileCardList
            items={payments?.data ?? []}
            keyFn={(p: any) => p.id}
            renderCard={(p: any) => (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{p.budget?.patient?.first_name ?? '-'}</span>
                  <span className="font-mono text-sm">S/ {Number(p.amount).toFixed(2)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  <span>Presupuesto #{p.budget_id}</span>
                  <span className="ml-2">{methodLabel(p.method)}</span>
                </div>
                <div className="flex gap-1 pt-1">{renderActions(p)}</div>
              </>
            )}
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => { if (!o) setConfirmDelete(null) }}
        title="Eliminar pago"
        description="¿Estás seguro de eliminar este pago? Esta acción no se puede deshacer."
        onConfirm={() => { if (confirmDelete !== null) { deleteMutation.mutate(confirmDelete); setConfirmDelete(null) } }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
          <DialogHeader><DialogTitle>Registrar pago</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Presupuesto</Label>
              <Select value={form.budget_id} onValueChange={handleBudgetChange}>
                <SelectTrigger className={errors.budget_id ? 'border-red-500' : ''}><SelectValue placeholder="Seleccionar presupuesto" /></SelectTrigger>
                <SelectContent>
                  {(budgets?.data ?? []).map((b: any) => (
                    <SelectItem key={b.id} value={String(b.id)}>#{b.id} - {b.patient?.first_name} {b.patient?.first_last_name} - S/ {Number(b.total).toFixed(2)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {balance && (
              <div className="text-sm space-y-1 bg-muted p-3 rounded">
                <p>Total presupuesto: S/ {Number(balance.grand_total ?? balance.total).toFixed(2)}</p>
                <p>Pagado: S/ {Number(balance.total_paid ?? balance.paid).toFixed(2)}</p>
                <p className="font-bold">Saldo pendiente: S/ {Number(balance.balance).toFixed(2)}</p>
              </div>
            )}

            <div className="space-y-1">
              <Label>Monto</Label>
              <Input className={errors.amount ? 'border-red-500' : ''} type="number" min={0} step={0.01} value={form.amount} onKeyDown={onlyDecimal} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Fecha de pago</Label>
              <Input type="date" value={form.payment_date} onChange={(e) => setForm(f => ({ ...f, payment_date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Método de pago</Label>
              <Select value={form.method} onValueChange={(v) => setForm(f => ({ ...f, method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="card">Tarjeta</SelectItem>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Referencia</Label>
              <Input value={form.reference} onChange={(e) => setForm(f => ({ ...f, reference: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Input value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter><Button onClick={handleSave}>Registrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={emitOpen} onOpenChange={setEmitOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
          <DialogHeader><DialogTitle>Emitir comprobante SUNAT</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-sm bg-muted p-3 rounded">
              <p>Pago #{emitPayment?.id} - S/ {Number(emitPayment?.amount ?? 0).toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <Label>Tipo de comprobante</Label>
              <Select value={emitForm.tipo_doc} onValueChange={(v) => setEmitForm(f => ({ ...f, tipo_doc: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="03">Boleta</SelectItem>
                  <SelectItem value="01">Factura</SelectItem>
                </SelectContent>
              </Select>
              {emitForm.tipo_doc === '03' && <p className="text-xs text-muted-foreground">La boleta se emitirá a nombre del paciente con su DNI.</p>}
            </div>
            {emitForm.tipo_doc === '01' && (
              <>
                <div className="space-y-1">
                  <Label>RUC</Label>
                  <Input value={emitForm.doc_number} onKeyDown={onlyDigits} onChange={(e) => setEmitForm(f => ({ ...f, doc_number: e.target.value }))} maxLength={11} placeholder="20123456789" />
                </div>
                <div className="space-y-1">
                  <Label>Razón social</Label>
                  <Input value={emitForm.name} onChange={(e) => setEmitForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Dirección</Label>
                  <Input value={emitForm.address} onChange={(e) => setEmitForm(f => ({ ...f, address: e.target.value }))} />
                </div>
              </>
            )}
            <div className="space-y-1">
              <Label>Nota interna</Label>
              <Input value={emitForm.note} onChange={(e) => setEmitForm(f => ({ ...f, note: e.target.value }))} />
            </div>
          </div>
          <DialogFooter><Button onClick={handleEmit} disabled={emitMutation.isPending}>Emitir</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
