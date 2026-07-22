import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryApi } from '@/lib/endpoints'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import MobileCardList from '@/components/app/MobileCardList'
import ConfirmDialog from '@/components/app/ConfirmDialog'
import SkeletonTable from '@/components/app/SkeletonTable'
import EmptyState from '@/components/app/EmptyState'
import { usePermission } from '@/hooks/usePermission'
import { Package, Search, Plus, ArrowDownLeft, ArrowUpRight, History, AlertTriangle } from 'lucide-react'

const CATEGORIES = [
  { value: 'insumos', label: 'Insumos' },
  { value: 'equipos', label: 'Equipos' },
  { value: 'medicamentos', label: 'Medicamentos' },
  { value: 'otros', label: 'Otros' },
]

interface ItemForm {
  name: string
  description: string
  category: string
  sku: string
  quantity: string
  min_stock: string
  unit: string
  unit_cost: string
  supplier: string
  location: string
  expiration_date: string
}

const emptyForm: ItemForm = {
  name: '',
  description: '',
  category: '',
  sku: '',
  quantity: '0',
  min_stock: '5',
  unit: '',
  unit_cost: '',
  supplier: '',
  location: '',
  expiration_date: '',
}

export default function InventoryPage() {
  const queryClient = useQueryClient()
  const { canEdit } = usePermission()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [lowStockFilter, setLowStockFilter] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [form, setForm] = useState<ItemForm>({ ...emptyForm })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [movementDialog, setMovementDialog] = useState<{ open: boolean; itemId: number | null }>({ open: false, itemId: null })
  const [movementForm, setMovementForm] = useState({ type: 'entry', quantity: '', reason: '' })

  const [historyDialog, setHistoryDialog] = useState<{ open: boolean; item: any | null }>({ open: false, item: null })

  const params = useMemo(() => {
    const p: Record<string, string> = {}
    if (search) p.search = search
    if (category) p.category = category
    if (lowStockFilter) p.low_stock = '1'
    return p
  }, [search, category, lowStockFilter])

  const { data: items, isPending: loadingItems } = useQuery({ queryKey: ['inventory', params], queryFn: () => inventoryApi.list(params) })
  const { data: lowStockItems } = useQuery({ queryKey: ['inventory-low-stock'], queryFn: () => inventoryApi.lowStock() })

  const createMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => inventoryApi.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-low-stock'] })
      setDialogOpen(false)
      toast.success('Artículo creado')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => inventoryApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-low-stock'] })
      setDialogOpen(false)
      setEditingId(null)
      toast.success('Artículo actualizado')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => inventoryApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-low-stock'] })
      toast.success('Artículo eliminado')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error'),
  })

  const movementMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => inventoryApi.movement(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-low-stock'] })
      setMovementDialog({ open: false, itemId: null })
      setMovementForm({ type: 'entry', quantity: '', reason: '' })
      toast.success('Movimiento registrado')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error'),
  })

  const data = items?.data ?? []
  const totalItems = items?.total ?? data.length
  const totalValue = data.reduce((sum: number, item: any) => sum + (Number(item.quantity) * Number(item.unit_cost ?? 0)), 0)
  const lowStockCount = lowStockItems?.length ?? 0

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!form.name.trim()) newErrors.name = 'Ingrese un nombre'
    if (!form.category) newErrors.category = 'Seleccione una categoría'
    if (!form.unit.trim()) newErrors.unit = 'Ingrese la unidad'
    if (form.quantity && Number(form.quantity) < 0) newErrors.quantity = 'Cantidad inválida'
    if (form.min_stock && Number(form.min_stock) < 0) newErrors.min_stock = 'Stock mínimo inválido'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (!validateForm()) {
      toast.error(Object.values(errors)[0] ?? 'Complete los campos requeridos')
      return
    }
    const payload: Record<string, unknown> = {
      name: form.name,
      description: form.description || null,
      category: form.category,
      sku: form.sku || null,
      quantity: Number(form.quantity || 0),
      min_stock: Number(form.min_stock || 5),
      unit: form.unit,
      unit_cost: form.unit_cost ? Number(form.unit_cost) : null,
      supplier: form.supplier || null,
      location: form.location || null,
      expiration_date: form.expiration_date || null,
    }
    if (editingId !== null) {
      updateMutation.mutate({ id: editingId, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const openCreate = () => {
    setForm({ ...emptyForm })
    setEditingId(null)
    setErrors({})
    setDialogOpen(true)
  }

  const openEdit = (item: any) => {
    setForm({
      name: item.name ?? '',
      description: item.description ?? '',
      category: item.category ?? '',
      sku: item.sku ?? '',
      quantity: String(item.quantity ?? 0),
      min_stock: String(item.min_stock ?? 5),
      unit: item.unit ?? '',
      unit_cost: item.unit_cost ? String(item.unit_cost) : '',
      supplier: item.supplier ?? '',
      location: item.location ?? '',
      expiration_date: item.expiration_date ?? '',
    })
    setEditingId(item.id)
    setErrors({})
    setDialogOpen(true)
  }

  const openMovement = (itemId: number) => {
    setMovementForm({ type: 'entry', quantity: '', reason: '' })
    setMovementDialog({ open: true, itemId })
  }

  const handleMovementSave = () => {
    if (!movementDialog.itemId) return
    if (!movementForm.quantity || Number(movementForm.quantity) <= 0) {
      toast.error('Ingrese una cantidad válida')
      return
    }
    movementMutation.mutate({
      id: movementDialog.itemId,
      data: {
        type: movementForm.type,
        quantity: Number(movementForm.quantity),
        reason: movementForm.reason || null,
      },
    })
  }

  const openHistory = async (item: any) => {
    try {
      const full = await inventoryApi.show(item.id)
      setHistoryDialog({ open: true, item: full })
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Error al cargar historial')
    }
  }

  const isLowStock = (item: any) => Number(item.quantity) <= Number(item.min_stock)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-3xl font-bold flex-shrink-0">Inventario</h1>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar artículo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64"
            icon={<Search className="w-4 h-4" />}
          />
          {canEdit('inventario') && (
            <Button onClick={openCreate} className="gap-1">
              <Plus className="w-4 h-4" /> Nuevo
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total artículos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{loadingItems ? '...' : totalItems}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Alertas stock bajo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-red-600' : ''}`}>{lowStockCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Valor total inventario</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{loadingItems ? '...' : `S/ ${totalValue.toFixed(2)}`}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas</SelectItem>
            {CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={lowStockFilter ? 'default' : 'outline'}
          size="sm"
          onClick={() => setLowStockFilter(v => !v)}
        >
          {lowStockFilter ? 'Mostrando stock bajo' : 'Solo stock bajo'}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Min. stock</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead>Costo unit.</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead className="w-32">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingItems ? (
                <SkeletonTable columns={7} rows={5} />
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <EmptyState
                      icon={<Package className="w-10 h-10 text-muted-foreground/50" />}
                      title="No hay artículos en inventario"
                      description="Cree un nuevo artículo para comenzar."
                      action={canEdit('inventario') ? <Button onClick={openCreate}>Nuevo artículo</Button> : undefined}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item: any) => (
                  <TableRow
                    key={item.id}
                    className={`hover:bg-muted/50 transition-colors ${isLowStock(item) ? 'bg-red-50' : ''}`}
                  >
                    <TableCell>
                      <div className="font-medium">{item.name}</div>
                      {item.sku && <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{CATEGORIES.find(c => c.value === item.category)?.label ?? item.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`font-semibold ${isLowStock(item) ? 'text-red-600' : ''}`}>
                        {item.quantity}
                      </span>
                      {isLowStock(item) && <AlertTriangle className="inline w-3 h-3 text-red-600 ml-1" />}
                    </TableCell>
                    <TableCell>{item.min_stock}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="font-mono">
                      {item.unit_cost ? `S/ ${Number(item.unit_cost).toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell>{item.location ?? '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        <Button variant="ghost" size="sm" onClick={() => openHistory(item)} title="Historial">
                          <History className="w-3 h-3" />
                        </Button>
                        {canEdit('inventario') && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => openMovement(item.id)} title="Registrar movimiento">
                              <ArrowDownLeft className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>Editar</Button>
                            <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(item.id)}>Eliminar</Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <MobileCardList
            items={data}
            keyFn={(item: any) => item.id}
            renderCard={(item: any) => (
              <div className={`rounded-lg border p-3 ${isLowStock(item) ? 'border-red-300 bg-red-50' : ''}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{item.name}</span>
                  <Badge variant="outline">{CATEGORIES.find(c => c.value === item.category)?.label ?? item.category}</Badge>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Cantidad: <span className={`font-semibold ${isLowStock(item) ? 'text-red-600' : ''}`}>{item.quantity}</span> {item.unit}
                  {item.sku && <> · SKU: {item.sku}</>}
                </div>
                <div className="text-sm text-muted-foreground">
                  Min: {item.min_stock} · {item.location ? item.location : 'Sin ubicación'}
                  {item.unit_cost && <> · S/ {Number(item.unit_cost).toFixed(2)}</>}
                </div>
                <div className="flex gap-1 pt-2 flex-wrap">
                  <Button variant="ghost" size="sm" onClick={() => openHistory(item)}>
                    <History className="w-3 h-3 mr-1" /> Historial
                  </Button>
                  {canEdit('inventario') && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => openMovement(item.id)}>
                        <ArrowDownLeft className="w-3 h-3 mr-1" /> Movimiento
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>Editar</Button>
                      <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(item.id)}>Eliminar</Button>
                    </>
                  )}
                </div>
              </div>
            )}
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => { if (!o) setConfirmDelete(null) }}
        title="Eliminar artículo"
        description="¿Estás seguro de eliminar este artículo? Se perderá también su historial de movimientos."
        onConfirm={() => { if (confirmDelete !== null) { deleteMutation.mutate(confirmDelete); setConfirmDelete(null) } }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId !== null ? 'Editar artículo' : 'Nuevo artículo'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <Label>Nombre *</Label>
              <Input className={errors.name ? 'border-red-500' : ''} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label>Descripción</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Categoría *</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className={errors.category ? 'border-red-500' : ''}><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>SKU</Label>
              <Input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Cantidad inicial</Label>
              <Input type="number" min={0} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Stock mínimo</Label>
              <Input type="number" min={0} value={form.min_stock} onChange={e => setForm(f => ({ ...f, min_stock: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Unidad *</Label>
              <Input className={errors.unit ? 'border-red-500' : ''} value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="caja, frasco, unidad..." />
            </div>
            <div className="space-y-1">
              <Label>Costo unitario</Label>
              <Input type="number" min={0} step={0.01} value={form.unit_cost} onChange={e => setForm(f => ({ ...f, unit_cost: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Proveedor</Label>
              <Input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Ubicación</Label>
              <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label>Fecha de vencimiento</Label>
              <Input type="date" value={form.expiration_date} onChange={e => setForm(f => ({ ...f, expiration_date: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingId !== null ? 'Actualizar' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={movementDialog.open} onOpenChange={o => setMovementDialog({ open: o, itemId: null })}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
          <DialogHeader><DialogTitle>Registrar movimiento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={movementForm.type} onValueChange={v => setMovementForm(f => ({ ...f, type: v }))} disabled={!canEdit('inventario')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entry">
                    <span className="flex items-center gap-2"><ArrowDownLeft className="w-4 h-4 text-green-600" /> Entrada</span>
                  </SelectItem>
                  <SelectItem value="exit">
                    <span className="flex items-center gap-2"><ArrowUpRight className="w-4 h-4 text-red-600" /> Salida</span>
                  </SelectItem>
                  <SelectItem value="adjustment">Ajuste</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Cantidad</Label>
              <Input type="number" min={1} value={movementForm.quantity} onChange={e => setMovementForm(f => ({ ...f, quantity: e.target.value }))} disabled={!canEdit('inventario')} />
            </div>
            <div className="space-y-1">
              <Label>Motivo / Observación</Label>
              <Input value={movementForm.reason} onChange={e => setMovementForm(f => ({ ...f, reason: e.target.value }))} disabled={!canEdit('inventario')} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMovementDialog({ open: false, itemId: null })}>Cancelar</Button>
            {canEdit('inventario') && (
              <Button onClick={handleMovementSave} disabled={movementMutation.isPending}>Guardar</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyDialog.open} onOpenChange={o => setHistoryDialog({ open: o, item: null })}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historial de movimientos</DialogTitle>
          </DialogHeader>
          {historyDialog.item ? (
            <div className="space-y-3">
              <div className="text-sm">
                <span className="font-medium">{historyDialog.item.name}</span>
                <span className="text-muted-foreground"> — Stock actual: <span className="font-semibold">{historyDialog.item.quantity}</span></span>
              </div>
              {(historyDialog.item.movements ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay movimientos registrados.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Usuario</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyDialog.item.movements.map((m: any) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-sm whitespace-nowrap">{m.created_at ? new Date(m.created_at).toLocaleDateString() : '-'}</TableCell>
                        <TableCell>
                          <Badge variant={m.type === 'entry' ? 'default' : m.type === 'exit' ? 'destructive' : 'secondary'}>
                            {m.type === 'entry' ? 'Entrada' : m.type === 'exit' ? 'Salida' : 'Ajuste'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">{m.quantity}</TableCell>
                        <TableCell className="text-sm">{m.reason ?? '-'}</TableCell>
                        <TableCell className="text-sm">{m.user?.name ?? '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
