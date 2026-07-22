import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cashApi } from '@/lib/endpoints'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { onlyDigits, onlyDecimal } from '@/lib/validation'
import MobileCardList from '@/components/app/MobileCardList'
import ConfirmDialog from '@/components/app/ConfirmDialog'
import SkeletonTable from '@/components/app/SkeletonTable'
import { usePermission } from '@/hooks/usePermission'

export default function CashPage() {
  const queryClient = useQueryClient()
  const { canEdit } = usePermission()
  const canEditCash = canEdit('caja')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [form, setForm] = useState({ type: 'expense', category: '', amount: '', description: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: transactions, isPending: loadingCash } = useQuery({ queryKey: ['cash', search], queryFn: () => cashApi.list({ search }) })
  const { data: summary, isPending: loadingSummary } = useQuery({ queryKey: ['cash-summary'], queryFn: () => cashApi.summary() })

  const createMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => cashApi.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cash'] }); queryClient.invalidateQueries({ queryKey: ['cash-summary'] }); setDialogOpen(false); toast.success('Movimiento registrado') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => cashApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cash'] }); queryClient.invalidateQueries({ queryKey: ['cash-summary'] }); toast.success('Movimiento eliminado') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error'),
  })

  const handleCashSave = () => {
    const newErrors: Record<string, string> = {}
    if (!form.amount || Number(form.amount) <= 0) newErrors.amount = 'Ingrese un monto válido'
    if (!form.category) newErrors.category = 'Seleccione una categoría'
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) {
      const first = Object.values(newErrors)[0]
      toast.error(first)
      return
    }
    createMutation.mutate({ type: form.type, category: form.category, amount: Number(form.amount), description: form.description })
  }

  const income = Number(summary?.income ?? 0)
  const expenses = Number(summary?.expenses ?? 0)
  const balance = Number(summary?.balance ?? 0)
  const loading = loadingCash || loadingSummary

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-3xl font-bold flex-shrink-0">Caja</h1>
        <div className="flex items-center gap-2">
          <Input placeholder="Buscar movimiento..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-64" />
          {canEditCash && <Button onClick={() => { setForm({ type: 'expense', category: '', amount: '', description: '' }); setDialogOpen(true) }}>Nuevo movimiento</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Ingresos</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">{loadingSummary ? '...' : `S/ ${income.toFixed(2)}`}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Egresos</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-600">{loadingSummary ? '...' : `S/ ${expenses.toFixed(2)}`}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Saldo</CardTitle></CardHeader>
          <CardContent><p className={`text-2xl font-bold ${balance >= 0 ? 'text-primary' : 'text-red-600'}`}>{loadingSummary ? '...' : `S/ ${balance.toFixed(2)}`}</p></CardContent>
        </Card>
      </div>

      {summary?.by_category && (
        <Card>
          <CardHeader><CardTitle className="text-base">Por categoría</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {Object.entries(summary.by_category).map(([cat, data]: [string, any]) => (
                <div key={cat} className="border rounded p-2 text-sm">
                  <p className="font-medium">{cat}</p>
                  <p className={data.total >= 0 ? 'text-green-600' : 'text-red-600'}>S/ {Number(data.total).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{data.count} movimientos</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="w-24">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingCash ? (
                <SkeletonTable columns={5} rows={3} />
              ) : (transactions?.data ?? []).length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No hay movimientos</TableCell></TableRow>
              ) : (
                (transactions?.data ?? []).map((t: any) => (
                  <TableRow key={t.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {t.type === 'income' ? 'Ingreso' : 'Egreso'}
                      </span>
                    </TableCell>
                    <TableCell>{t.category ?? '-'}</TableCell>
                    <TableCell className="font-mono">S/ {Number(t.amount).toFixed(2)}</TableCell>
                    <TableCell className="max-w-xs truncate">{t.description ?? '-'}</TableCell>
                    <TableCell>{t.created_at ? new Date(t.created_at).toLocaleDateString() : '-'}</TableCell>
                    <TableCell>{canEditCash && <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(t.id)}>Eliminar</Button>}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <MobileCardList
            items={transactions?.data ?? []}
            keyFn={(t: any) => t.id}
            renderCard={(t: any) => (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t.category ?? '-'}</span>
                  <span className={`font-mono text-sm font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === 'income' ? '+' : '-'} S/ {Number(t.amount).toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground flex justify-between">
                  <span>{t.description ?? '-'}</span>
                  <span>{t.created_at ? new Date(t.created_at).toLocaleDateString() : '-'}</span>
                </div>
                <div className="flex gap-1 pt-1">
                  {canEditCash && <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(t.id)}>Eliminar</Button>}
                </div>
              </>
            )}
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => { if (!o) setConfirmDelete(null) }}
        title="Eliminar movimiento"
        description="¿Estás seguro de eliminar este movimiento? Esta acción no se puede deshacer."
        onConfirm={() => { if (confirmDelete !== null) { deleteMutation.mutate(confirmDelete); setConfirmDelete(null) } }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
          <DialogHeader><DialogTitle>Nuevo movimiento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Ingreso</SelectItem>
                  <SelectItem value="expense">Egreso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Categoría</Label>
              <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className={errors.category ? 'border-red-500' : ''}><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                <SelectContent>
                  {form.type === 'expense' ? (
                    <>
                      <SelectItem value="insumos">Insumos</SelectItem>
                      <SelectItem value="alquiler">Alquiler</SelectItem>
                      <SelectItem value="servicios">Servicios</SelectItem>
                      <SelectItem value="salarios">Salarios</SelectItem>
                      <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                      <SelectItem value="otros">Otros</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="pago_paciente">Pago paciente</SelectItem>
                      <SelectItem value="ajuste">Ajuste</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Monto</Label>
              <Input className={errors.amount ? 'border-red-500' : ''} type="number" min={0} step={0.01} value={form.amount} onKeyDown={onlyDecimal} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Descripción</Label>
              <Input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter><Button onClick={handleCashSave}>Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
